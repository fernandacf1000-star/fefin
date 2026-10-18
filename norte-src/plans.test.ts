import { describe, it, expect } from "vitest";
import {
  splitInstallments,
  isInstallmentCount,
  MAX_INSTALLMENTS,
  installmentRows,
  recurringRows,
  recurringDates,
  groupScope,
  monthSpending,
  monthIncome,
  dateKey,
  Entry,
  Card,
} from "./domain";

const sum = (a: number[]) => a.reduce((s, v) => s + Math.round(v * 100), 0) / 100;
const base = {
  user_id: "u",
  descricao: "Geladeira",
  tipo: "despesa" as const,
  categoria: "despesa",
  categoria_macro: "Moradia",
  subcategoria_pais: null,
};
const master: Card = { id: "m", nome: "Master", dia_fechamento: 22, dia_vencimento: 1, ativo: true };
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
const asEntries = (rows: Record<string, unknown>[]) =>
  rows.map((r, i) => ({ id: `id${i}`, created_at: `2026-10-18T10:00:0${i % 10}Z`, ...r })) as unknown as Entry[];

describe("splitInstallments", () => {
  it("100 em 3 = 33,33 + 33,33 + 33,34", () => {
    expect(splitInstallments(100, 3)).toEqual([33.33, 33.33, 33.34]);
  });
  it("1000 em 12 e 0,10 em 3 somam exatamente o total", () => {
    expect(sum(splitInstallments(1000, 12))).toBe(1000);
    expect(splitInstallments(0.1, 3)).toEqual([0.03, 0.03, 0.04]);
    expect(sum(splitInstallments(0.1, 3))).toBe(0.1);
  });
  it("valor inválido ou parcelas inválidas retornam vazio", () => {
    expect(splitInstallments(0, 3)).toEqual([]);
    expect(splitInstallments(-5, 3)).toEqual([]);
    expect(splitInstallments(100, 0)).toEqual([]);
    expect(splitInstallments(NaN, 3)).toEqual([]);
  });
  it("aceita compras longas sem tentar criar listas ilimitadas", () => {
    expect(isInstallmentCount(60)).toBe(true);
    expect(splitInstallments(360, MAX_INSTALLMENTS)).toHaveLength(MAX_INSTALLMENTS);
    expect(isInstallmentCount(MAX_INSTALLMENTS + 1)).toBe(false);
    expect(splitInstallments(100, MAX_INSTALLMENTS + 1)).toEqual([]);
  });
});

describe("installmentRows", () => {
  it("cartão: mesma data, fatura avança um mês por parcela, virando o ano", () => {
    const rows = installmentRows(base, 1200, 4, at(2026, 11, 10), master, "g");
    expect(rows.map((r) => r.valor)).toEqual([300, 300, 300, 300]);
    expect(rows.every((r) => r.data === "2026-11-10")).toBe(true);
    expect(rows.map((r) => r.mes_referencia)).toEqual(["2026-12", "2027-01", "2027-02", "2027-03"]);
    expect(rows.map((r) => r.parcela_atual)).toEqual([1, 2, 3, 4]);
    expect(rows.every((r) => r.is_parcelado && r.parcela_total === 4 && r.parcelamento_id === "g")).toBe(true);
    expect(rows.every((r) => r.forma_pagamento === "credito" && r.cartao_id === "m")).toBe(true);
  });
  it("Pix/dinheiro: mês de referência mensal a partir da data", () => {
    const rows = installmentRows(base, 90, 3, at(2026, 10, 18), null, "g");
    expect(rows.map((r) => r.mes_referencia)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(rows.every((r) => r.forma_pagamento === "dinheiro" && r.cartao_id === null && r.pago)).toBe(true);
  });
  it("cada parcela cai no mês certo e o total não é contado duas vezes", () => {
    const rows = asEntries(installmentRows(base, 1000, 3, at(2026, 10, 18), null, "g"));
    expect(monthSpending(rows, at(2026, 10, 1))).toBe(333.33);
    expect(monthSpending(rows, at(2026, 11, 1))).toBe(333.33);
    expect(monthSpending(rows, at(2026, 12, 1))).toBe(333.34);
    expect(monthSpending(rows, at(2027, 1, 1))).toBe(0);
  });
  it("uma parcela só não vira parcelamento", () => {
    const [r] = installmentRows(base, 50, 1, at(2026, 10, 18), null, "g");
    expect(r.is_parcelado).toBe(false);
    expect(r.parcelamento_id).toBeNull();
  });
});

describe("recorrentes", () => {
  it("dia 31 usa o último dia em meses curtos", () => {
    expect(recurringDates(at(2027, 1, 5), 31, 3).map(dateKey)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(recurringDates(at(2028, 1, 5), 31, 2).map(dateKey)).toEqual(["2028-01-31", "2028-02-29"]);
  });
  it("vira o ano e agrupa pelo mesmo recorrencia_id", () => {
    const rows = recurringRows(base, 150, at(2026, 11, 3), 10, 3, "r");
    expect(rows.map((r) => r.data)).toEqual(["2026-11-10", "2026-12-10", "2027-01-10"]);
    expect(rows.every((r) => r.recorrencia_id === "r" && !r.is_parcelado)).toBe(true);
    expect(rows.map((r) => r.mes_referencia)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
  it("conta uma vez por mês nos gastos; receita recorrente conta como receita", () => {
    const exp = asEntries(recurringRows(base, 150, at(2026, 10, 3), 10, 3, "r"));
    expect(monthSpending(exp, at(2026, 11, 1))).toBe(150);
    const inc = asEntries(
      recurringRows({ ...base, tipo: "receita" as never, categoria: "receita", categoria_macro: null }, 5000, at(2026, 10, 3), 5, 3, "i"),
    );
    expect(monthIncome(inc, at(2026, 12, 1))).toBe(5000);
  });
  it("valor inválido não gera linhas", () => {
    expect(recurringRows(base, 0, at(2026, 10, 3), 10, 3, "r")).toEqual([]);
  });
});

describe("groupScope (apagar)", () => {
  const rows = asEntries(installmentRows(base, 500, 5, at(2026, 10, 18), null, "g"));
  const other = asEntries([{ ...installmentRows(base, 10, 1, at(2026, 10, 18), null, "x")[0], id: "solo" }]).map((r) => ({ ...r, id: "solo" }));
  const all = [...rows, ...other];
  it("só este", () => {
    expect(groupScope(all, rows[2], "one").map((r) => r.id)).toEqual(["id2"]);
  });
  it("este e os próximos", () => {
    expect(groupScope(all, rows[2], "next").map((r) => r.parcela_atual).sort()).toEqual([3, 4, 5]);
  });
  it("todos do grupo, sem tocar em outros", () => {
    const got = groupScope(all, rows[0], "all");
    expect(got).toHaveLength(5);
    expect(got.some((r) => r.id === "solo")).toBe(false);
  });
  it("recorrência: este e os próximos por data", () => {
    const rec = asEntries(recurringRows(base, 100, at(2026, 10, 1), 5, 4, "r"));
    expect(groupScope(rec, rec[1], "next").map((r) => r.data)).toEqual(["2026-11-05", "2026-12-05", "2027-01-05"]);
  });
  it("lançamento avulso só apaga a si mesmo", () => {
    expect(groupScope(all, other[0], "all").map((r) => r.id)).toEqual(["solo"]);
  });
});
