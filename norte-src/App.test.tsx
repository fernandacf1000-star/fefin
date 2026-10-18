// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
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
  subcategoria: null,
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
  state.rows = [];
  state.calls = [];
  state.session = true;
  state.ai.mockReset();
  state.ai.mockResolvedValue({ data: null, error: { message: "offline" } });
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
afterEach(cleanup);
async function open() {
  render(<App />);
  await screen.findByRole("region", { name: "Resumo do mês" });
  fireEvent.click(screen.getByRole("button", { name: "Anotar" }));
}
describe("fluxos do Norte", () => {
  it("salva antes de classificar, mantém gasto se IA falha e desfaz", async () => {
    await open();
    fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
    fireEvent.change(screen.getByLabelText("Quanto foi? (R$)"), {
      target: { value: "45,50" },
    });
    fireEvent.change(screen.getByLabelText("Com o quê?"), {
      target: { value: "Café novo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar gasto" }));
    await screen.findByText("Gasto anotado.");
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    await screen.findByText("Café novo");
    expect(state.calls[0].kind).toBe("insert");
    await waitFor(() =>
      expect(
        screen
          .getByRole("combobox", { name: "Categoria do lançamento" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    expect(
      screen.getByRole("combobox", { name: "Categoria do lançamento" }).textContent,
    ).toContain("Escolher categoria");
    expect(state.rows[0].valor).toBe(45.5);
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    await waitFor(() => expect(state.rows).toHaveLength(0));
    expect(screen.queryByText("Café novo")).toBeNull();
  });
  it("memória vence IA e correção antes de salvar é preservada", async () => {
    state.rows = [
      entry({ data: "2026-01-01", created_at: "2026-01-01T12:00:00Z" }),
    ];
    state.ai.mockResolvedValue({
      data: {
        items: [
          { label: "Mercado", amount: 45, category: "Lazer", dayOffset: 0 },
        ],
      },
      error: null,
    });
    await open();
    fireEvent.change(screen.getByLabelText("O que você gastou?"), {
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
  it("trocar categoria atualiza todas as parcelas e altera o orçamento", async () => {
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
    await screen.findByRole("region", { name: "Resumo do mês" });
    fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Categoria do lançamento" }),
      { target: { value: "Pais" } },
    );
    await waitFor(() =>
      expect(state.rows.every((r) => r.subcategoria_pais === "Pais")).toBe(
        true,
      ),
    );
    expect(state.calls[0].body.ids).toEqual(["p1", "p2"]);
    await screen.findByText("Pais · fora da conta");
    expect(state.rows.every((r) => r.categoria_macro === "Alimentação")).toBe(
      true,
    );
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

it("mostra orçamento estourado com valor positivo e só os três totais", async () => {
  state.rows = [entry({ tipo: "receita", valor: 100 }), entry({ valor: 250 })];
  const { container } = render(<App />);
  const month = await screen.findByRole("region", { name: "Resumo do mês" });
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
  expect(screen.queryByText(/cartão hoje/)).toBeNull();
  expect(screen.queryByLabelText("Valor mensal (R$)")).toBeNull();
  const tabs = within(screen.getByRole("navigation")).getAllByRole("button");
  expect(tabs.map((b) => b.textContent)).toEqual([
    "Mês",
    "Gráfico",
    "Lançamentos",
  ]);
});
it("compartilha mês nas três abas e mantém Anotar com IA primeiro", async () => {
  render(<App />);
  await screen.findByRole("region", { name: "Resumo do mês" });
  const selector = screen.getByRole("group", { name: "Mês selecionado" });
  expect(within(selector).queryByRole("button", { name: "Hoje" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(screen.getByRole("heading", { name: "Previsto" })).toBeTruthy();
  expect(screen.getByText("Só o que já está lançado")).toBeTruthy();
  const selected = within(selector).getByText(/de \d{4}/).textContent;
  for (const tab of ["Gráfico", "Lançamentos", "Mês"]) {
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
    within(screen.getByRole("group", { name: "Mês selecionado" })).getByRole(
      "button",
      { name: "Hoje" },
    ),
  );
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
  await screen.findByRole("region", { name: "Resumo do mês" });
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
  await screen.findByRole("region", { name: "Resumo do mês" });
  fireEvent.click(screen.getByRole("button", { name: "Lançamentos" }));
  expect(
    screen.getAllByRole("button", { name: /Ver detalhes de/ }),
  ).toHaveLength(80);
  fireEvent.click(screen.getByRole("button", { name: "Ver mais" }));
  expect(
    screen.getAllByRole("button", { name: /Ver detalhes de/ }),
  ).toHaveLength(83);
  expect(screen.getByText("Pais · fora da conta")).toBeTruthy();
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
    within(detail).getByText("Somente esta parcela será apagada."),
  ).toBeTruthy();
  fireEvent.click(
    within(detail).getByRole("button", { name: "Confirmar exclusão" }),
  );
  await waitFor(() => expect(state.rows).toHaveLength(82));
  expect(state.rows.find((r) => r.id === "r9")).toBeUndefined();
  expect(state.rows.find((r) => r.id === "r8")).toBeTruthy();
});

it("Norte inicia vazio e envia à IA somente seu próprio histórico", async () => {
  render(<App />);
  const month = await screen.findByRole("region", { name: "Resumo do mês" });
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
        { label: "Mercado", amount: 10, category: "Alimentação", dayOffset: 0 },
      ],
    },
    error: null,
  });
  fireEvent.click(screen.getByRole("button", { name: "Anotar" }));
  fireEvent.change(screen.getByLabelText("O que você gastou?"), {
    target: { value: "10 mercado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Confira antes de anotar.");
  expect(state.ai.mock.calls[0][1].body.examples).toEqual([]);
});


it("anota receita por valor, soma só em Ganhou e permite desfazer", async () => {
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Receita" }));
  expect(screen.getByRole("tab", { name: "Texto com IA" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "Valor" }));
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

it("receita com IA mantém categorias ajustáveis e memória, sem cartão", async () => {
  state.rows = [entry({ descricao: "Venda", categoria_macro: "Pessoal", data: "2026-01-01" })];
  state.ai.mockResolvedValue({ data: { items: [
    { amount: 300, label: "Venda", category: "Lazer", dayOffset: 0 },
    { amount: 100, label: "Reembolso mãe", category: "Pessoal", dayOffset: 0 },
  ] }, error: null });
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Receita" }));
  fireEvent.change(screen.getByLabelText("O que você recebeu?"), { target: { value: "300 venda e 100 reembolso mãe" } });
  fireEvent.click(screen.getByRole("button", { name: "Entender texto" }));
  await screen.findByText("Confira antes de anotar.");
  expect(state.ai.mock.calls[0][1].body.kind).toBe("receita");
  const selects = within(screen.getByRole("dialog")).getAllByRole("combobox", { name: "Categoria do lançamento" });
  expect((selects[0] as HTMLSelectElement).value).toBe("Pessoal");
  fireEvent.change(selects[0], { target: { value: "Moradia" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar receitas" }));
  await screen.findByText("Receitas anotadas.");
  expect(state.rows[0]).toMatchObject({ tipo: "receita", categoria_macro: "Moradia", cartao_id: null });
  expect(state.rows[1]).toMatchObject({ tipo: "receita", categoria: "reembolso_pais", subcategoria_pais: "Pais" });
  expect(screen.getByRole("region", { name: "Resumo do mês" }).querySelector(".big-number")?.textContent).toMatch(/300,00/);
});
