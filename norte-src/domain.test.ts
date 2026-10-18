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
    const d = cardDates(SMS_CARDS.master, new Date(2026, 9, 13));
    expect(dateKey(d.closing)).toBe("2026-10-22");
    expect(dateKey(d.due)).toBe("2026-11-01");
    expect(d.reference).toBe("2026-11");
    expect(d.days).toBe(19);
  });
  it("inclui o dia do fechamento e avança após ele", () => {
    expect(cardDates(SMS_CARDS.master, new Date(2026, 9, 22)).reference).toBe(
      "2026-11",
    );
    expect(cardDates(SMS_CARDS.master, new Date(2026, 9, 23)).reference).toBe(
      "2026-12",
    );
  });
  it("Visa paga no mesmo mês do fechamento", () => {
    expect(cardDates(SMS_CARDS.visa, new Date(2026, 9, 10)).reference).toBe(
      "2026-10",
    );
    expect(dateKey(cardDates(SMS_CARDS.visa, new Date(2026, 9, 11)).due)).toBe(
      "2026-11-17",
    );
  });
  it("trata dezembro e meses curtos", () => {
    expect(
      dateKey(cardDates(SMS_CARDS.master, new Date(2026, 11, 30)).due),
    ).toBe("2027-02-01");
    const c = { ...SMS_CARDS.master, dia_fechamento: 31, dia_vencimento: 10 };
    expect(dateKey(cardDates(c, new Date(2027, 1, 28)).closing)).toBe(
      "2027-02-28",
    );
  });
  it("exclui pais, aportes e receitas; usa data e desloca cada parcela", () => {
    const rows = [
      entry(),
      entry({ id: "b", subcategoria_pais: "Pais" }),
      entry({ id: "c", categoria_macro: "Aportes" }),
      entry({ id: "d", tipo: "receita" }),
      entry({ id: "e", is_parcelado: true, parcela_atual: 2, valor: 50 }),
    ];
    expect(monthSpending(rows, new Date(2026, 9, 17))).toBe(100);
    expect(monthSpending(rows, new Date(2026, 10, 17))).toBe(50);
  });
  it("mantém parcelas de 31 de janeiro no último dia de fevereiro", () => {
    expect(
      monthSpending(
        [entry({ data: "2027-01-31", is_parcelado: true, parcela_atual: 2 })],
        new Date(2027, 1, 15),
      ),
    ).toBe(100);
  });
});
describe("memória", () => {
  it("normaliza acentos e caixa e prioriza frequência", () => {
    expect(
      memory("  CAFÉ  ", [
        entry({ descricao: "cafe", categoria_macro: "Lazer" }),
        entry({ id: "b", descricao: "Café", categoria_macro: "Lazer" }),
        entry({ id: "c", descricao: "CAFÉ", categoria_macro: "Pessoal" }),
      ]),
    ).toBe("Lazer");
  });
  it("parcelas contam uma vez; empate usa a mais recente", () => {
    const rows = [1, 2, 3].map((n) =>
      entry({
        id: String(n),
        descricao: "Loja",
        parcelamento_id: "x",
        parcela_atual: n,
        categoria_macro: "Pessoal",
        created_at: "2026-01-01",
      }),
    );
    rows.push(
      entry({
        id: "new",
        descricao: "Loja",
        categoria_macro: "Saúde",
        created_at: "2026-10-01",
      }),
    );
    expect(memory("loja", rows)).toBe("Saúde");
  });
  it("regra dos pais respeita palavras completas", () => {
    expect(parentRule("presente da mãe")).toBe(true);
    expect(parentRule("Antônio")).toBe(true);
    expect(parentRule("paisagem")).toBe(false);
    expect(
      memory("farmácia pai", [
        entry({ descricao: "farmácia pai", categoria_macro: "Saúde" }),
      ]),
    ).toBe("Pais");
  });
  it("Pais mantém a categoria macro conhecida e volta ao orçamento ao mudar", () => {
    expect(categoryPatch("Pais", entry())).toMatchObject({
      categoria_macro: "Alimentação",
      subcategoria_pais: "Pais",
    });
    expect(
      categoryPatch("Saúde", entry({ subcategoria_pais: "Pais" })),
    ).toMatchObject({ categoria_macro: "Saúde", subcategoria_pais: null });
  });
});
describe("SMS", () => {
  const now = new Date(2026, 9, 17, 12);
  it("Master pessoal", () => {
    expect(
      parseSms(
        "Compra aprovada no seu PERSONNALITE THE ONE final 5897 - ESPACOLASERSP valor RS 322,82 em 07/10, as 10h36.",
        now,
      ),
    ).toMatchObject({
      merchant: "ESPACOLASERSP",
      amount: 322.82,
      pais: false,
      card: SMS_CARDS.master,
    });
  });
  it("Master pais extrai estabelecimento depois do hífen", () => {
    expect(
      parseSms(
        "Compra aprovada no PERSONNALITE THE ONE p/ AMELIA CAVALHEIRO - HOMEM DE MELLO valor RS 209,45 em 17/10/2026 as 08h29.",
        now,
      ),
    ).toMatchObject({
      merchant: "HOMEM DE MELLO",
      pais: true,
      date: "2026-10-17",
    });
  });
  it("Visa simples", () => {
    expect(
      parseSms(
        "Compra aprovada de R$ 220,00 em RETRO ADM, 17/10 as 11:20 no seu Itau final 9827.",
        now,
      ),
    ).toMatchObject({
      merchant: "RETRO ADM",
      amount: 220,
      card: SMS_CARDS.visa,
    });
  });
  it("Visa parcelado preserva total, grupo e referências", () => {
    const p = parseSms(
      "Compra aprovada de R$ 2.298,90 em 6x em CLARA ARTE, 12/10 as 10:00.",
      now,
    )!;
    const rows = smsRows(p, "u", "Lazer", "g");
    expect(rows).toHaveLength(6);
    expect(
      rows.every(
        (r) => r.parcelamento_id === "g" && r.descricao === "CLARA ARTE",
      ),
    ).toBe(true);
    expect(rows.map((r) => r.mes_referencia)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
    ]);
    expect(Math.round(rows.reduce((s, r) => s + r.valor, 0) * 100)).toBe(
      229890,
    );
  });
  it("ignora SMS irrelevantes e datas inválidas", () => {
    expect(
      parseSms("Pagamento recebido R$ 100,00 em Loja, 17/10", now),
    ).toBeNull();
    expect(
      parseSms("Compra aprovada de R$ 100,00 em Loja, 31/02", now),
    ).toBeNull();
  });
  it("centavos da divisão ficam na última parcela", () => {
    const p = parseSms(
      "Compra aprovada de R$ 100,00 em 3x em LOJA, 17/10",
      now,
    )!;
    expect(smsRows(p, "u", null, "g").map((r) => r.valor)).toEqual([
      33.33, 33.33, 33.34,
    ]);
  });
});

