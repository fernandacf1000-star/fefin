export const CATEGORIES = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Lazer",
  "Pessoal",
  "Pais",
] as const;
export type Category = (typeof CATEGORIES)[number];
export type Entry = {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  categoria_macro: string | null;
  subcategoria: string | null;
  subcategoria_pais: string | null;
  data: string;
  mes_referencia: string;
  forma_pagamento: string | null;
  cartao_id: string | null;
  pago: boolean;
  pago_por: string;
  is_parcelado: boolean;
  parcela_atual: number | null;
  parcela_total: number | null;
  parcelamento_id: string | null;
  created_at?: string;
};
export type Card = {
  id: string;
  nome: string;
  dia_fechamento: number;
  dia_vencimento: number;
  ativo: boolean;
};
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export const isCategory = (v: unknown): v is Category =>
  CATEGORIES.includes(v as Category);
export const parentRule = (label: string) =>
  /\b(pai|pais|mae|amelia|antonio)\b/.test(normalize(label));
export const categoryOf = (
  r: Pick<Entry, "subcategoria_pais" | "categoria_macro">,
): Category | null =>
  r.subcategoria_pais
    ? "Pais"
    : isCategory(r.categoria_macro)
      ? r.categoria_macro
      : null;
export function memory(label: string, history: Entry[]): Category | null {
  if (parentRule(label)) return "Pais";
  const rows = history
    .filter((r) => normalize(r.descricao) === normalize(label))
    .sort((a, b) =>
      (b.created_at ?? b.data).localeCompare(a.created_at ?? a.data),
    );
  const seen = new Set<string>(),
    counts = new Map<Category, { count: number; rank: number }>();
  rows.forEach((r, rank) => {
    const key = r.parcelamento_id || r.id;
    if (seen.has(key)) return;
    seen.add(key);
    const cat = categoryOf(r);
    if (!cat) return;
    const item = counts.get(cat);
    counts.set(cat, {
      count: (item?.count ?? 0) + 1,
      rank: item?.rank ?? rank,
    });
  });
  return (
    [...counts].sort(
      (a, b) => b[1].count - a[1].count || a[1].rank - b[1].rank,
    )[0]?.[0] ?? null
  );
}
export const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const monthKey = (d: Date) => dateKey(d).slice(0, 7);
export const parseDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
export function addMonths(d: Date, n: number) {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
  return new Date(
    first.getFullYear(),
    first.getMonth(),
    Math.min(
      d.getDate(),
      new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(),
    ),
    12,
  );
}
export function cardDates(card: Card, today: Date) {
  const at = (month: number, day: number) =>
    new Date(
      today.getFullYear(),
      month,
      Math.min(day, new Date(today.getFullYear(), month + 1, 0).getDate()),
      12,
    );
  let closing = at(today.getMonth(), card.dia_fechamento);
  if (dateKey(closing) < dateKey(today))
    closing = at(today.getMonth() + 1, card.dia_fechamento);
  let due = at(
    closing.getMonth() + (closing.getFullYear() - today.getFullYear()) * 12,
    card.dia_vencimento,
  );
  if (due <= closing)
    due = at(
      closing.getMonth() +
        (closing.getFullYear() - today.getFullYear()) * 12 +
        1,
      card.dia_vencimento,
    );
  const days = Math.round(
    (Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );
  const reference = monthKey(
    card.dia_vencimento < card.dia_fechamento ? addMonths(closing, 1) : closing,
  );
  return { closing, due, days, reference };
}
export const effectiveDate = (r: Entry) =>
  addMonths(
    parseDate(r.data),
    r.is_parcelado ? Math.max(0, (r.parcela_atual ?? 1) - 1) : 0,
  );
export const countsAsSpending = (r: Entry) =>
  r.tipo === "despesa" &&
  !r.subcategoria_pais &&
  r.categoria_macro !== "Aportes" &&
  r.categoria !== "salario";
// Sum the stored decimal precision first, then round each monthly total to cents.
// Historical shared expenses include half-cent amounts; rounding each row changes totals.
export function sumMoney(values: number[]): number {
  const parts = values.map((value) =>
    Number(value)
      .toLocaleString("en-US", {
        useGrouping: false,
        maximumFractionDigits: 20,
      })
      .split("."),
  );
  const precision = Math.max(
    0,
    ...parts.map(([, fraction = ""]) => fraction.length),
  );
  const scale = 10n ** BigInt(precision);
  const total = parts.reduce((sum, [whole, fraction = ""]) => {
    const negative = whole.startsWith("-");
    const amount =
      BigInt(whole.replace("-", "")) * scale +
      BigInt(fraction.padEnd(precision, "0") || "0");
    return sum + (negative ? -amount : amount);
  }, 0n);
  const absolute = total < 0n ? -total : total;
  const cents = (absolute * 100n + scale / 2n) / scale;
  return Number(total < 0n ? -cents : cents) / 100;
}
export const countsAsIncome = (r: Entry) =>
  (r.tipo === "receita" || r.categoria === "salario") &&
  r.categoria !== "reembolso_pais";
export function monthIncome(rows: Entry[], today: Date) {
  return sumMoney(
    rows
      .filter(
        (r) => countsAsIncome(r) && r.data.slice(0, 7) === monthKey(today),
      )
      .map((r) => Number(r.valor)),
  );
}
export function monthSpending(rows: Entry[], today: Date) {
  return sumMoney(
    rows
      .filter(
        (r) =>
          countsAsSpending(r) && monthKey(effectiveDate(r)) === monthKey(today),
      )
      .map((r) => Number(r.valor)),
  );
}
export function monthSummary(rows: Entry[], today: Date) {
  const income = monthIncome(rows, today);
  const spent = monthSpending(rows, today);
  const balance = (Math.round(income * 100) - Math.round(spent * 100)) / 100;
  const daysLeft =
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() -
    today.getDate() +
    1;
  return {
    income,
    spent,
    balance,
    daysLeft,
    daily: balance / daysLeft,
    weekly: Math.max(0, (balance / daysLeft) * 7),
    progress:
      income > 0
        ? Math.min(100, Math.max(0, (spent / income) * 100))
        : spent > 0
          ? 100
          : 0,
  };
}
export function categoryPatch(cat: Category, old: Entry) {
  return {
    categoria_macro:
      cat === "Pais"
        ? old.categoria_macro === "Pais"
          ? null
          : old.categoria_macro
        : cat,
    subcategoria_pais: cat === "Pais" ? "Pais" : null,
    subcategoria: cat === "Pais" ? old.subcategoria : null,
  };
}

export function knownMacro(label: string, history: Entry[]): string | null {
  return (
    history
      .filter(
        (r) =>
          normalize(r.descricao) === normalize(label) &&
          isCategory(r.categoria_macro) &&
          r.categoria_macro !== "Pais",
      )
      .sort((a, b) =>
        (b.created_at ?? b.data).localeCompare(a.created_at ?? a.data),
      )[0]?.categoria_macro ?? null
  );
}

export function parseMoney(value: string): number {
  const text = value.trim().replace(/\s/g, "");
  if (!text) return NaN;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN;
}
