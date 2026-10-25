import { describe, expect, it } from "vitest";
import { convertToInstallments } from "./installment-edit";
import type { Entry } from "./domain";
const row: Entry = {
  id: "12345678-1234-4123-8123-123456789abc", user_id: "user", descricao: "Compra", valor: 100,
  tipo: "despesa", categoria: "despesa", categoria_macro: "Alimentação", subcategoria: "Supermercado",
  subcategoria_pais: null, data: "2026-10-25", mes_referencia: "2026-12", forma_pagamento: "credito",
  cartao_id: "card", pago: false, pago_por: "voce", is_parcelado: false,
  parcela_atual: null, parcela_total: null, parcelamento_id: null,
};
const cards = [{ id: "card", nome: "Master", dia_fechamento: 22, dia_vencimento: 1, ativo: true }];
describe("conversão de gasto em parcelas", () => {
  it("preserva fatura importada e usa IDs estáveis em tentativas repetidas", async () => {
    const first = await convertToInstallments(row, {}, 100, 3, cards);
    const retry = await convertToInstallments(row, {}, 100, 3, cards);
    expect(first).toEqual(retry);
    expect(first.map((part) => part.mes_referencia)).toEqual(["2026-12", "2027-01", "2027-02"]);
    expect(first[0].id).toBe(row.id);
    expect(new Set(first.map((part) => part.id)).size).toBe(3);
    expect(first.map((part) => part.valor)).toEqual([33.33, 33.33, 33.34]);
  });
  it("recalcula a primeira fatura quando a data da compra muda", async () => {
    const parts = await convertToInstallments(row, { data: "2026-10-01" }, 100, 2, cards);
    expect(parts.map((part) => part.mes_referencia)).toEqual(["2026-11", "2026-12"]);
  });
  it("distribui gasto em dinheiro pelos meses sem mudar o pagamento", async () => {
    const parts = await convertToInstallments({ ...row, cartao_id: null, forma_pagamento: "dinheiro", mes_referencia: "2026-10", pago: true }, {}, 100, 2, cards);
    expect(parts.map((part) => part.mes_referencia)).toEqual(["2026-10", "2026-11"]);
    expect(parts.every((part) => part.cartao_id === null && part.pago)).toBe(true);
  });
  it("recusa receitas, séries existentes e data inválida", async () => {
    for (const patch of [{ tipo: "receita" }, { recorrencia_id: "series" }, { is_parcelado: true }])
      await expect(convertToInstallments({ ...row, ...patch }, {}, 100, 2, cards)).rejects.toThrow();
    await expect(convertToInstallments(row, { data: "2026-02-30" }, 100, 2, cards)).rejects.toThrow("Data inválida");
  });
});
