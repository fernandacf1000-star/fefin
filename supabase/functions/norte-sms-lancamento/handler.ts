import { completeClassifications } from '../_shared/classification.ts';
import { cardDates, INVOICE_CREDIT_CATEGORY, parseDate, subcategoryCategory } from '../_shared/norte.ts';
import type { Card, Entry } from '../_shared/norte.ts';
import { notificationDate, notificationId, saoPauloDate } from '../_shared/notification.ts';
import { parseInvoiceCreditSms, parseSms, smsRows } from '../_shared/sms.ts';

type Dependencies = {
  secret: () => string | undefined;
  userId: string;
  history: () => Promise<Entry[]>;
  save: (rows: Record<string, unknown>[]) => Promise<void>;
  card: (id: string) => Promise<Card>;
  saveCredit: (row: Record<string, unknown>) => Promise<boolean>;
  ask: (body: Record<string, unknown>) => Promise<any>;
  now?: () => Date;
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export function createSmsHandler(deps: Dependencies) {
  return async (req: Request) => {
    if (req.method !== 'POST') return json({ error: 'use POST' }, 405);
    const secret = deps.secret();
    if (!secret || req.headers.get('x-sms-key') !== secret) return json({ error: 'unauthorized' }, 401);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.text !== 'string') return json({ error: 'Envie o texto do SMS.' }, 400);
    const now = deps.now?.() ?? new Date();
    const credit = parseInvoiceCreditSms(body.text);
    if (credit) {
      const received = body.notified_at == null ? now : notificationDate(body.notified_at);
      if (!received) return json({ error: 'Envie a data do SMS em ISO 8601 com fuso horário.' }, 422);
      const data = saoPauloDate.format(received);
      try {
        const card = await deps.card(credit.card.id);
        const row = {
          id: await notificationId(['norte-sms-credit', deps.userId,
            body.notified_at == null ? data : received.toISOString(), credit.text]),
          user_id: deps.userId,
          descricao: `Crédito na fatura · ${credit.merchant}`,
          valor: credit.cents / 100,
          tipo: 'receita',
          categoria: INVOICE_CREDIT_CATEGORY,
          data,
          mes_referencia: cardDates(card, parseDate(data)).reference,
          forma_pagamento: 'credito',
          cartao_id: card.id,
          pago: true,
        };
        if (body.dry_run) return json({ ok: true, dry_run: true, rows: [row] });
        const inserted = await deps.saveCredit(row);
        return json(inserted
          ? { ok: true, inserted: 1, descricao: row.descricao, valor: row.valor, data, mes_referencia: row.mes_referencia }
          : { ok: true, duplicate: true });
      } catch {
        return json({ ok: false, error: 'Não consegui lançar o crédito. Reenvie o SMS com a data original.' }, 503);
      }
    }
    try {
      const purchase = parseSms(body.text, now);
      if (!purchase) return json({ ok: false, ignored: true });
      const history = await deps.history();
      const rawRows = smsRows(purchase, deps.userId, null, purchase.installments > 1 ? crypto.randomUUID() : null);
      const since = new Date(now.getTime() - 600000).toISOString();
      const duplicate = history.some((row) => row.tipo === 'despesa' && row.created_at && row.created_at >= since &&
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
