import {
  Card,
  cardDates,
  addMonths,
  monthKey,
  pad,
  parentRule,
} from "./norte.ts";
export const SMS_CARDS: Record<string, Card> = {
  master: {
    id: "86e2aca7-ac75-4dfc-93bc-8036d8a6eddf",
    nome: "Master",
    dia_fechamento: 22,
    dia_vencimento: 1,
    ativo: true,
  },
  visa: {
    id: "749d8b20-7c2c-48a9-9601-dd7035c33cd5",
    nome: "Visa",
    dia_fechamento: 10,
    dia_vencimento: 17,
    ativo: true,
  },
};
export function parseSms(text: string, now: Date) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (!/compra aprovada/i.test(t)) return null;
  const money = t.match(/R[S$]\s*([\d.]+,\d{2})/i),
    date = t.match(/(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
  if (!money || !date) return null;
  const amount = Number(money[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const installments = Number(t.match(/\bem (\d{1,2})x\b/i)?.[1] ?? 1);
  if (installments < 1 || installments > 99) return null;
  const day = Number(date[1]),
    month = Number(date[2]);
  let year = Number(date[3] ?? now.getFullYear());
  if (
    !date[3] &&
    new Date(year, month - 1, day) > new Date(now.getTime() + 86400000)
  )
    year--;
  const purchase = new Date(year, month - 1, day, 12);
  if (purchase.getMonth() !== month - 1 || purchase.getDate() !== day)
    return null;
  const parents = t.match(/PERSONNALITE THE ONE p\/\s*(.+?)\s+valor/i),
    master = t.match(/PERSONNALITE THE ONE final \d{4}\s*-\s*(.+?)\s+valor/i);
  let merchant: string | null = null,
    card = "visa",
    pais = false;
  if (parents) {
    card = "master";
    pais = true;
    const parts = parents[1].split(/\s+-\s+/);
    merchant = parts.length > 1 ? parts.slice(1).join(" - ") : null;
  } else if (master) {
    card = "master";
    merchant = master[1];
  } else
    merchant =
      t.match(/(?:em \d{1,2}x )?em ([^,]+),\s*\d{2}\/\d{2}/i)?.[1] ?? null;
  if (!merchant) return null;
  merchant = merchant.trim();
  return {
    merchant,
    amount,
    installments,
    card: SMS_CARDS[card],
    pais: pais || parentRule(merchant),
    purchase,
    date: `${year}-${pad(month)}-${pad(day)}`,
  };
}
export function smsRows(
  p: NonNullable<ReturnType<typeof parseSms>>,
  uid: string,
  cat: string | null,
  group: string | null,
) {
  const cents = Math.round(p.amount * 100),
    base = Math.floor(cents / p.installments),
    ref = cardDates(p.card, p.purchase).reference;
  return Array.from({ length: p.installments }, (_, i) => ({
    user_id: uid,
    descricao: p.merchant,
    valor:
      (i === p.installments - 1 ? cents - base * (p.installments - 1) : base) /
      100,
    tipo: "despesa",
    categoria: "despesa",
    categoria_macro: cat === "Pais" ? null : cat,
    subcategoria: null,
    subcategoria_pais: p.pais || cat === "Pais" ? "Pais" : null,
    data: p.date,
    mes_referencia: monthKey(
      addMonths(
        new Date(Number(ref.slice(0, 4)), Number(ref.slice(5)) - 1, 1, 12),
        i,
      ),
    ),
    forma_pagamento: "credito",
    cartao_id: p.card.id,
    pago: false,
    pago_por: "voce",
    is_parcelado: p.installments > 1,
    parcela_atual: p.installments > 1 ? i + 1 : null,
    parcela_total: p.installments > 1 ? p.installments : null,
    parcelamento_id: group,
  }));
}
