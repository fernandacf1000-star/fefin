import { describe, it, expect, vi } from 'vitest';
import { createSmsHandler } from '../supabase/functions/norte-sms-lancamento/handler.ts';
import { createHandler } from '../supabase/functions/norte-ai/handler.ts';
import { dateKey, entryDate, monthEntries, monthSummary, type Entry } from './domain';
import { SMS_CARDS } from '../supabase/functions/_shared/sms.ts';

const text = 'Compra aprovada no PERSONNALITE THE ONE final 1234 - SACOLAO PERDIZES valor R$ 85,00 em 25/10/2026';
const now = () => new Date('2026-10-25T12:00:00Z');
const request = (body: Record<string, unknown>, key = 'secret') => new Request('https://sms.test', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-sms-key': key }, body: JSON.stringify({ text, ...body }),
});
const entry = (extra = {}) => ({ id: 'a', user_id: 'u', descricao: 'SACOLAO PERDIZES', tipo: 'despesa', categoria_macro: 'Alimentação',
  subcategoria: 'Supermercado', subcategoria_pais: null, data: '2026-10-24', created_at: '2026-10-24T12:00:00Z', ...extra } as Entry);
function setup(history: Entry[] = []) {
  const deps = { secret: () => 'secret', userId: 'u', now, history: vi.fn().mockResolvedValue(history), save: vi.fn().mockResolvedValue(undefined),
    card: vi.fn().mockResolvedValue(SMS_CARDS.master), saveCredit: vi.fn().mockResolvedValue(true),
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

describe('Crédito de fatura por SMS', () => {
  const creditText = 'O credito de     8,99 na fatura do Personnalite The One e referente a compra de 10/04/2026 em Pg *ifc Malwee Malwee Sao Paulo Bra     .';
  it('usa a data do SMS em São Paulo e contabiliza somente no mês da fatura', async () => {
    const { deps, handler } = setup();
    const response = await handler(request({ text: creditText, notified_at: '2026-11-23T01:00:00Z' }));
    expect(response.status).toBe(200);
    expect(deps.card).toHaveBeenCalledWith(SMS_CARDS.master.id);
    expect(deps.history).not.toHaveBeenCalled();
    expect(deps.ask).not.toHaveBeenCalled();
    expect(deps.save).not.toHaveBeenCalled();
    const row = deps.saveCredit.mock.calls[0][0] as Entry;
    expect(row).toMatchObject({
      tipo: 'receita', categoria: 'credito_fatura', valor: 8.99, data: '2026-11-22',
      mes_referencia: '2026-12', cartao_id: SMS_CARDS.master.id, forma_pagamento: 'credito',
    });
    expect(dateKey(entryDate(row))).toBe('2026-11-22');
    expect(monthEntries([row], new Date(2026, 10, 1))).toEqual([]);
    expect(monthEntries([row], new Date(2026, 11, 1))).toEqual([row]);
    expect(monthSummary([row], new Date(2026, 10, 1)).income).toBe(0);
    expect(monthSummary([row], new Date(2026, 11, 1))).toMatchObject({ income: 8.99, spent: 0, balance: 8.99 });
  });
  it('mantém a mesma chave no reenvio e usa a fatura seguinte após o fechamento', async () => {
    const { deps, handler } = setup();
    deps.saveCredit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await handler(request({ text: creditText, notified_at: '2026-11-23T17:08:00-03:00' }));
    const retry = await handler(request({ text: creditText, notified_at: '2026-11-23T20:08:00Z' }));
    expect(await retry.json()).toEqual({ ok: true, duplicate: true });
    expect(deps.saveCredit.mock.calls[0][0]).toEqual(deps.saveCredit.mock.calls[1][0]);
    expect(deps.saveCredit.mock.calls[0][0].mes_referencia).toBe('2027-01');
  });
  it('aceita o atalho existente com apenas o texto e simula sem gravar', async () => {
    const { deps, handler } = setup();
    const result = await (await handler(request({ text: creditText, dry_run: true }))).json();
    expect(result.rows[0]).toMatchObject({ data: '2026-10-25', mes_referencia: '2026-12' });
    expect(deps.saveCredit).not.toHaveBeenCalled();
  });
});
