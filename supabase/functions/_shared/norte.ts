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
  const reference = monthKey(due);
  return { closing, due, days, reference };
}
export function bestCard(cards: Card[], today: Date) {
  return cards.filter((card) => card.ativo)
    .map((card) => ({ ...card, ...cardDates(card, today) }))
    .sort((a, b) => b.days - a.days || a.nome.localeCompare(b.nome))[0] ?? null;
}
export const effectiveDate = (r: Entry) => {
  // Each credit installment already stores its own invoice month; never shift it twice.
  if ((r.forma_pagamento === "credito" || r.cartao_id) && /^\d{4}-(0[1-9]|1[0-2])$/.test(r.mes_referencia)) {
    const purchase = parseDate(r.data);
    const invoice = parseDate(r.mes_referencia + "-01");
    return new Date(invoice.getFullYear(), invoice.getMonth(), Math.min(purchase.getDate(), new Date(invoice.getFullYear(), invoice.getMonth() + 1, 0).getDate()), 12);
  }
  return addMonths(parseDate(r.data), r.is_parcelado ? Math.max(0, (r.parcela_atual ?? 1) - 1) : 0);
};
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
    ...(old.tipo === "receita" ? {
      categoria: cat === "Pais" ? "reembolso_pais"
        : old.categoria === "reembolso_pais" ? "receita" : old.categoria,
    } : {}),
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

export type EntryFilter = "Todos" | "Gastos" | "Receitas" | "Pais";
export function navigateMonth(selected: Date, step: number, now: Date): Date {
  const origin = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const offset =
    (selected.getFullYear() - origin.getFullYear()) * 12 +
    selected.getMonth() -
    origin.getMonth() +
    step;
  return addMonths(origin, Math.max(-24, Math.min(24, offset)));
}
export const entryDate = (r: Entry) =>
  r.tipo === "receita" || r.categoria === "salario"
    ? parseDate(r.data)
    : effectiveDate(r);
export function monthEntries(rows: Entry[], selected: Date) {
  return rows
    .filter((r) => monthKey(entryDate(r)) === monthKey(selected))
    .sort(
      (a, b) =>
        dateKey(entryDate(b)).localeCompare(dateKey(entryDate(a))) ||
        (b.created_at ?? "").localeCompare(a.created_at ?? "") ||
        b.id.localeCompare(a.id),
    );
}
export function filterEntries(rows: Entry[], filter: EntryFilter) {
  return rows.filter(
    (r) =>
      filter === "Todos" ||
      (filter === "Pais"
        ? !!r.subcategoria_pais
        : filter === "Receitas"
          ? countsAsIncome(r)
          : countsAsSpending(r)),
  );
}
export function groupEntriesByDay(rows: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const row of [...rows].sort(
    (a, b) =>
      dateKey(entryDate(b)).localeCompare(dateKey(entryDate(a))) ||
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  )) {
    const key = dateKey(entryDate(row));
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups].map(([date, entries]) => ({ date, entries }));
}
export function monthPeriod(selected: Date, now: Date) {
  return monthKey(selected) === monthKey(now)
    ? "current"
    : monthKey(selected) < monthKey(now)
      ? "past"
      : "future";
}
export function monthPresentation(rows: Entry[], selected: Date, now: Date) {
  const totals = monthSummary(rows, selected);
  const period = monthPeriod(selected, now);
  const over = totals.balance < 0;
  const monthName = selected.toLocaleDateString("pt-BR", { month: "long" });
  const label =
    period === "future"
      ? "Previsto"
      : period === "past"
        ? over
          ? `Estourou em ${monthName}`
          : "Sobrou"
        : over
          ? "Orçamento estourado em"
          : "Falta gastar";
  return {
    ...totals,
    period,
    over,
    label,
    displayAmount:
      period === "future" ? totals.balance : Math.abs(totals.balance),
  };
}
export const SPENDING_CATEGORIES = CATEGORIES.filter(
  (c): c is Exclude<Category, "Pais"> => c !== "Pais",
);
export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];
export function categoryChartData(rows: Entry[], selected: Date) {
  const expenses = monthEntries(rows, selected).filter(countsAsSpending);
  const spent = monthSpending(rows, selected);
  const categories = SPENDING_CATEGORIES.map((category) => {
    const amount = sumMoney(
      expenses
        .filter((r) => categoryOf(r) === category)
        .map((r) => Number(r.valor)),
    );
    return {
      category,
      amount,
      percent: spent > 0 ? (amount / spent) * 100 : 0,
    };
  }).sort(
    (a, b) =>
      b.amount - a.amount || a.category.localeCompare(b.category, "pt-BR"),
  );
  const unclassified = sumMoney(
    expenses
      .filter(
        (r) => !SPENDING_CATEGORIES.includes(categoryOf(r) as SpendingCategory),
      )
      .map((r) => Number(r.valor)),
  );
  return { categories, spent, unclassified };
}
export function sixMonthChartData(rows: Entry[], selected: Date) {
  const start = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
  return Array.from({ length: 6 }, (_, i) => {
    const date = addMonths(start, i - 5);
    const totals = monthSummary(rows, date);
    return {
      month: monthKey(date),
      label: date
        .toLocaleDateString("pt-BR", { month: "short" })
        .replaceAll(".", ""),
      income: totals.income,
      spent: totals.spent,
      selected: i === 5,
    };
  });
}
