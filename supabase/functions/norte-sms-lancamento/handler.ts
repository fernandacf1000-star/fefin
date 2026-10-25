import { completeClassifications } from '../_shared/classification.ts';
import { subcategoryCategory } from '../_shared/norte.ts';
import type { Entry } from '../_shared/norte.ts';
import { parseSms, smsRows } from '../_shared/sms.ts';

type Dependencies = {
  secret: () => string | undefined;
  userId: string;
  history: () => Promise<Entry[]>;
  save: (rows: Record<string, unknown>[]) => Promise<void>;
  ask: (body: Record<string, unknown>) => Promise<any>;
  now?: () => Date;
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export function createSmsHandler(deps: Dependencies) {
  return async (req: Request) => {
    if (req.method !== 'POST') return json({ error: 'use POST' }, 405);
    const secret = deps.secret();
    if (!secret || req.headers.get('x-sms-key') !== secret) return json({ error: 'unauthorized' }, 401);
    try {
      const body = await req.json();
      const now = deps.now?.() ?? new Date();
      const purchase = parseSms(String(body.text ?? ''), now);
      if (!purchase) return json({ ok: false, ignored: true });
      const history = await deps.history();
      const rawRows = smsRows(purchase, deps.userId, null, purchase.installments > 1 ? crypto.randomUUID() : null);
      const since = new Date(now.getTime() - 600000).toISOString();
      const duplicate = history.some((row) => row.created_at && row.created_at >= since &&
        row.descricao === purchase.merchant && row.data === purchase.date && row.cartao_id === purchase.card.id &&
        Number(row.valor) === rawRows[0].valor && (row.parcela_total ?? 1) === purchase.installments);
      if (duplicate && !body.dry_run) return json({ ok: true, duplicate: true });
      const [classified] = await completeClassifications([{
        label: purchase.merchant, amount: purchase.amount, kind: 'despesa',
        category: purchase.pais ? 'Pais' : null, subcategory: null,
      }], history, deps.ask);
      const rows = rawRows.map((row) => ({ ...row,
        categoria_macro: classified.category === 'Pais' ? subcategoryCategory(classified.subcategory!) : classified.category,
        subcategoria: classified.subcategory,
        subcategoria_pais: classified.category === 'Pais' ? 'Pais' : null,
      }));
      // No database write occurs until every row has a valid complete pair.
      if (body.dry_run) return json({ ok: true, dry_run: true, rows });
      await deps.save(rows);
      return json({ ok: true, inserted: rows.length, descricao: purchase.merchant, valor: purchase.amount,
        categoria_macro: rows[0].categoria_macro, subcategoria: classified.subcategory, pais: classified.category === 'Pais' });
    } catch {
      return json({ ok: false, error: 'Não consegui classificar o SMS. Nenhum lançamento foi salvo; tente novamente.' }, 503);
    }
  };
}
