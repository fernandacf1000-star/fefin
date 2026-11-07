import { normalize } from '../_shared/norte.ts';

type PixRow = {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  tipo: 'receita';
  categoria: 'receita';
  data: string;
  mes_referencia: string;
  pago: true;
};

type Dependencies = {
  secret: () => string | undefined;
  userId: string;
  save: (row: PixRow) => Promise<boolean>;
};

const json = (body: unknown, status = 200) => Response.json(body, { status });
const saoPauloDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});

function notificationDate(value: unknown): Date | null {
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

async function notificationId(userId: string, received: Date, cents: number, sender: string) {
  const key = JSON.stringify(['norte-pix-itau', userId, received.toISOString(), cents, normalize(sender)]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function createPixHandler(deps: Dependencies) {
  return async (req: Request) => {
    if (req.method !== 'POST') return json({ error: 'use POST' }, 405);
    const secret = deps.secret();
    if (!secret || req.headers.get('x-sms-key') !== secret) return json({ error: 'unauthorized' }, 401);

    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'JSON inválido.' }, 400);
    const { title, text, notified_at, dry_run } = body as Record<string, unknown>;
    if (typeof title !== 'string' || typeof text !== 'string') return json({ error: 'Envie o título e o corpo da notificação.' }, 400);
    if (normalize(title) !== 'pix recebido') return json({ ok: true, ignored: true });

    const cleanText = text.split(/(?:\s*[,;]\s*|\s+)(?:CPF|CNPJ)\b/iu, 1)[0].replace(/\s+/g, ' ').trim();
    const match = /^voc[eê] recebeu R\$\s*(\d{1,12}|\d{1,3}(?:\.\d{3}){1,3}),(\d{2}) de (.+)$/iu.exec(cleanText);
    const sender = match?.[3].replace(/[.,;]+$/, '').trim();
    if (!match || !sender || sender.length > 200) return json({ error: 'Formato de Pix recebido não reconhecido.' }, 422);
    const cents = Number(match[1].replaceAll('.', '') + match[2]);
    if (cents <= 0) return json({ error: 'Valor do Pix inválido.' }, 422);
    const received = notificationDate(notified_at);
    if (!received) return json({ error: 'Envie a data original da notificação em ISO 8601 com fuso horário.' }, 422);

    const data = saoPauloDate.format(received);
    const row: PixRow = {
      id: await notificationId(deps.userId, received, cents, sender),
      user_id: deps.userId,
      descricao: `Pix recebido de ${sender}`,
      valor: cents / 100,
      tipo: 'receita',
      categoria: 'receita',
      data,
      mes_referencia: data.slice(0, 7),
      pago: true,
    };
    const result = { ok: true, descricao: row.descricao, valor: row.valor, data: row.data, tipo: row.tipo };
    if (dry_run === true) return json({ ...result, dry_run: true });
    try {
      const inserted = await deps.save(row);
      return json(inserted ? { ...result, inserted: 1 } : { ok: true, duplicate: true });
    } catch {
      return json({ error: 'Não consegui gravar o Pix. Reenvie a notificação com a data original.' }, 503);
    }
  };
}
