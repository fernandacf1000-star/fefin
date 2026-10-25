import { addMonths, cardDates, dateKey, isInstallmentCount, monthKey, parseDate, splitInstallments } from "./domain";
import type { Card, Entry } from "./domain";

// Stable IDs make retries replace the same installments instead of duplicating them.
async function installmentId(id: string, index: number) {
  if (index === 0) return id;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`norte:installment:${id}:${index}`));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function convertToInstallments(row: Entry, patch: Record<string, unknown>, total: number, count: number, cards: Card[]): Promise<Entry[]> {
  if (row.is_parcelado || row.parcelamento_id || row.recorrencia_id || row.tipo !== "despesa" || ["salario", "reembolso_pais"].includes(row.categoria))
    throw new Error("Escolha um gasto único para parcelar.");
  if (!isInstallmentCount(count)) throw new Error("Informe de 2 a 360 parcelas.");
  const parts = splitInstallments(total, count);
  if (!parts.length || parts.some((value) => value <= 0)) throw new Error("Cada parcela precisa ter pelo menos R$ 0,01.");
  const purchaseDate = String(patch.data ?? row.data);
  const purchase = parseDate(purchaseDate);
  if (Number.isNaN(purchase.getTime()) || dateKey(purchase) !== purchaseDate) throw new Error("Data inválida");
  const card = cards.find((candidate) => candidate.id === row.cartao_id);
  if (purchaseDate !== row.data && row.cartao_id && !card) throw new Error("Cartão indisponível para recalcular a fatura.");
  const firstMonth = purchaseDate === row.data ? row.mes_referencia
    : card ? cardDates(card, purchase).reference : monthKey(purchase);
  return Promise.all(parts.map(async (valor, index) => ({
    ...row, ...patch,
    id: await installmentId(row.id, index),
    user_id: row.user_id,
    valor,
    data: purchaseDate,
    mes_referencia: monthKey(addMonths(parseDate(firstMonth + "-01"), index)),
    is_parcelado: true,
    parcela_atual: index + 1,
    parcela_total: count,
    parcelamento_id: row.id,
    recorrencia_id: null,
  } as Entry)));
}
