// @vitest-environment jsdom
import React from "react";
import { webcrypto } from "node:crypto";
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import App from "./App";
import { dateKey, Entry } from "./domain";
const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  calls: [] as { kind: string; body: Record<string, unknown> }[],
  ai: vi.fn(),
  session: true,
  upsertFails: false,
}));
vi.mock("./supabase", () => {
  class Query {
    table: string;
    op = "read";
    body: Record<string, unknown> | Record<string, unknown>[] = {};
    ids: string[] | null = null;
    constructor(table: string) {
      this.table = table;
    }
    select() {
      return this;
    }
    eq(column: string, value: string) {
      if (column === "id") this.ids = [value];
      return this;
    }
    order() {
      return this;
    }
    range() {
      return this;
    }
    maybeSingle() {
      return this;
    }
    in(_column: string, ids: string[]) {
      this.ids = ids;
      return this;
    }
    insert(body: Record<string, unknown>[]) {
      this.op = "insert";
      this.body = body;
      return this;
    }
    upsert(body: Record<string, unknown>[]) {
      this.op = "upsert";
      this.body = body;
      return this;
    }
    update(body: Record<string, unknown>) {
      this.op = "update";
      this.body = body;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    then(resolve: (r: unknown) => void) {
      if (this.table === "norte_cartoes")
        return Promise.resolve({
          data: [
            {
              id: "master",
              nome: "Master",
              dia_fechamento: 22,
              dia_vencimento: 1,
              ativo: true,
            },
            {
              id: "visa",
              nome: "Visa",
              dia_fechamento: 10,
              dia_vencimento: 17,
              ativo: true,
            },
          ],
          error: null,
        }).then(resolve);
      let data = state.rows;
      if (this.op === "insert") {
        data = (this.body as Record<string, unknown>[]).map((r, i) => ({
          ...r,
          id: "saved-" + i,
          created_at: new Date().toISOString(),
        }));
        state.rows = [...data, ...state.rows];
        state.calls.push({ kind: "insert", body: { rows: data } });
      }
      if (this.op === "upsert") {
        if (state.upsertFails) return Promise.resolve({ data: null, error: new Error("Falha ao gravar parcelas") }).then(resolve);
        data = this.body as Record<string, unknown>[];
        state.rows = [...state.rows.filter((r) => !data.some((part) => part.id === r.id)), ...data];
        state.calls.push({ kind: "upsert", body: { rows: data } });
      }
      if (this.op === "update") {
        state.calls.push({
          kind: "update",
          body: { ...this.body, ids: this.ids },
        });
        state.rows = state.rows.map((r) =>
          this.ids?.includes(String(r.id)) ? { ...r, ...this.body } : r,
        );
        data = state.rows.filter((r) => this.ids?.includes(String(r.id)));
      }
      if (this.op === "delete") {
        data = state.rows.filter((r) => this.ids?.includes(String(r.id)));
        state.rows = state.rows.filter(
          (r) => !this.ids?.includes(String(r.id)),
        );
      }
      return Promise.resolve({ data, error: null }).then(resolve);
    }
  }
  return {
    configured: true,
    supabase: {
      from: (t: string) => {
        if (!["norte_lancamentos", "norte_cartoes"].includes(t))
          throw new Error("Norte must only access its own tables");
        return new Query(t);
      },
      functions: { invoke: state.ai },
      auth: {
        getSession: async () => ({
          data: { session: state.session ? { user: { id: "u" } } : null },
          error: null,
        }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe() {} } },
        }),
        signOut: async () => ({ error: null }),
      },
    },
  };
});
const entry = (extras: Partial<Entry> = {}): Entry => ({
  id: "old",
  user_id: "u",
  descricao: "Mercado",
  valor: 100,
  tipo: "despesa",
  categoria: "despesa",
  categoria_macro: "Alimentação",
  subcategoria: "Supermercado",
  subcategoria_pais: null,
  data: dateKey(new Date()),
  mes_referencia: dateKey(new Date()).slice(0, 7),
  forma_pagamento: "dinheiro",
  cartao_id: null,
  pago: true,
  pago_por: "voce",
  is_parcelado: false,
  parcela_atual: null,
  parcela_total: null,
  parcelamento_id: null,
  created_at: new Date().toISOString(),
  ...extras,
});
beforeEach(() => {
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
  state.upsertFails = false;
  state.rows = [];
  state.calls = [];
  state.session = true;
  state.ai.mockReset();
  state.ai.mockImplementation(async (_name, { body }) => {
    const categories = body.items.map((item: { category?: string }) => item.category ?? "Alimentação");
    const choices: Record<string, string> = { Alimentação: "Supermercado", Lazer: "Assinaturas", Pessoal: "Presentes", Moradia: "Casa", Transporte: "Uber/Taxi", Saúde: "Farmácia", Pais: "Supermercado", Aportes: "Aportes" };
    return { data: { categories, subcategories: categories.map((cat: string) => choices[cat]) }, error: null };
  });
  localStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function () {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function () {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
// Existing transaction flows exercise the current month explicitly.
async function currentMonth() {
  const region = await screen.findByRole("region", { name: "Resumo do mês" });
  const today = screen.queryByRole("button", { name: "Hoje" });
  if (today) fireEvent.click(today);
  return region;
}
async function open() {
  render(<App />);
  await currentMonth();
  fireEvent.click(screen.getByRole("button", { name: "Anotar" }));
}
describe("fluxos do Norte", () => {
  it("impede salvar sem classificação quando a IA falha e mantém o texto", async () => {
    state.ai.mockResolvedValue({ data: null, error: { message: "offline" } });
    await open();
    fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
    fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), { target: { value: "45,50" } });
    fireEvent.change(screen.getByLabelText("Com o quê?"), { target: { value: "Café novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
    await screen.findByText("A IA está fora do ar agora, tente de novo");
    expect(state.calls).toHaveLength(0);
    expect(state.rows).toHaveLength(0);
    expect(screen.getByLabelText("Com o quê?")).toHaveProperty("value", "Café novo");
  });
  it("memória vence IA e correção antes de salvar é preservada", async () => {
    state.rows = [
      entry({ data: "2026-01-01", created_at: "2026-01-01T12:00:00Z" }),
    ];
    state.ai.mockResolvedValue({
      data: {
        items: [
          { kind: "despesa", label: "Mercado", amount: 45, category: "Lazer", subcategory: "Assinaturas", dayOffset: 0 },
        ],
      },
      error: null,
    });
    await open();
    fireEvent.change(screen.getByLabelText("O que aconteceu?"), {
      target: { value: "45 mercado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText("Confira antes de anotar.");
    const select = within(dialog).getByRole("combobox", {
      name: "Categoria do lançamento",
    }) as HTMLSelectElement;
    expect(select.value).toBe("Alimentação");
    fireEvent.change(select, { target: { value: "Pessoal" } });
    fireEvent.change(within(dialog).getByLabelText("Subcategoria do lançamento"), { target: { value: "Presentes" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Salvar gasto" }),
    );
    await screen.findByText("Gasto anotado.");
    await waitFor(() =>
      expect(state.rows.find((r) => r.id === "saved-0")?.categoria_macro).toBe(
        "Pessoal",
      ),
    );
    expect(state.ai).toHaveBeenCalledTimes(1);
  });
  it("usa lançamentos recorrentes como uma única referência de categoria e subcategoria", async () => {
    state.rows = [1, 2, 3].map((n) => entry({
      id: `rec-${n}`, descricao: "Streaming", categoria_macro: "Lazer",
      subcategoria: "Assinaturas", recorrencia_id: "serie-streaming",
      created_at: `2026-0${n}-01T12:00:00Z`,
    }));
    state.ai.mockResolvedValueOnce({ data: { items: [
      { kind: "despesa", amount: 50, label: "Streaming", category: "Pessoal", subcategory: "Presentes", dayOffset: 0 },
    ] }, error: null });
    await open();
    fireEvent.change(screen.getByLabelText("O que aconteceu?"), { target: { value: "50 streaming" } });
    fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
    await screen.findByText("Confira antes de anotar.");
    expect(screen.getByLabelText("Categoria do lançamento")).toHaveProperty("value", "Lazer");
    expect(screen.getByLabelText("Subcategoria do lançamento")).toHaveProperty("value", "Assinaturas");
    expect(state.ai.mock.calls[0][1].body.examples).toEqual(["Streaming (recorrente) → Lazer / Assinaturas"]);
  });
  it("trocar categoria atualiza todas as parcelas sem retirar gastos dos Pais do saldo", async () => {
    state.rows = [
      entry({
        id: "p1",
        is_parcelado: true,
        parcelamento_id: "g",
        parcela_atual: 1,
        parcela_total: 2,
      }),
      entry({
        id: "p2",
        is_parcelado: true,
        parcelamento_id: "g",
        parcela_atual: 2,
        parcela_total: 2,
      }),
    ];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    expect(screen.queryByRole("combobox", { name: "Categoria do lançamento" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Editar .*/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Categoria do lançamento" }),
      { target: { value: "Pais" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar edição" }));
    await waitFor(() =>
      expect(state.rows.every((r) => r.subcategoria_pais === "Pais")).toBe(
        true,
      ),
    );
    expect(state.calls.find((call) => call.body.subcategoria_pais === "Pais")?.body.ids).toEqual(["p1", "p2"]);
    expect(screen.getAllByText("Pais").length).toBeGreaterThan(1);
    expect(state.rows.every((r) => r.categoria_macro === "Alimentação")).toBe(
      true,
    );
  });
  it("permite apenas subcategorias fixas do FeFin e grava a escolha", async () => {
    state.rows = [entry()];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    expect(screen.queryByRole("combobox", { name: "Subcategoria do lançamento" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Editar .*/ }));
    const select = screen.getByRole("combobox", {
      name: "Subcategoria do lançamento",
    }) as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      "", "Supermercado", "Restaurantes", "Delivery",
    ]);
    fireEvent.change(select, { target: { value: "Supermercado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar edição" }));
    await waitFor(() => expect(state.rows[0]).toMatchObject({
      categoria_macro: "Alimentação",
      subcategoria: "Supermercado",
    }));
  });
  it("sem sessão mostra apenas o login", async () => {
    state.session = false;
    render(<App />);
    await screen.findByRole("button", { name: "Entrar" });
    expect(screen.queryByRole("region", { name: "Resumo do mês" })).toBeNull();
    expect(screen.getByLabelText("Senha").getAttribute("type")).toBe(
      "password",
    );
  });
});

it("classifica categoria e subcategoria sugeridas pela IA ao salvar manualmente", async () => {
  state.ai.mockResolvedValueOnce({
    data: { categories: ["Alimentação"], subcategories: ["Restaurantes"] },
    error: null,
  });
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), { target: { value: "48" } });
  fireEvent.change(screen.getByLabelText("Com o quê?"), { target: { value: "Bistrô novo" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
  await waitFor(() => expect(state.rows[0]).toMatchObject({ categoria_macro: "Alimentação", subcategoria: "Restaurantes" }));
});

it("preserva subcategoria do parse sem chamar classify e mostra no card limpo", async () => {
  state.ai.mockResolvedValueOnce({ data: { items: [
    { kind: "despesa", amount: 45, label: "Mercado novo", category: "Alimentação", subcategory: "Supermercado", dayOffset: 0 },
  ] }, error: null });
  await open();
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), { target: { value: "45 mercado novo" } });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Confira antes de anotar.");
  fireEvent.click(within(screen.getByRole("group", { name: "Pago com: Mercado novo" })).getByRole("radio", { name: "Master" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
  await waitFor(() => expect(state.rows[0]?.subcategoria).toBe("Supermercado"));
  expect(state.ai).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
  const current = new Date();
  const target = String(state.rows[0].mes_referencia).split("-").map(Number);
  const steps = (target[0] - current.getFullYear()) * 12 + target[1] - 1 - current.getMonth();
  for (let step = 0; step < steps; step++) fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(screen.getByText(/Supermercado · Master/)).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "Categoria do lançamento" })).toBeNull();
});

it("soma mercado dos Pais ao gasto do mês de vencimento do cartão", async () => {
  state.rows = [entry({
    id: "parent-market", descricao: "Pão de Açúcar", valor: 711.07,
    categoria_macro: "Alimentação", subcategoria: "Supermercado", subcategoria_pais: "Pais",
    data: "2026-10-18", mes_referencia: "2026-11", forma_pagamento: "credito", cartao_id: "master",
  })];
  render(<App />);
  const month = await currentMonth();
  expect(within(month).getByText("Gastou").nextElementSibling?.textContent).toMatch(/0,00/);
  fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(within(month).getByText("Gastou").nextElementSibling?.textContent).toMatch(/711,07/);
  fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
  expect(screen.getByText(/Supermercado · Master/)).toBeTruthy();
});

it("classifica mercado dos Pais e oferece atalho para o mês da fatura", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-18T12:00:00"));
  state.ai.mockResolvedValueOnce({ data: { items: [
    { kind: "despesa", amount: 711.07, label: "Mercado dos Pais", category: "Pais", subcategory: "Supermercado", dayOffset: -1, cardId: "master" },
  ] }, error: null });
  await open();
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), { target: { value: "711,07 mercado dos meus pais ontem no Master" } });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Confira antes de anotar.");
  fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
  await waitFor(() => expect(state.rows[0]).toMatchObject({
    categoria_macro: "Alimentação", subcategoria: "Supermercado", subcategoria_pais: "Pais", mes_referencia: "2026-11",
  }));
  fireEvent.click(screen.getByRole("button", { name: "Ver fatura de novembro" }));
  expect(within(screen.getByRole("region", { name: "Resumo do mês" })).getByText("Gastou").nextElementSibling?.textContent).toMatch(/711,07/);
});

it("pede à IA a subcategoria quando a categoria já foi reconhecida", async () => {
  state.ai.mockResolvedValueOnce({ data: { items: [
    { kind: "despesa", amount: 45, label: "Mercado novo", category: "Alimentação", subcategory: null, dayOffset: 0 },
  ] }, error: null }).mockResolvedValueOnce({ data: { categories: ["Alimentação"], subcategories: ["Supermercado"] }, error: null });
  await open();
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), { target: { value: "45 mercado novo" } });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Confira antes de anotar.");
  fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
  await waitFor(() => expect(state.rows[0]?.subcategoria).toBe("Supermercado"));
  expect(state.ai.mock.calls[1][1].body.items[0].category).toBe("Alimentação");
});

it("mostra orçamento estourado com valor positivo e só os três totais", async () => {
  state.rows = [entry({ tipo: "receita", valor: 100 }), entry({ valor: 250 })];
  const { container } = render(<App />);
  const month = await currentMonth();
  expect(
    within(month).getByRole("heading", { name: "Orçamento estourado em" }),
  ).toBeTruthy();
  expect(container.querySelector(".big-number")?.textContent).toMatch(/150,00/);
  expect(container.querySelector(".big-number")?.textContent).not.toMatch(/-/);
  expect(
    container
      .querySelector(".big-number")
      ?.classList.contains("attention-text"),
  ).toBe(true);
  expect(
    screen.getByRole("progressbar").classList.contains("care-progress"),
  ).toBe(true);
  expect(within(month).getAllByRole("definition")).toHaveLength(2);
  expect(screen.queryByText(/Ritmo diário/)).toBeNull();
  expect(screen.getByText("Melhor cartão hoje")).toBeTruthy();
  expect(screen.queryByLabelText("Valor mensal (R$)")).toBeNull();
  const tabs = within(screen.getByRole("navigation")).getAllByRole("button");
  expect(tabs.map((b) => b.textContent)).toEqual([
    "Mês",
    "Lançamentos",
    "Gráfico",
  ]);
});
it("compartilha mês nas três abas e mantém Anotar com IA primeiro", async () => {
  render(<App />);
  await currentMonth();
  const selector = screen.getByRole("group", { name: "Mês selecionado" });
  expect(within(selector).queryByRole("button", { name: "Hoje" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(screen.getByRole("heading", { name: "Previsto" })).toBeTruthy();
  expect(screen.getByText("Só o que já está lançado")).toBeTruthy();
  const selected = within(selector).getByText(/de \d{4}/).textContent;
  fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(within(selector).getByText(/dezembro de \d{4}/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
  for (const tab of ["Gráfico", "Lançamentos"]) {
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", { name: tab }),
    );
    expect(
      within(screen.getByRole("group", { name: "Mês selecionado" })).getByText(
        selected!,
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Anotar" }));
    expect(
      screen
        .getByRole("tab", { name: "Texto com IA" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Fechar$/ }));
  }
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", { name: "Mês" }),
  );
  expect(within(selector).queryByRole("button", { name: "Hoje" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Falta gastar" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(within(selector).getByText(/dezembro de \d{4}/)).toBeTruthy();
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", { name: "Mês" }),
  );
  expect(within(selector).queryByRole("button", { name: "Hoje" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Falta gastar" })).toBeTruthy();
});
it("tocar categoria do gráfico abre só esses gastos e permite limpar o filtro", async () => {
  state.rows = [
    entry({ id: "a", descricao: "Supermercado", valor: 60 }),
    entry({
      id: "b",
      descricao: "Cinema",
      categoria_macro: "Lazer",
      valor: 40,
    }),
  ];
  const { container } = render(<App />);
  await currentMonth();
  fireEvent.click(screen.getByRole("button", { name: "Gráfico" }));
  expect(
    screen.getByRole("img", { name: "Ganhou e gastou nos últimos seis meses" }),
  ).toBeTruthy();
  expect(container.querySelectorAll(".selected-month-bg")).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Ver gastos de Alimentação" }),
  );
  expect(
    screen
      .getByRole("button", { name: "Lançamentos" })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(
    screen.getByRole("button", { name: "Ver detalhes de Supermercado" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Ver detalhes de Cinema" }),
  ).toBeNull();
  expect(container.querySelector(".ledger-total")?.textContent).toMatch(
    /100,00/,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Remover filtro Alimentação" }),
  );
  expect(
    screen.getByRole("button", { name: "Ver detalhes de Cinema" }),
  ).toBeTruthy();
});
it("lista 80 itens, carrega mais, filtra e confirma exclusão de uma só parcela", async () => {
  state.rows = Array.from({ length: 81 }, (_, i) =>
    entry({
      id: `r${i}`,
      descricao: `Gasto ${i}`,
      valor: 10,
      is_parcelado: true,
      parcela_atual: 1,
      parcela_total: 5,
      parcelamento_id: `g${i}`,
    }),
  );
  state.rows.push(
    entry({
      id: "pais",
      descricao: "Mercado Pais",
      subcategoria_pais: "Pais",
      valor: 500,
    }),
  );
  state.rows.push(
    entry({
      id: "receipt",
      tipo: "receita",
      descricao: "Entrada",
      valor: 1000,
    }),
  );
  render(<App />);
  await currentMonth();
  fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
  expect(
    screen.getAllByRole("button", { name: /Ver detalhes de/ }),
  ).toHaveLength(80);
  fireEvent.click(screen.getByRole("button", { name: "Ver mais" }));
  expect(
    screen.getAllByRole("button", { name: /Ver detalhes de/ }),
  ).toHaveLength(83);
  expect(screen.getAllByText("Pais").length).toBeGreaterThan(1);
  fireEvent.click(
    within(
      screen.getByRole("group", { name: "Filtrar lançamentos" }),
    ).getByRole("button", { name: "Pais" }),
  );
  expect(
    screen.getAllByRole("button", { name: /Ver detalhes de/ }),
  ).toHaveLength(1);
  fireEvent.click(
    within(
      screen.getByRole("group", { name: "Filtrar lançamentos" }),
    ).getByRole("button", { name: "Gastos" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Ver detalhes de Gasto 9" }),
  );
  const detail = screen.getByRole("dialog", { name: "Detalhes do lançamento" });
  expect(within(detail).getByText("Data da compra")).toBeTruthy();
  fireEvent.click(within(detail).getByRole("button", { name: "Apagar" }));
  expect(state.rows).toHaveLength(83);
  expect(
    within(detail).getByText("Serão apagados 1 lançamento(s)."),
  ).toBeTruthy();
  expect(within(detail).getByRole("button", { name: "Só este" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(
    within(detail).getByRole("button", { name: "Confirmar exclusão" }),
  );
  await waitFor(() => expect(state.rows).toHaveLength(82));
  expect(state.rows.find((r) => r.id === "r9")).toBeUndefined();
  expect(state.rows.find((r) => r.id === "r8")).toBeTruthy();
});
it("mostra ícone de idoso para Pais e selo na última parcela", async () => {
  state.rows = [
    entry({ id: "pais", descricao: "Farmácia dos Pais", categoria_macro: "Saúde", subcategoria: "Farmácia", subcategoria_pais: "Pais" }),
    entry({ id: "fim", descricao: "Sofá", categoria_macro: "Moradia", data: dateKey(new Date(new Date().getFullYear(), new Date().getMonth() - 2, 15, 12)), is_parcelado: true, parcela_atual: 3, parcela_total: 3, parcelamento_id: "parcelas" }),
  ];
  render(<App />);
  await currentMonth();
  fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
  const pais = screen.getByRole("button", { name: "Ver detalhes de Farmácia dos Pais" });
  expect(pais.querySelector(".ledger-category-icon")).toBeTruthy();
  expect(within(pais).getByText("PAIS")).toBeTruthy();
  expect(pais.querySelector(".ledger-amount")?.textContent?.replace(/\s/g, "")).toBe("-R$100,00");
  const fim = screen.getByRole("button", { name: "Ver detalhes de Sofá" });
  expect(within(fim).getByText("3/3x")).toBeTruthy();
  expect(within(fim).getByText("última")).toBeTruthy();
});

it("Norte inicia vazio e envia à IA somente seu próprio histórico", async () => {
  render(<App />);
  const month = await currentMonth();
  expect(month.querySelector(".big-number")?.textContent).toMatch(/0,00/);
  expect(
    within(month)
      .getAllByRole("definition")
      .every((el) => /0,00/.test(el.textContent ?? "")),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
  expect(screen.getByText(/Nada lançado em/)).toBeTruthy();
  state.ai.mockResolvedValue({
    data: {
      items: [
        { kind: "despesa", label: "Mercado", amount: 10, category: "Alimentação", subcategory: "Supermercado", dayOffset: 0 },
      ],
    },
    error: null,
  });
  fireEvent.click(screen.getByRole("button", { name: "Anotar" }));
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), {
    target: { value: "10 mercado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Confira antes de anotar.");
  expect(state.ai.mock.calls[0][1].body.examples).toEqual([]);
});


it("anota receita por valor, soma só em Ganhou e permite desfazer", async () => {
  await open();
  expect(screen.getByRole("tab", { name: "Texto com IA" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  fireEvent.click(screen.getByRole("button", { name: "Receita" }));
  expect(screen.queryByText("Pago com")).toBeNull();
  fireEvent.change(screen.getByLabelText("Quanto entrou? (R$)"), { target: { value: "1500,50" } });
  fireEvent.change(screen.getByLabelText("De onde veio?"), { target: { value: "Salário" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar receita" }));
  await screen.findByText("Receita anotada.");
  expect(state.rows[0]).toMatchObject({ tipo: "receita", categoria: "receita", valor: 1500.5, cartao_id: null, forma_pagamento: "dinheiro", pago: true });
  const summary = screen.getByRole("region", { name: "Resumo do mês" });
  expect(summary.querySelector(".big-number")?.textContent).toMatch(/1\.500,50/);
  expect(within(summary).getByText("Gastou").nextElementSibling?.textContent).toMatch(/0,00/);
  fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
  await waitFor(() => expect(state.rows).toHaveLength(0));
});

it("parcelado: valor cheio dividido em centavos, prévia e uma linha por parcela", async () => {
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), { target: { value: "100" } });
  fireEvent.change(screen.getByLabelText("Com o quê?"), { target: { value: "Geladeira" } });
  fireEvent.click(screen.getByRole("button", { name: "Parcelado" }));
  expect(state.rows).toHaveLength(0);
  fireEvent.change(screen.getByLabelText(/Em quantas parcelas/), { target: { value: "3" } });
  expect(screen.getByText(/3x de R\$\s*33,33 \(última R\$\s*33,34\)/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Salvar parcelas" }));
  await screen.findByText("Compra anotada em 3 parcelas.");
  const parts = state.rows.filter((r) => r.descricao === "Geladeira");
  expect(parts.map((r) => r.valor).sort()).toEqual([33.33, 33.33, 33.34]);
  expect(parts.every((r) => r.is_parcelado && r.parcela_total === 3 && r.parcelamento_id === parts[0].parcelamento_id)).toBe(true);
  await waitFor(() => expect(state.ai).toHaveBeenCalledTimes(1));
  expect(state.ai.mock.calls[0][1].body.items).toHaveLength(1);
});

it("uma compra extraída do texto pode ser parcelada", async () => {
  state.ai
    .mockResolvedValueOnce({
      data: { items: [{ kind: "despesa", amount: 1200, label: "Notebook", category: "Pessoal", subcategory: null, dayOffset: 0 }] },
      error: null,
    })
    .mockResolvedValueOnce({ data: { categories: ["Pessoal"], subcategories: ["Educação"] }, error: null });
  await open();
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), {
    target: { value: "Notebook 1200 em 3x" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Notebook");
  fireEvent.click(screen.getByRole("button", { name: "Parcelado" }));
  fireEvent.change(screen.getByLabelText(/Em quantas parcelas/), { target: { value: "3" } });
  fireEvent.click(within(screen.getByRole("group", { name: "Pago com: Notebook" })).getByRole("radio", { name: "Master" }));
  expect(screen.getByText(/3x de R\$\s*400,00/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Salvar parcelas" }));
  await screen.findByText("Compra anotada em 3 parcelas.");
  const parts = state.rows.filter((r) => r.descricao === "Notebook");
  expect(parts).toHaveLength(3);
  expect(parts.every((r) => r.cartao_id === "master" && r.forma_pagamento === "credito")).toBe(true);
  expect(state.ai).toHaveBeenCalledTimes(2);
});

it("todo mês: cria uma linha por mês com o mesmo recorrencia_id", async () => {
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), { target: { value: "89,90" } });
  fireEvent.change(screen.getByLabelText("Com o quê?"), { target: { value: "Streaming" } });
  fireEvent.click(screen.getByRole("button", { name: "Todo mês" }));
  fireEvent.change(screen.getByLabelText(/Dia do mês/), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText(/Por quantos meses/), { target: { value: "4" } });
  expect(within(screen.getByRole("group", { name: "Pago com" })).getByRole("radio", { name: "Pix/dinheiro" })).toHaveProperty("checked", true);
  fireEvent.click(screen.getByRole("button", { name: "Salvar todo mês" }));
  await screen.findByText("Lançamento anotado por 4 meses.");
  const rec = state.rows.filter((r) => r.descricao === "Streaming");
  expect(rec).toHaveLength(4);
  expect(new Set(rec.map((r) => r.recorrencia_id)).size).toBe(1);
  expect(rec.every((r) => r.valor === 89.9 && !r.is_parcelado)).toBe(true);
});

it("gasto recorrente manual permite escolher Master e usa a fatura", async () => {
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), { target: { value: "89,90" } });
  fireEvent.change(screen.getByLabelText("Com o quê?"), { target: { value: "Assinatura" } });
  fireEvent.click(screen.getByRole("button", { name: "Todo mês" }));
  fireEvent.change(screen.getByLabelText(/Por quantos meses/), { target: { value: "2" } });
  fireEvent.click(within(screen.getByRole("group", { name: "Pago com" })).getByRole("radio", { name: "Master" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar todo mês" }));
  await screen.findByText("Lançamento anotado por 2 meses.");
  const rows = state.rows.filter((r) => r.descricao === "Assinatura");
  expect(rows).toHaveLength(2);
  expect(rows.every((r) => r.forma_pagamento === "credito" && r.cartao_id === "master")).toBe(true);
  expect(new Set(rows.map((r) => r.mes_referencia)).size).toBe(2);
});

it("receita com IA mantém categorias ajustáveis e memória, sem cartão", async () => {
  state.rows = [entry({ tipo: "receita", subcategoria: "Presentes", descricao: "Venda", categoria_macro: "Pessoal", data: "2026-01-01" })];
  state.ai.mockResolvedValue({ data: { items: [
    { kind: "receita", amount: 300, label: "Venda", category: "Lazer", subcategory: "Assinaturas", dayOffset: 0 },
    { kind: "receita", amount: 100, label: "Reembolso mãe", category: "Pessoal", subcategory: "Presentes", dayOffset: 0 },
  ] }, error: null });
  await open();
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), { target: { value: "Recebi 300 da venda e 100 de reembolso da minha mãe" } });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Confira antes de anotar.");
  expect(state.ai.mock.calls[0][1].body.kind).toBeUndefined();
  const selects = within(screen.getByRole("dialog")).getAllByRole("combobox", { name: "Categoria do lançamento" });
  expect((selects[0] as HTMLSelectElement).value).toBe("Pessoal");
  fireEvent.change(selects[0], { target: { value: "Moradia" } });
  fireEvent.change(within(screen.getByRole("dialog")).getAllByLabelText("Subcategoria do lançamento")[0], { target: { value: "Casa" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar receitas" }));
  await screen.findByText("Receitas anotadas.");
  expect(state.rows[0]).toMatchObject({ tipo: "receita", categoria_macro: "Moradia", cartao_id: null });
  expect(state.rows[1]).toMatchObject({ tipo: "receita", categoria: "reembolso_pais", subcategoria_pais: "Pais" });
  expect(screen.getByRole("region", { name: "Resumo do mês" }).querySelector(".big-number")?.textContent).toMatch(/400,00/);
});

it("IA detecta receita e gasto no mesmo comando, com pagamento só no gasto", async () => {
  state.ai.mockResolvedValue({ data: { items: [
    { kind: "receita", amount: 500, label: "Venda", category: "Pessoal", subcategory: "Presentes", dayOffset: 0 },
    { kind: "despesa", amount: 45, label: "Mercado", category: "Alimentação", subcategory: "Supermercado", dayOffset: 0, cardId: "master" },
  ] }, error: null });
  await open();
  expect(screen.queryByRole("button", { name: "Receita" })).toBeNull();
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), { target: { value: "Recebi 500 da venda e gastei 45 no mercado" } });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Confira antes de anotar.");
  expect(screen.getByLabelText("Tipo do lançamento: Venda")).toHaveProperty("value", "receita");
  expect(screen.getByLabelText("Tipo do lançamento: Mercado")).toHaveProperty("value", "despesa");
  expect(screen.getByText(/· Master/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Salvar lançamentos" }));
  await screen.findByText("Lançamentos anotados.");
  expect(state.rows.find((r) => r.descricao === "Venda")).toMatchObject({ tipo: "receita", cartao_id: null });
  expect(state.rows.find((r) => r.descricao === "Mercado")).toMatchObject({ tipo: "despesa", cartao_id: "master" });
});

it("mostra melhor cartão hoje e leva compra no crédito para o mês da fatura", async () => {
  await open();
  expect(screen.getByRole("complementary", { name: "Melhor cartão hoje" }).textContent).toMatch(/Master|Visa/);
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), { target: { value: "90" } });
  fireEvent.change(screen.getByLabelText("Com o quê?"), { target: { value: "Compra cartão" } });
  const payment = screen.getByRole("group", { name: "Pago com" });
  expect(within(payment).getByRole("radio", { name: "Pix/dinheiro" })).toHaveProperty("checked", true);
  expect(within(payment).getByRole("radio", { name: "Visa" })).toBeTruthy();
  fireEvent.click(within(payment).getByRole("radio", { name: "Master" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
  await screen.findByText("Gasto anotado.");
  const today = new Date();
  const card = { id: "master", nome: "Master", ativo: true, dia_fechamento: 22, dia_vencimento: 1 };
  const { cardDates, monthKey, monthSummary } = await import("./domain");
  expect(state.rows[0]).toMatchObject({ forma_pagamento: "credito", cartao_id: "master", mes_referencia: cardDates(card, today).reference });
  fireEvent.click(screen.getByRole("button", { name: "Anotar" }));
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  expect(within(screen.getByRole("group", { name: "Pago com" })).getByRole("radio", { name: "Master" })).toHaveProperty("checked", true);
  if (cardDates(card, today).reference !== monthKey(today)) {
    expect(monthSummary(state.rows as Entry[], today).spent).toBe(0);
    expect(screen.getByRole("region", { name: "Resumo do mês" }).querySelector(".month-summary")?.textContent).toMatch(/GastouR\$\s*0,00/);
  }
});

it("permite escolher Visa em gasto manual e salva na fatura correta", async () => {
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), { target: { value: "191,57" } });
  fireEvent.change(screen.getByLabelText("Com o quê?"), { target: { value: "Compra Visa" } });
  fireEvent.click(within(screen.getByRole("group", { name: "Pago com" })).getByRole("radio", { name: "Visa" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
  await screen.findByText("Gasto anotado.");
  const { cardDates } = await import("./domain");
  expect(state.rows[0]).toMatchObject({
    forma_pagamento: "credito",
    cartao_id: "visa",
    mes_referencia: cardDates({ id: "visa", nome: "Visa", dia_fechamento: 10, dia_vencimento: 17, ativo: true }, new Date()).reference,
  });
});

it("permite corrigir o cartão da IA antes de salvar", async () => {
  state.ai.mockResolvedValueOnce({ data: { items: [
    { kind: "despesa", amount: 60, label: "Cinema", category: "Lazer", subcategory: "Assinaturas", dayOffset: 0, cardId: null },
  ] }, error: null });
  await open();
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), { target: { value: "Cinema 60 no Visa" } });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  const payment = await screen.findByRole("group", { name: "Pago com: Cinema" });
  fireEvent.click(within(payment).getByRole("radio", { name: "Visa" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
  await screen.findByText("Gasto anotado.");
  expect(state.rows[0]).toMatchObject({ forma_pagamento: "credito", cartao_id: "visa" });
});

it.each([
  ["config", 503, "A IA ainda não está configurada"],
  ["provider_auth", 503, "A IA ainda não está configurada"],
  ["model", 503, "A IA ainda não está configurada"],
  ["provider_unavailable", 503, "A IA está fora do ar agora, tente de novo"],
  ["auth", 401, "Entre de novo para usar a IA"],
])("mostra erro %s do SDK e impede lançamento incompleto", async (code, status, expected) => {
  state.ai.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ code }), { status: Number(status) }) } });
  await open();
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), { target: { value: "45 café" } });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText(String(expected));
  expect((screen.getByLabelText("O que aconteceu?") as HTMLTextAreaElement).value).toBe("45 café");
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
  fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), { target: { value: "45" } });
  fireEvent.change(screen.getByLabelText("Com o quê?"), { target: { value: "Café" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
  await screen.findByText(String(expected));
  expect(state.rows).toHaveLength(0);
  expect(state.calls).toHaveLength(0);
});

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}
describe("swipe, editar e excluir", () => {
  beforeAll(() => {
    (globalThis as unknown as { PointerEvent: unknown }).PointerEvent = TestPointerEvent;
    (window as unknown as { PointerEvent: unknown }).PointerEvent = TestPointerEvent;
  });
  const swipeLeft = (el: Element) => {
    fireEvent.pointerDown(el, { clientX: 300, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 200, clientY: 102, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 200, clientY: 102, pointerId: 1 });
  };
  const content = (name: string) =>
    screen.getByRole("button", { name: `Ver detalhes de ${name}` }).closest(".swipe-content") as HTMLElement;

  it("arrastar para a esquerda revela Editar/Excluir; edita descrição, valor e data", async () => {
    state.rows = [entry({ id: "s1", descricao: "Padaria", valor: 20, data: dateKey(new Date()) })];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    const c = content("Padaria");
    expect(c.getAttribute("data-open")).toBe("false");
    swipeLeft(c);
    expect(c.getAttribute("data-open")).toBe("true");
    expect(c.style.transform).toBe("translateX(-168px)");
    expect(c.closest(".swipe")?.getAttribute("style")).toContain("--swipe-actions-width: 168px");
    fireEvent.click(screen.getByRole("button", { name: "Editar Padaria" }));
    const dlg = await screen.findByRole("dialog", { name: "Editar lançamento" });
    fireEvent.change(within(dlg).getByLabelText("Descrição"), { target: { value: "Padaria nova" } });
    fireEvent.change(within(dlg).getByLabelText("Valor (R$)"), { target: { value: "35,90" } });
    fireEvent.change(within(dlg).getByLabelText("Data"), { target: { value: "2026-10-02" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar edição" }));
    await screen.findByText("Lançamento atualizado.");
    expect(state.rows[0]).toMatchObject({ descricao: "Padaria nova", valor: 35.9, data: "2026-10-02", mes_referencia: "2026-10" });
  });

  it("converte gasto único em parcelas, preserva cartão e fatura e remove o valor cheio", async () => {
    state.rows = [entry({ id: "single", descricao: "Compra", valor: 100, cartao_id: "master", forma_pagamento: "credito", pago: false })];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    swipeLeft(content("Compra"));
    fireEvent.click(screen.getByRole("button", { name: "Editar Compra" }));
    const dlg = await screen.findByRole("dialog", { name: "Editar lançamento" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Parcelado" }));
    fireEvent.change(within(dlg).getByLabelText("Em quantas parcelas?"), { target: { value: "3" } });
    expect(within(dlg).getByLabelText("Valor total da compra (R$)")).toHaveProperty("value", "100");
    state.upsertFails = true;
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar parcelas" }));
    expect(await within(dlg).findByRole("alert")).toHaveProperty("textContent", "Falha ao gravar parcelas");
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].valor).toBe(100);
    state.upsertFails = false;
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar parcelas" }));
    await screen.findByText("Lançamento atualizado em 3 parcelas.");
    expect(state.rows.map((r) => r.valor)).toEqual([33.33, 33.33, 33.34]);
    expect(state.rows.map((r) => r.parcela_atual)).toEqual([1, 2, 3]);
    expect(state.rows.every((r) => r.cartao_id === "master" && r.forma_pagamento === "credito" && r.parcelamento_id === "single" && r.subcategoria === "Supermercado")).toBe(true);
    expect(new Set(state.rows.map((r) => r.mes_referencia)).size).toBe(3);
    expect(state.calls.filter((c) => c.kind === "upsert")).toHaveLength(1);
  });

  it("não grava parcelamento com quantidade inválida ou centavos insuficientes", async () => {
    state.rows = [entry({ descricao: "Compra" })];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    swipeLeft(content("Compra"));
    fireEvent.click(screen.getByRole("button", { name: "Editar Compra" }));
    const dlg = await screen.findByRole("dialog", { name: "Editar lançamento" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Parcelado" }));
    for (const count of ["1", "361", "2.5"]) {
      fireEvent.change(within(dlg).getByLabelText("Em quantas parcelas?"), { target: { value: count } });
      fireEvent.click(within(dlg).getByRole("button", { name: "Salvar parcelas" }));
      expect(within(dlg).getByRole("alert")).toBeTruthy();
    }
    fireEvent.change(within(dlg).getByLabelText("Em quantas parcelas?"), { target: { value: "3" } });
    fireEvent.change(within(dlg).getByLabelText("Valor total da compra (R$)"), { target: { value: "0,02" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar parcelas" }));
    expect(state.calls).toHaveLength(0);
  });

  it("Excluir pelo swipe abre a confirmação e apaga", async () => {
    state.rows = [entry({ id: "s2", descricao: "Cinema", valor: 40, data: dateKey(new Date()) })];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    swipeLeft(content("Cinema"));
    fireEvent.click(screen.getByRole("button", { name: "Excluir Cinema" }));
    const dlg = await screen.findByRole("dialog", { name: "Detalhes do lançamento" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(state.rows).toHaveLength(0));
  });

  it("rolar na vertical não abre as ações; valor inválido é recusado", async () => {
    state.rows = [entry({ id: "s3", descricao: "Café", valor: 8, data: dateKey(new Date()) })];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    const c = content("Café");
    fireEvent.pointerDown(c, { clientX: 300, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(c, { clientX: 295, clientY: 220, pointerId: 1 });
    fireEvent.pointerUp(c, { clientX: 295, clientY: 220, pointerId: 1 });
    expect(c.getAttribute("data-open")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Café" }));
    const det = screen.getByRole("dialog", { name: "Detalhes do lançamento" });
    fireEvent.click(within(det).getByRole("button", { name: "Editar" }));
    const dlg = await screen.findByRole("dialog", { name: "Editar lançamento" });
    fireEvent.change(within(dlg).getByLabelText("Valor (R$)"), { target: { value: "0" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar edição" }));
    expect(await within(dlg).findByRole("alert")).toBeTruthy();
    expect(state.rows[0].valor).toBe(8);
  });

  it("editar parcela com 'Todos' distribui o total pelo grupo sem mexer na data", async () => {
    const d = dateKey(new Date());
    state.rows = [1, 2, 3].map((n) => entry({ id: `p${n}`, descricao: "Sofá", valor: 100, data: d, is_parcelado: true, parcela_atual: n, parcela_total: 3, parcelamento_id: "G" }));
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    swipeLeft(content("Sofá"));
    fireEvent.click(screen.getByRole("button", { name: "Editar Sofá" }));
    const dlg = await screen.findByRole("dialog", { name: "Editar lançamento" });
    expect(within(dlg).queryByLabelText("Data")).toBeNull();
    fireEvent.click(within(dlg).getByRole("button", { name: "Todos" }));
    expect(within(dlg).getByLabelText("Valor total das parcelas selecionadas (R$)")).toHaveProperty("value", "300,00");
    fireEvent.change(within(dlg).getByLabelText("Valor total das parcelas selecionadas (R$)"), { target: { value: "120" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar edição" }));
    await screen.findByText("3 lançamentos atualizados.");
    expect(state.rows.every((r) => r.valor === 40)).toBe(true);
  });

  it("corrige uma compra de seis parcelas distribuindo os centavos do total", async () => {
    state.rows = [191.57, 31.92, 31.92, 31.92, 31.92, 31.97].map((valor, index) => entry({
      id: `clara-${index + 1}`, descricao: "Clara Artebrum", valor,
      is_parcelado: true, parcela_atual: index + 1, parcela_total: 6, parcelamento_id: "clara",
    }));
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Clara Artebrum" }));
    const dlg = await screen.findByRole("dialog", { name: "Editar lançamento" });
    expect(within(dlg).getByLabelText("Valor desta parcela (R$)")).toHaveProperty("value", "191,57");
    fireEvent.click(within(dlg).getByRole("button", { name: "Todos" }));
    fireEvent.change(within(dlg).getByLabelText("Valor total das parcelas selecionadas (R$)"), { target: { value: "191,57" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar edição" }));
    await screen.findByText("6 lançamentos atualizados.");
    expect(state.rows.map((r) => r.valor)).toEqual([31.92, 31.92, 31.92, 31.92, 31.92, 31.97]);
  });

  it("Só este altera apenas uma parcela", async () => {
    state.rows = [1, 2].map((n) => entry({
      id: `single-${n}`, descricao: "Assinatura", valor: 50,
      is_parcelado: true, parcela_atual: n, parcela_total: 2, parcelamento_id: "single",
    }));
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Assinatura" }));
    const dlg = await screen.findByRole("dialog", { name: "Editar lançamento" });
    fireEvent.change(within(dlg).getByLabelText("Valor desta parcela (R$)"), { target: { value: "45" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar edição" }));
    await screen.findByText("Lançamento atualizado.");
    expect(state.rows.map((r) => r.valor)).toEqual([45, 50]);
  });

  it("Este e os próximos distribui o total apenas nas parcelas restantes", async () => {
    state.rows = [1, 2, 3].map((n) => entry({
      id: `next-${n}`, descricao: "Sofá", valor: 50,
      is_parcelado: true, parcela_atual: n, parcela_total: 3, parcelamento_id: "next",
    }));
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Sofá" }));
    const dlg = await screen.findByRole("dialog", { name: "Editar lançamento" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Este e os próximos" }));
    expect(within(dlg).getByLabelText("Valor total das parcelas selecionadas (R$)")).toHaveProperty("value", "100,00");
    fireEvent.change(within(dlg).getByLabelText("Valor total das parcelas selecionadas (R$)"), { target: { value: "90" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Salvar edição" }));
    await screen.findByText("2 lançamentos atualizados.");
    expect(state.rows.map((r) => r.valor)).toEqual([50, 45, 45]);
  });
});

describe("aviso de lançamento apagado", () => {
  it("some sozinho depois de alguns segundos e pode ser fechado", async () => {
    state.rows = [entry({ id: "n1", descricao: "Lanche", valor: 10, data: dateKey(new Date()) })];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Lanche" }));
    const dlg = screen.getByRole("dialog", { name: "Detalhes do lançamento" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Apagar" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "Confirmar exclusão" }));
    await screen.findByText("Lançamento apagado.");
    await waitFor(() => expect(screen.queryByText("Lançamento apagado.")).toBeNull(), { timeout: 6000 });
  }, 10000);
  it("o botão × fecha o aviso na hora", async () => {
    state.rows = [entry({ id: "n2", descricao: "Lanche", valor: 10, data: dateKey(new Date()) })];
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Lanche" }));
    const dlg = screen.getByRole("dialog", { name: "Detalhes do lançamento" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Apagar" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "Confirmar exclusão" }));
    await screen.findByText("Lançamento apagado.");
    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByText("Lançamento apagado.")).toBeNull();
  });
});


describe("mês ao entrar no Norte", () => {
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it.each([
    ["2026-10-31T12:00:00", "novembro de 2026"],
    ["2026-12-31T12:00:00", "janeiro de 2027"],
  ])("abre no mês seguinte em %s", async (date, expected) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(date));
    render(<App />);
    await screen.findByRole("region", { name: "Resumo do mês" });
    expect(within(screen.getByRole("group", { name: "Mês selecionado" })).getByText(expected)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Previsto" })).toBeTruthy();
  });

  it("volta do segundo plano na aba Mês e recalcula o próximo mês", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T23:59:00"));
    render(<App />);
    await screen.findByRole("region", { name: "Resumo do mês" });
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    fireEvent.click(screen.getByRole("button", { name: "Gráfico" }));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    fireEvent(document, new Event("visibilitychange"));
    vi.setSystemTime(new Date("2026-11-01T00:01:00"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    fireEvent(document, new Event("visibilitychange"));
    expect(within(screen.getByRole("group", { name: "Mês selecionado" })).getByText("dezembro de 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mês" }).getAttribute("aria-current")).toBe("page");
    expect(await screen.findByRole("region", { name: "Resumo do mês" })).toBeTruthy();
  });

  it("mantém a navegação manual ao receber foco sem sair do app", async () => {
    render(<App />);
    await currentMonth();
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    const selected = screen.getByRole("group", { name: "Mês selecionado" }).textContent;
    fireEvent.focus(window);
    expect(screen.getByRole("group", { name: "Mês selecionado" }).textContent).toBe(selected);
    expect(screen.getByRole("button", { name: "Lançamentos" }).getAttribute("aria-current")).toBe("page");
  });
});

