import { describe, it, expect, vi } from 'vitest';
import { completeClassifications, historicalClassification } from './classification';
import { createHandler } from '../supabase/functions/norte-ai/handler';
import type { Entry } from './domain';

const row = (extra: Partial<Entry>): Entry => ({ id: 'a', descricao: 'Mercado', tipo: 'despesa', categoria_macro: 'Alimentação', subcategoria: 'Supermercado', data: '2026-10-23', ...extra } as Entry);
const draft = (extra = {}) => ({ label: 'Mercado', amount: 40, kind: 'despesa' as const, category: null, subcategory: null, ...extra });

describe('classificação completa antes de salvar', () => {
  it('reutiliza o par histórico mesmo se a IA sugeriu outro par válido', async () => {
    const ask = vi.fn();
    const result = await completeClassifications([draft({ category: 'Lazer', subcategory: 'Viagens' })], [row({})], ask);
    expect(result[0]).toMatchObject({ category: 'Alimentação', subcategory: 'Supermercado' });
    expect(ask).not.toHaveBeenCalled();
  });
  it('não mistura receitas com despesas nem conta cada parcela como um voto', () => {
    const history = [row({ tipo: 'receita', categoria_macro: 'Pessoal', subcategoria: 'Roupas' }),
      ...Array.from({ length: 12 }, (_, i) => row({ id: `p${i}`, parcelamento_id: 'p', categoria_macro: 'Lazer', subcategoria: 'Viagens' })),
      row({ id: 'x' }), row({ id: 'y' })];
    expect(historicalClassification('MERCÁDO!', 'despesa', history)).toEqual({ category: 'Alimentação', subcategory: 'Supermercado' });
  });
  it('completa uma categoria histórica sem subcategoria usando a IA', async () => {
    const ask = vi.fn().mockResolvedValue({ categories: ['Alimentação'], subcategories: ['Supermercado'] });
    const result = await completeClassifications([draft()], [row({ subcategoria: null })], ask);
    expect(ask.mock.calls[0][0].items[0].category).toBe('Alimentação');
    expect(result[0].subcategory).toBe('Supermercado');
  });
  it.each([null, '', 'Categoria inventada', 'Farmácia'])('recusa subcategoria inválida %s', async (subcategory) => {
    const ask = vi.fn().mockResolvedValue({ categories: ['Alimentação'], subcategories: [subcategory] });
    await expect(completeClassifications([draft()], [], ask)).rejects.toThrow('nada foi salvo');
  });
  it('respeita correção manual e preserva Pais com a natureza da despesa', async () => {
    const ask = vi.fn();
    const result = await completeClassifications([draft({ edited: true, category: 'Pessoal', subcategory: 'Roupas' }), draft({ label: 'Mercado dos Pais', category: 'Pais', subcategory: 'Supermercado' })], [row({})], ask);
    expect(result.map((r) => r.category)).toEqual(['Pessoal', 'Pais']);
    expect(ask).not.toHaveBeenCalled();
  });
  it('não deixa receitas sem subcategoria', async () => {
    const ask = vi.fn().mockResolvedValue({ categories: ['Pessoal'], subcategories: ['Roupas'] });
    const result = await completeClassifications([draft({ kind: 'receita', label: 'Venda de roupa' })], [], ask);
    expect(result[0].subcategory).toBe('Roupas');
  });
});

describe('validação da função de IA', () => {
  const invoke = async (output: unknown, body: Record<string, unknown>) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(output) }] })));
    const handler = createHandler({ authenticate: async () => true, env: () => 'test', fetch: fetcher, log: () => {} });
    const response = await handler(new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    return { response, system: JSON.parse(fetcher.mock.calls[0][1].body).system };
  };
  it.each([null, 'Inventada', 'Farmácia'])('não devolve sucesso para par inválido %s', async (subcategory) => {
    const { response } = await invoke({ categories: ['Alimentação'], subcategories: [subcategory] }, { task: 'classify', kind: 'despesa', items: [{ label: 'Mercado', amount: 40 }] });
    expect(response.status).toBe(503);
  });
  it('envia o mapa de pares e valida receita completa', async () => {
    const { response, system } = await invoke({ items: [{ kind: 'receita', label: 'Venda roupas', amount: 80, category: 'Pessoal', subcategory: 'Roupas', dayOffset: 0 }] }, { task: 'parse', text: 'Recebi 80 da venda de roupas' });
    expect(response.status).toBe(200);
    expect((await response.json()).items[0].subcategory).toBe('Roupas');
    expect(system).toContain('"Alimentação":["Supermercado","Restaurantes","Delivery"]');
  });
});
