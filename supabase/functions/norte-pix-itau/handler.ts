import { notificationDate, notificationId, saoPauloDate } from '../_shared/notification.ts';
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
      id: await notificationId(['norte-pix-itau', deps.userId, received.toISOString(), cents, normalize(sender)]),
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
