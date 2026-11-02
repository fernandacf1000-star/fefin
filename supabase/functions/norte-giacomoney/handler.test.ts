import test from 'node:test';
import assert from 'node:assert/strict';
import {createGiacoHandler, expenseRow, validateExpense} from './handler.ts';

const expense = {id: '11111111-1111-4111-8111-111111111111', description: 'Mercado', amount: 100,
  created_at: '2026-11-03T01:00:00Z', installment_number: null, installment_total: null, installment_group_id: null};
const group = '22222222-2222-4222-8222-222222222222';
test('half the cash expense on the Sao Paulo creation date, always Pix', async () => {
  const row = await expenseRow(validateExpense(expense), 'user');
  assert.equal(row.valor, 50); assert.equal(row.data, '2026-11-02');
  assert.equal(row.forma_pagamento, 'pix'); assert.equal(row.cartao_id, null);
  assert.equal(row.is_parcelado, false);
});
test('15000 in 3 source installments produces 7500 total without dividing twice', async () => {
  const rows = await Promise.all([1,2,3].map(n => expenseRow(validateExpense({...expense,
    id: `${n}1111111-1111-4111-8111-111111111111`, amount: 5000,
    installment_total: 3, installment_number: n, installment_group_id: group}), 'user')));
  assert.deepEqual(rows.map(r => r.valor), [2500,2500,2500]);
  assert.deepEqual(rows.map(r => r.mes_referencia), ['2026-11','2026-12','2027-01']);
  assert.equal(new Set(rows.map(r => r.id)).size, 3);
  assert.equal(new Set(rows.map(r => r.parcelamento_id)).size, 1);
});
test('month end stays anchored and half-cent precision is preserved', async () => {
  const row = await expenseRow({...expense, amount: 10.01, created_at: '2026-01-31T15:00:00Z',
    installment_total: 3, installment_number: 2, installment_group_id: group}, 'user');
  assert.equal(row.data, '2026-01-31'); assert.equal(row.mes_referencia, '2026-02'); assert.equal(row.valor, 5.005);
});
test('rejects malformed money, dates, and incomplete installments', () => {
  for (const change of [{amount: -1}, {amount: '100'}, {created_at: 'oops'}, {installment_total: 3},
    {installment_total: 3, installment_number: 4, installment_group_id: group}])
    assert.throws(() => validateExpense({...expense, ...change}));
});
function setup(ask = async () => ({categories:['Alimentação'], subcategories:['Supermercado']})) {
  const saved = new Map();
  const handler = createGiacoHandler({secret: () => 'test-key', userId: 'user',
    exists: async id => saved.has(id), history: async () => [], ask,
    save: async row => {if (!saved.has(row.id)) saved.set(row.id, row);}});
  const request = (key = 'test-key') => new Request('https://test', {method: 'POST',
    headers: {'x-giacomoney-key':key}, body: JSON.stringify({expense})});
  return {saved, handler, request};
}
test('rejects missing or invalid authentication without writing', async () => {
  const s = setup(); assert.equal((await s.handler(s.request('wrong'))).status, 401); assert.equal(s.saved.size, 0);
});
test('retries and concurrent requests save only once, with complete classification', async () => {
  const s = setup();
  const results = await Promise.all([s.handler(s.request()),s.handler(s.request())]);
  assert.ok(results.every(r => r.status === 200)); assert.equal(s.saved.size, 1);
  assert.equal((await s.handler(s.request()).then(r => r.json())).duplicate, true);
  assert.equal([...s.saved.values()][0].subcategoria, 'Supermercado');
});
test('classification failure writes nothing and tells the queue to retry', async () => {
  const s = setup(async () => {throw Error('offline');});
  assert.equal((await s.handler(s.request())).status, 503); assert.equal(s.saved.size, 0);
});