describe("receitas menos gastos", () => {
  const october = new Date(2026, 9, 17);
  it("salário com tipo despesa é receita, nunca gasto, no mês da data", () => {
    const rows = [
      entry({
        categoria: "salario",
        tipo: "despesa",
        valor: 22110.46,
        data: "2026-10-01",
      }),
      entry({
        categoria: "salario",
        tipo: "despesa",
        valor: 22110.46,
        data: "2026-11-01",
      }),
    ];
    expect(monthIncome(rows, october)).toBe(22110.46);
    expect(monthSpending(rows, october)).toBe(0);
    expect(monthIncome(rows, new Date(2026, 10, 17))).toBe(22110.46);
  });
  it("salário já tipado como receita entra uma única vez", () => {
    expect(
      monthIncome(
        [entry({ tipo: "receita", categoria: "salario", valor: 1000 })],
        october,
      ),
    ).toBe(1000);
  });
  it("exclui reembolso dos pais e mantém reembolsos de Adriano e Luísa", () => {
    const rows = [
      entry({ tipo: "receita", categoria: "reembolso_pais", valor: 900 }),
      entry({ tipo: "receita", categoria: "reembolso_adriano", valor: 200 }),
      entry({ tipo: "receita", categoria: "reembolso_luisa", valor: 100 }),
    ];
    expect(monthIncome(rows, october)).toBe(300);
  });
  it("gastos dos Pais não reduzem o saldo", () => {
    const summary = monthSummary(
      [
        entry({ tipo: "receita", valor: 1000 }),
        entry({ subcategoria_pais: "Pais", valor: 500 }),
        entry({ valor: 100 }),
      ],
      october,
    );
    expect(summary.balance).toBe(900);
    expect(summary.spent).toBe(100);
    expect(summary.progress).toBe(10);
  });
  it("saldo negativo continua negativo e limite semanal fica zero", () => {
    const summary = monthSummary(
      [entry({ tipo: "receita", valor: 100 }), entry({ valor: 250 })],
      october,
    );
    expect(summary.balance).toBe(-150);
    expect(summary.daysLeft).toBe(15);
    expect(summary.daily).toBe(-10);
    expect(summary.weekly).toBe(0);
    expect(summary.progress).toBe(100);
  });
  it("mês sem receita mostra apenas os gastos como saldo negativo", () => {
    expect(monthSummary([entry({ valor: 123.45 })], october)).toMatchObject({
      income: 0,
      spent: 123.45,
      balance: -123.45,
      weekly: 0,
      progress: 100,
    });
    expect(monthSummary([], october)).toMatchObject({
      income: 0,
      spent: 0,
      balance: 0,
      weekly: 0,
      progress: 0,
    });
  });
  it("receitas ignoram parcelas e mês da fatura", () => {
    const rows = [
      entry({
        tipo: "receita",
        data: "2026-10-01",
        mes_referencia: "2026-11",
        is_parcelado: true,
        parcela_atual: 4,
        valor: 200,
      }),
    ];
    expect(monthIncome(rows, october)).toBe(200);
    expect(monthIncome(rows, new Date(2027, 0, 17))).toBe(0);
  });
  it("arredonda totais antes de subtrair, como nos totais reais de outubro", () => {
    const rows = [
      entry({ tipo: "receita", valor: 64691.96 }),
      entry({ valor: 27500 }),
      entry({ valor: 53.225 }),
    ];
    expect(monthSummary(rows, october)).toMatchObject({
      income: 64691.96,
      spent: 27553.23,
      balance: 37138.73,
    });
  });
  it("semana usa sete dias mesmo na última semana incompleta do mês", () => {
    const summary = monthSummary(
      [entry({ tipo: "receita", valor: 600 })],
      new Date(2026, 9, 30),
    );
    expect(summary.daysLeft).toBe(2);
    expect(summary.daily).toBe(300);
    expect(summary.weekly).toBe(2100);
  });
});

