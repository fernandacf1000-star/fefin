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
      if (this.table === "cartoes")
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
      if (this.table === "profiles")
        return Promise.resolve({
          data: { meta_mensal: 1000 },
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
      from: (t: string) => new Query(t),
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
  await screen.findByText("Anotado hoje");
  fireEvent.click(screen.getByRole("button", { name: /Anotar gasto/ }));
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
    await screen.findByText("Café novo");
    expect(state.calls[0].kind).toBe("insert");
    await waitFor(() =>
      expect(
        screen
          .getByRole("combobox", { name: "Categoria do gasto" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    expect(
      screen.getByRole("combobox", { name: "Categoria do gasto" }).textContent,
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
      name: "Categoria do gasto",
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
    await screen.findByText("Anotado hoje");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Categoria do gasto" }),
      { target: { value: "Pais" } },
    );
    await waitFor(() =>
      expect(state.rows.every((r) => r.subcategoria_pais === "Pais")).toBe(
        true,
      ),
    );
    expect(state.calls[0].body.ids).toEqual(["p1", "p2"]);
    await screen.findByText("Reembolsado");
    expect(state.rows.every((r) => r.categoria_macro === "Alimentação")).toBe(
      true,
    );
  });
  it("revisão semanal persiste no aparelho e reaparece", async () => {
    render(<App />);
    await screen.findByText("Anotado hoje");
    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    fireEvent.click(screen.getByRole("button", { name: "Já olhei" }));
    expect(
      screen
        .getByRole("button", { name: "✓ Semana revisada" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(localStorage.getItem("norte-review-u")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
  it("sem sessão mostra apenas o login", async () => {
    state.session = false;
    render(<App />);
    await screen.findByRole("button", { name: "Entrar" });
    expect(screen.queryByText("Anotado hoje")).toBeNull();
    expect(screen.getByLabelText("Senha").getAttribute("type")).toBe(
      "password",
    );
  });
});
