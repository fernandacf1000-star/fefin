export const saoPauloDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function notificationDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const iso = value.trim();
  const parts = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(iso);
  if (!parts) return null;
  const midnight = new Date(`${parts[1]}T00:00:00Z`);
  const received = new Date(iso);
  if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== parts[1] ||
      !Number.isFinite(received.getTime())) return null;
  return received;
}

export async function notificationId(parts: readonly (string | number)[]) {
  const key = JSON.stringify(parts);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