describe("navegação e conferência mensal", () => {
  const now = new Date(2026, 9, 17);
  it("navega entre dezembro e janeiro e respeita os limites de 24 meses", () => {
    expect(dateKey(navigateMonth(new Date(2026, 11, 1), 1, now))).toBe(
      "2027-01-01",
    );
    expect(dateKey(navigateMonth(new Date(2027, 0, 1), -1, now))).toBe(
      "2026-12-01",
    );
    expect(dateKey(navigateMonth(new Date(2024, 9, 1), -1, now))).toBe(
      "2024-10-01",
    );
    expect(dateKey(navigateMonth(new Date(2028, 9, 1), 1, now))).toBe(
      "2028-10-01",
    );
  });
  it("a parcela aparece no mês futuro correspondente com sua data efetiva", () => {
    const rows = [
      entry({
        id: "p1",
        data: "2026-10-31",
        is_parcelado: true,
        parcela_atual: 1,
      }),
      entry({
        id: "p2",
        data: "2026-10-31",
        is_parcelado: true,
        parcela_atual: 2,
      }),
    ];
    const november = monthEntries(rows, new Date(2026, 10, 1));
    expect(november.map((r) => r.id)).toEqual(["p2"]);
    expect(groupEntriesByDay(november)[0].date).toBe("2026-11-30");
    expect(monthSummary(november, new Date(2026, 10, 1)).spent).toBe(100);
  });
  it("mês passado negativo mostra Passou e preserva o saldo", () => {
    const selected = new Date(2026, 8, 1);
    const balance = monthSummary(
      [entry({ data: "2026-09-17", valor: 150 })],
      selected,
    ).balance;
    expect(balance).toBe(-150);
    expect(
      monthPresentation(
        [entry({ data: "2026-09-17", valor: 150 })],
        selected,
        now,
      ).label,
    ).toBe("Estourou em setembro");
    expect(
      monthPresentation(
        [entry({ data: "2026-09-17", tipo: "receita", valor: 150 })],
        selected,
        now,
      ).label,
    ).toBe("Sobrou");
    expect(monthPresentation([], new Date(2026, 10, 1), now).label).toBe(
      "Previsto",
    );
  });
  it("filtro Pais inclui só os itens com subcategoria_pais preenchida", () => {
    const rows = [
      entry({ id: "pais", subcategoria_pais: "Pais" }),
      entry({ id: "pessoal" }),
      entry({ id: "aporte", categoria_macro: "Aportes" }),
      entry({ id: "salario", categoria: "salario" }),
    ];
    expect(filterEntries(rows, "Pais").map((r) => r.id)).toEqual(["pais"]);
    expect(filterEntries(rows, "Gastos").map((r) => r.id)).toEqual(["pessoal"]);
    expect(filterEntries(rows, "Receitas").map((r) => r.id)).toEqual([
      "salario",
    ]);
    expect(filterEntries(rows, "Todos")).toHaveLength(4);
  });
  it("agrupa por dia mais recente primeiro usando a data efetiva", () => {
    const rows = [
      entry({ id: "old", data: "2026-10-01" }),
      entry({
        id: "p",
        data: "2026-09-17",
        is_parcelado: true,
        parcela_atual: 2,
      }),
      entry({ id: "same", data: "2026-10-17" }),
      entry({ id: "new", data: "2026-10-20" }),
    ];
    const groups = groupEntriesByDay(rows);
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
