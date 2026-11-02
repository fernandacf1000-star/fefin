// Digits are entered as cents, so the decimal separator is always automatic.
export function formatMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = digits.replace(/^0+/, "").padStart(3, "0");
  const reais = cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${reais},${cents.slice(-2)}`;
}
