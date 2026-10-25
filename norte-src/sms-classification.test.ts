import { describe, it, expect, vi } from 'vitest';
import { createSmsHandler } from '../supabase/functions/norte-sms-lancamento/handler.ts';
import { createHandler } from '../supabase/functions/norte-ai/handler.ts';
import type { Entry } from './domain';

const text = 'Compra aprovada no PERSONNALITE THE ONE final 1234 - SACOLAO PERDIZES valor R$ 85,00 em 25/10/2026';
const now = () => new Date('2026-10-25T12:00:00Z');
const request = (body: Record<string, unknown>, key = 'secret') => new Request('https://sms.test', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-sms-key': key }, body: JSON.stringify({ text, ...body }),
});
const entry = (extra = {}) => ({ id: 'a', user_id: 'u', descricao: 'SACOLAO PERDIZES', tipo: 'despesa', categoria_macro: 'Alimentação',
  subcategoria: 'Supermercado', subcategoria_pais: null, data: '2026-10-24', created_at: '2026-10-24T12:00:00Z', ...extra } as Entry);
function setup(history: Entry[] = []) {
  const deps = { secret: () => 'secret', userId: 'u', now, history: vi.fn().mockResolvedValue(history), save: vi.fn().mockResolvedValue(undefined),
    ask: vi.fn().mockResolvedValue({ categories: ['Alimentação'], subcategories: ['Supermercado'] }) };
  return { deps, handler: createSmsHandler(deps) };
}
describe('SMS usa a mesma classificação obrigatória do app', () => {
  it('classifica antes do insert, devolvendo o par salvo', async () => {
    const { deps, handler } = setup();
    deps.save.mockImplementation(async (rows) => {
      expect(deps.ask).toHaveBeenCalledTimes(1);
      expect(rows[0]).toMatchObject({ categoria_macro: 'Alimentação', subcategoria: 'Supermercado', user_id: 'u' });
    });
    expect(await (await handler(request({}))).json()).toMatchObject({ ok: true, subcategoria: 'Supermercado' });
  });
  it('histórico completo evita a chamada à IA', async () => {
    const { deps, handler } = setup([entry()]);
    expect((await handler(request({}))).status).toBe(200);
    expect(deps.ask).not.toHaveBeenCalled();
    expect(deps.save.mock.calls[0][0][0].subcategoria).toBe('Supermercado');
  });
  it.each([null, 'Inventada', 'Farmácia'])('não salva quando a IA devolve %s', async (sub) => {
    const { deps, handler } = setup();
    deps.ask.mockResolvedValue({ categories: ['Alimentação'], subcategories: [sub] });
    expect((await handler(request({}))).status).toBe(503);
    expect(deps.save).not.toHaveBeenCalled();
  });
  it('falha do provedor não deixa registro órfão', async () => {
    const { deps, handler } = setup();
    deps.ask.mockRejectedValue(new Error('timeout'));
    expect((await handler(request({}))).status).toBe(503);
    expect(deps.save).not.toHaveBeenCalled();
  });
  it('dry_run executa classificação e preserva o banco', async () => {
    const { deps, handler } = setup();
    const response = await (await handler(request({ dry_run: true }))).json();
    expect(response.rows[0].subcategoria).toBe('Supermercado');
    expect(deps.ask).toHaveBeenCalledTimes(1);
    expect(deps.save).not.toHaveBeenCalled();
  });
  it('preserva Pais e replica a classificação em todas as parcelas', async () => {
    const { deps, handler } = setup([entry()]);
    const parentText = 'Compra aprovada no PERSONNALITE THE ONE p/ AMELIA - SACOLAO PERDIZES valor R$ 90,00 em 3x em 25/10/2026';
    expect((await handler(request({ text: parentText }))).status).toBe(200);
    const rows = deps.save.mock.calls[0][0];
    expect(rows).toHaveLength(3);
    expect(rows.every((r: Entry) => r.subcategoria_pais === 'Pais' && r.categoria_macro === 'Alimentação' && r.subcategoria === 'Supermercado')).toBe(true);
  });
  it('recusa chave inválida antes de acessar dados e IA', async () => {
    const { deps, handler } = setup();
    expect((await handler(request({}, 'wrong'))).status).toBe(401);
    expect(deps.history).not.toHaveBeenCalled();
    expect(deps.ask).not.toHaveBeenCalled();
  });
  it('resposta da IA com bloco JSON funciona no caminho completo do SMS', async () => {
    const { deps } = setup();
    const ai = createHandler({ authenticate: async () => true, env: () => 'test', log: () => {},
      fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: '```json\n{"categories":["Alimentação"],"subcategories":["Supermercado"]}\n```' }] }))) });
    deps.ask.mockImplementation(async (body) => {
      const response = await ai(new Request('https://ai.test', { method: 'POST', headers: { Authorization: 'Bearer internal', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
      if (!response.ok) throw new Error('failed');
      return response.json();
    });
    expect((await createSmsHandler(deps)(request({}))).status).toBe(200);
    expect(deps.save.mock.calls[0][0][0].subcategoria).toBe('Supermercado');
  });
});
