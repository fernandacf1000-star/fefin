import { dateKey, parseDate, recurringRows } from "./domain";
import type { Entry } from "./domain";

// Reuse the original row and deterministic IDs so a retry cannot duplicate income.
export async function convertToRecurringIncome(row: Entry, patch: Record<string, unknown>, recurrence: { day: number; months: number }): Promise<Entry[]> {
  if (row.is_parcelado || row.parcelamento_id || row.recorrencia_id || !(row.tipo === "receita" || ["salario", "reembolso_pais"].includes(row.categoria)))
    throw new Error("Escolha uma receita única para repetir todo mês.");
  const { day, months } = recurrence;
  if (!Number.isInteger(day) || day < 1 || day > 31 || !Number.isInteger(months) || months < 2 || months > 36)
    throw new Error("Preencha dia (1 a 31) e meses (2 a 36).");
  const source = { ...row, ...patch, tipo: "receita" as const };
  const start = parseDate(source.data);
  if (Number.isNaN(start.getTime()) || dateKey(start) !== source.data) throw new Error("Data inválida");
  if (!Number.isFinite(source.valor) || source.valor <= 0) throw new Error("Informe um valor maior que zero.");
  const payload = recurringRows(source, source.valor, start, day, months, row.id);
  return Promise.all(payload.map(async (item, index) => {
    let id = row.id;
    if (index > 0) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`norte:recurring:${row.id}:${index}`));
      const bytes = new Uint8Array(digest).slice(0, 16);
      bytes[6] = (bytes[6] & 15) | 80;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
      id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    return { ...item, id, user_id: row.user_id, pago: index === 0 ? row.pago : false } as Entry;
  }));
}
