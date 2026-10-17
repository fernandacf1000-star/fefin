export type CardCycle = { id: string; nome: string; dia_fechamento: number; dia_vencimento: number };
export function monthRef(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function dayInMonth(year: number, month: number, day: number) {
  return new Date(year, month, Math.min(day, new Date(year, month+1, 0).getDate()), 12);
}
export function paymentDate(card: CardCycle, purchase: Date) {
  if (![card.dia_fechamento, card.dia_vencimento].every(d => Number.isInteger(d) && d >= 1 && d <= 31)) return null;
  const date = new Date(purchase.getFullYear(), purchase.getMonth(), purchase.getDate(), 12);
  let close = dayInMonth(date.getFullYear(), date.getMonth(), card.dia_fechamento);
  if (date > close) close = dayInMonth(date.getFullYear(), date.getMonth()+1, card.dia_fechamento);
  let due = dayInMonth(close.getFullYear(), close.getMonth(), card.dia_vencimento);
  if (due <= close) due = dayInMonth(close.getFullYear(), close.getMonth()+1, card.dia_vencimento);
  return due;
}
export function bestCard(cards: CardCycle[], date: Date) {
  return cards.map(card => ({card, due: paymentDate(card, date)}))
    .filter((x): x is {card: CardCycle; due: Date} => x.due !== null)
    .sort((a,b) => b.due.getTime()-a.due.getTime())[0] || null;
}
export function installmentValues(total: number, count: number) {
  const cents = Math.round(total*100);
  if (!Number.isFinite(total) || cents <= 0 || !Number.isInteger(count) || count < 1 || count > 48 || cents < count) throw new Error('Confira o valor e o número de parcelas.');
  const base = Math.floor(cents/count);
  return Array.from({length: count}, (_,i) => (base+(i<cents%count?1:0))/100);
}
