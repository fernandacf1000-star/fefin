import { describe, it, expect } from "vitest";
import {
  cardDates,
  dateKey,
  monthSpending,
  monthIncome,
  monthSummary,
  navigateMonth,
  monthEntries,
  filterEntries,
  groupEntriesByDay,
  monthPresentation,
  categoryChartData,
  sixMonthChartData,
  memory,
  categoryPatch,
  parentRule,
  Entry,
} from "./domain";
import {
  parseSms,
  smsRows,
  SMS_CARDS,
} from "../supabase/functions/_shared/sms.ts";
const entry = (overrides: Partial<Entry> = {}): Entry => ({
  id: "a",
  user_id: "u",
  descricao: "Mercado",
  valor: 100,
  tipo: "despesa",
  categoria: "despesa",
  categoria_macro: "Alimentação",
  subcategoria: null,
  subcategoria_pais: null,
  data: "2026-10-13",
  mes_referencia: "2026-11",
  forma_pagamento: "credito",
  cartao_id: SMS_CARDS.master.id,
  pago: false,
  pago_por: "voce",
  is_parcelado: false,
  parcela_atual: null,
  parcela_total: null,
  parcelamento_id: null,
  created_at: "2026-10-13T10:00:00Z",
  ...overrides,
});
describe("calendário e orçamento", () => {
  it("Master 13/10 fecha 22/10, paga 01/11 e referência novembro", () => {
    const d = cardDates(SMS_CARDS.master, …3284 tokens truncated…esByDay(rows);
    expect(groups.map((g) => g.date)).toEqual([
      "2026-10-20",
      "2026-10-17",
      "2026-10-01",
    ]);
    expect(groups[1].entries.map((r) => r.id).sort()).toEqual(["p", "same"]);
  });
  it("receita parcelada mantém data original na lista e o total bate com o painel", () => {
    const rows = [
      entry({
        tipo: "receita",
        data: "2026-10-13",
        valor: 64691.96,
        is_parcelado: true,
        parcela_atual: 3,
      }),
      entry({ valor: 27553.225 }),
      entry({ id: "pais", subcategoria_pais: "Pais", valor: 300 }),
      entry({ id: "aporte", categoria_macro: "Aportes", valor: 1000 }),
      entry({ id: "futuro", data: "2026-11-01", valor: 100 }),
    ];
    const listed = monthEntries(rows, now);
    expect(groupEntriesByDay(listed)).toHaveLength(1);
    expect(monthSummary(listed, now)).toEqual(monthSummary(rows, now));
    expect(monthSummary(listed, now)).toMatchObject({
      income: 64691.96,
      spent: 27553.23,
      balance: 37138.73,
    });
  });
});

describe("resumo simples e gráficos", () => {
  const now = new Date(2026, 9, 18);
  it("Falta gastar e orçamento estourado usam o mesmo saldo, com estouro positivo", () => {
    const income = entry({
      id: "salary",
      tipo: "despesa",
      categoria: "salario",
      valor: 100,
    });
    expect(
      monthPresentation([income, entry({ valor: 30 })], now, now),
    ).toMatchObject({
      balance: 70,
      displayAmount: 70,
      label: "Falta gastar",
      over: false,
    });
    expect(
      monthPresentation([income, entry({ valor: 150 })], now, now),
    ).toMatchObject({
      balance: -50,
      displayAmount: 50,
      label: "Orçamento estourado em",
      over: true,
      progress: 100,
    });
    expect(monthPresentation([], now, now)).toMatchObject({
      balance: 0,
      label: "Falta gastar",
      displayAmount: 0,
      progress: 0,
    });
  });
  it("mês passado usa Sobrou ou Estourou e futuro só mostra o que já foi lançado", () => {
    const past = new Date(2026, 8, 1),
      future = new Date(2026, 10, 1);
    expect(
      monthPresentation([entry({ data: "2026-09-01", valor: 200 })], past, now),
    ).toMatchObject({
      label: "Estourou em setembro",
      displayAmount: 200,
      period: "past",
    });
    expect(
      monthPresentation(
        [entry({ data: "2026-09-01", tipo: "receita", valor: 200 })],
        past,
        now,
      ),
    ).toMatchObject({ label: "Sobrou", displayAmount: 200 });
    const rows = [
      entry({
        data: "2026-10-13",
        valor: 50,
        is_parcelado: true,
        parcela_atual: 2,
      }),
      entry({ data: "2026-10-13", valor: 100, tipo: "receita" }),
    ];
    expect(monthPresentation(rows, future, now)).toMatchObject({
      label: "Previsto",
      period: "future",
      income: 0,
      spent: 50,
      balance: -50,
    });
  });
  it("categorias ordenadas usam as mesmas exclusões e percentuais do mês", () => {
    const rows = [
      entry({ valor: 60 }),
      entry({ id: "leisure", valor: 40, categoria_macro: "Lazer" }),
      entry({ id: "parents", valor: 500, subcategoria_pais: "Pais" }),
      entry({ id: "investment", valor: 500, categoria_macro: "Aportes" }),
      entry({ id: "salary", categoria: "salario", valor: 1000 }),
      entry({ id: "receipt", tipo: "receita", valor: 200 }),
    ];
    const result = categoryChartData(rows, now);
    expect(result.spent).toBe(100);
    expect(result.categories).toHaveLength(6);
    expect(result.categories[0]).toMatchObject({
      category: "Alimentação",
      amount: 60,
      percent: 60,
    });
    expect(result.categories[1]).toMatchObject({
      category: "Lazer",
      amount: 40,
      percent: 40,
    });
    expect(
      result.categories.some((c) => (c.category as string) === "Pais"),
    ).toBe(false);
    expect(result.unclassified).toBe(0);
  });
  it("parcelas são deslocadas no gráfico e valores sem categoria não ganham categoria inventada", () => {
    const rows = [
      entry({ valor: 20.005 }),
      entry({ id: "half", valor: 0.005 }),
      entry({ id: "unknown", valor: 10, categoria_macro: null }),
      entry({
        id: "installment",
        data: "2026-09-13",
        parcela_atual: 2,
        is_parcelado: true,
        valor: 30,
        categoria_macro: "Lazer",
      }),
      entry({
        id: "future",
        data: "2026-10-13",
        parcela_atual: 2,
        is_parcelado: true,
        valor: 100,
      }),
    ];
    const result = categoryChartData(rows, now);
    expect(result.spent).toBe(60.01);
    expect(result.unclassified).toBe(10);
    expect(
      result.categories.find((c) => c.category === "Alimentação")?.amount,
    ).toBe(20.01);
    expect(result.categories[0]).toMatchObject({
      category: "Lazer",
      amount: 30,
    });
  });
  it("histórico tem seis meses com virada do ano e mês escolhido destacado", () => {
    const selected = new Date(2027, 0, 1);
    const rows = [
      entry({ data: "2026-08-15", valor: 100 }),
      entry({
        data: "2026-12-15",
        is_parcelado: true,
        parcela_atual: 2,
        valor: 40,
      }),
      entry({ data: "2027-01-01", categoria: "salario", valor: 200 }),
      entry({ data: "2027-02-01", tipo: "receita", valor: 999 }),
      entry({ data: "2026-07-01", tipo: "receita", valor: 999 }),
    ];
    const months = sixMonthChartData(rows, selected);
    expect(months.map((m) => m.month)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
    expect(months[0]).toMatchObject({ income: 0, spent: 100, selected: false });
    expect(months[1]).toMatchObject({ income: 0, spent: 0 });
    expect(months[5]).toMatchObject({ income: 200, spent: 40, selected: true });
    expect(months.filter((m) => m.selected)).toHaveLength(1);
  });
  it("referência de outubro permanece 64.691,96 menos 27.553,23", () => {
    const rows = [
      entry({ categoria: "salario", valor: 22110.46 }),
      entry({ id: "income", tipo: "receita", valor: 42581.5 }),
      entry({ id: "expense", valor: 27553.225 }),
    ];
    expect(monthPresentation(rows, now, now)).toMatchObject({
      income: 64691.96,
      spent: 27553.23,
      displayAmount: 37138.73,
      label: "Falta gastar",
    });
    expect(categoryChartData(rows, now).spent).toBe(27553.23);
    expect(sixMonthChartData(rows, now)[5]).toMatchObject({
      income: 64691.96,
      spent: 27553.23,
    });
  });
});


it("trocar receita para Pais exclui reembolso e desfazer categoria volta a somar", () => {
  const received = entry({ tipo: "receita", categoria: "receita", valor: 500 });
  const parents = { ...received, ...categoryPatch("Pais", received) };
  expect(parents.categoria).toBe("reembolso_pais");
  expect(monthIncome([parents], new Date(2026, 9, 18))).toBe(0);
  const corrected = { ...parents, ...categoryPatch("Pessoal", parents) };
  expect(corrected.categoria).toBe("receita");
  expect(monthIncome([corrected], new Date(2026, 9, 18))).toBe(500);
  expect(categoryPatch("Pessoal", entry({ tipo: "receita", categoria: "reembolso_adriano" })).categoria).toBe("reembolso_adriano");
});
