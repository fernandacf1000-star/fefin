import { completeClassifications } from '../_shared/classification.ts';
import { subcategoryCategory, parseDate, addMonths, monthKey } from '../_shared/norte.ts';
import type { Entry } from '../_shared/norte.ts';

type Expense = { id: string; description: string; amount: number; created_at: string;
  installment_number: number | null; installment_total: number | null; installment_group_id: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Stable, namespaced IDs make retries and concurrent deliveries idempotent.
export async function sourceId(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('norte:giacomoney:' + value))).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function validateExpense(value: unknown): Expense {
  const e = value as Expense;
  if (!e || !uuid.test(e.id) || typeof e.description !== 'string' || !e.description.trim() || e.description.length > 1000 ||
    typeof e.amount !== 'number' || !Number.isFinite(e.amount) || e.amount <= 0 || e.amount > 1e9 ||
    typeof e.created_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(e.created_at) || !Number.isFinite(Date.parse(e.created_at))) throw Error('invalid_expense');
  if (e.installment_total != null && e.installment_total !== 1) {
    if (!Number.isInteger(e.installment_total) || e.installment_total < 2 || e.installment_total > 360 ||
      !Number.isInteger(e.installment_number) || e.installment_number! < 1 || e.installment_number! > e.installment_total ||
      !uuid.test(e.installment_group_id ?? '')) throw Error('invalid_installments');
  } else if ((e.installment_number != null && e.installment_number !== 1) || e.installment_group_id) throw Error('invalid_installments');
  return e;
}
export async function expenseRow(e: Expense, userId: string) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(e.created_at));
  const total = e.installment_total ?? 1;
  return { id: await sourceId(e.id), user_id: userId, descricao: e.description.trim(),
    // Each GiacoMoney row already contains ONE installment. Do not divide by the count again.
    // Preserve half cents, as existing Norte shared-expense totals do.
    valor: e.amount / 2, tipo: 'despesa', categoria: 'despesa', data: date,
    mes_referencia: monthKey(addMonths(parseDate(date), total > 1 ? e.installment_number! - 1 : 0)),
    forma_pagamento: 'pix', cartao_id: null, pago: true, pago_por: 'voce',
    is_parcelado: total > 1, parcela_atual: total > 1 ? e.installment_number : null,
    parcela_total: total > 1 ? total : null,
    parcelamento_id: total > 1 ? await sourceId('group:' + e.installment_group_id) : null,
    created_at: e.created_at };
}
type Dependencies = { secret: () => string | undefined; userId: string;
  exists: (id: string) => Promise<boolean>; history: () => Promise<Entry[]>;
  save: (row: Record<string, unknown>) => Promise<void>;
  ask: (body: Record<string, unknown>) => Promise<any> };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
export function createGiacoHandler(deps: Dependencies) {
  return async (req: Request) => {
    if (req.method !== 'POST') return json({error: 'use POST'}, 405);
    const secret = deps.secret();
    if (!secret || req.headers.get('x-giacomoney-key') !== secret) return json({error: 'unauthorized'}, 401);
    let e: Expense;
    try { e = validateExpense((await req.json()).expense); } catch { return json({error: 'invalid_expense'}, 400); }
    try {
      const row = await expenseRow(e, deps.userId);
      if (await deps.exists(row.id)) return json({ok: true, duplicate: true});
      const [classified] = await completeClassifications([{label: row.descricao, amount: row.valor, kind: 'despesa', category: null, subcategory: null}], await deps.history(), deps.ask);
      await deps.save({...row,
        categoria_macro: classified.category === 'Pais' ? subcategoryCategory(classified.subcategory!) : classified.category,
        subcategoria: classified.subcategory, subcategoria_pais: classified.category === 'Pais' ? 'Pais' : null});
      return json({ok: true, id: row.id});
    } catch { return json({error: 'integration_pending_retry'}, 503); }
  };
}
