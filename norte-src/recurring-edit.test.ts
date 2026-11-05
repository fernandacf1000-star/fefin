import { describe, expect, it } from "vitest";
import { convertToRecurringIncome } from "./recurring-edit";
import type { Entry } from "./domain";
const row: Entry = {
  id: "12345678-1234-4123-8123-123456789abc", user_id: "user", descricao: "Salário", valor: 5000,
  tipo: "receita", categoria: "receita", categoria_macro: "Pessoal", subcategoria: "Presentes",
  subcategoria_pais: null, data: "2026-12-31", mes_referencia: "2026-12", forma_pagamento: "dinheiro",
  cartao_id: null, pago: true, pago_por: "voce", is_parcelado: false,
  parcela_atual: null, parcela_total: null, parcelamento_id: null,
};
describe("conversão de receita em recorrente", () => {
  it("preserva o original, usa IDs estáveis e ajusta meses curtos sem dividir o valor", async () => {
    const first = await convertToRecurringIncome(row, {}, { day: 31, months: 4 });
    expect(first).toEqual(await convertToRecurringIncome(row, {}, { day: 31, months: 4 }));
    expect(first.map((r) => r.data)).toEqual(["2026-12-31", "2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(first[0].id).toBe(row.id);
    expect(new Set(first.map((r) => r.id)).size).toBe(4);
    expect(first.map((r) => r.pago)).toEqual([true, false, false, false]);
    expect(first.every((r) => r.valor === 5000 && r.recorrencia_id === row.id && r.user_id === row.user_id)).toBe(true);
  });
  it("reconhece salário legado como receita e respeita a nova data inicial", async () => {
    const series = await convertToRecurringIncome({ ...row, tipo: "despesa", categoria: "salario" }, { data: "2027-02-05", valor: 6000 }, { day: 5, months: 2 });
    expect(series.map((r) => r.data)).toEqual(["2027-02-05", "2027-03-05"]);
    expect(series.every((r) => r.tipo === "receita" && r.valor === 6000 && !r.cartao_id)).toBe(true);
  });
  it("recusa séries existentes, despesas, datas e quantidades inválidas", async () => {
    for (const patch of [{ recorrencia_id: "series" }, { is_parcelado: true }, { tipo: "despesa" as const }])
      await expect(convertToRecurringIncome({ ...row, ...patch }, {}, { day: 5, months: 2 })).rejects.toThrow();
    for (const recurrence of [{ day: 0, months: 2 }, { day: 32, months: 2 }, { day: 5, months: 1 }, { day: 5, months: 37 }])
      await expect(convertToRecurringIncome(row, {}, recurrence)).rejects.toThrow();
    await expect(convertToRecurringIncome(row, { data: "2027-02-30" }, { day: 5, months: 2 })).rejects.toThrow("Data inválida");
  });
});
