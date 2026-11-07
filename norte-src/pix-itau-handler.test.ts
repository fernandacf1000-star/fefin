import { describe, expect, it, vi } from 'vitest';
import { createPixHandler } from '../supabase/functions/norte-pix-itau/handler.ts';

const notification = {
  title: 'Pix recebido',
  text: 'Você recebeu R$ 350,00 de MARIA, CPF XXX.000.000-XX.',
  notified_at: '2026-11-01T02:58:00.123Z',
};

function setup() {
  const ids = new Set<string>();
  const save = vi.fn<Parameters<typeof createPixHandler>[0]['save']>(async (row) => {
    if (ids.has(row.id)) return false;
    ids.add(row.id);
    return true;
  });
  const handler = createPixHandler({ secret: () => 'test-key', userId: 'test-user', save });
  const call = (body: Record<string, unknown>, key = 'test-key') => handler(new Request('https://example.test', {
    method: 'POST', headers: { 'x-sms-key': key }, body: JSON.stringify(body),
  }));
  return { call, save };
}

describe('Itaú Pix notification import', () => {
  it('stores the income on the local notification day, including at a month boundary, without the CPF', async () => {
    const { call, save } = setup();
    const response = await call(notification);
    expect(await response.json()).toMatchObject({ inserted: 1, data: '2026-10-31' });
    expect(save).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/), user_id: 'test-user', descricao: 'Pix recebido de MARIA',
      valor: 350, tipo: 'receita', categoria: 'receita', data: '2026-10-31', mes_referencia: '2026-10', pago: true,
    });
  });

  it('deduplicates the same instant across time zones and keeps distinct notifications', async () => {
    const { call } = setup();
    const responses = await Promise.all([
      call(notification),
      call({ ...notification, notified_at: '2026-10-31T23:58:00.123-03:00', text: 'Você recebeu R$ 350,00 de Maria' }),
    ]);
    expect(await Promise.all(responses.map((response) => response.json()))).toEqual(expect.arrayContaining([
      expect.objectContaining({ inserted: 1 }), { ok: true, duplicate: true },
    ]));
    const different = await call({ ...notification, notified_at: '2026-11-01T02:58:00.124Z' });
    expect(await different.json()).toMatchObject({ inserted: 1 });
  });

  it('handles multiline BRL with a thousands separator in a dry run', async () => {
    const { call, save } = setup();
    const response = await call({ ...notification, text: 'Você recebeu R$ 1.234,56 de\nEMPRESA, CNPJ XXX.', dry_run: true });
    expect(await response.json()).toMatchObject({ dry_run: true, descricao: 'Pix recebido de EMPRESA', valor: 1234.56 });
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects invalid or missing original dates and ignores unrelated notifications', async () => {
    const { call, save } = setup();
    expect((await call({ ...notification, notified_at: undefined })).status).toBe(422);
    expect((await call({ ...notification, notified_at: '2026-02-30T14:00:00-03:00' })).status).toBe(422);
    expect((await call({ ...notification, notified_at: '2026-11-01T02:58:00' })).status).toBe(422);
    expect((await call({ ...notification, text: 'Você recebeu R$ 0,00 de MARIA' })).status).toBe(422);
    expect(await (await call({ ...notification, title: 'Pix enviado' })).json()).toEqual({ ok: true, ignored: true });
    expect((await call(notification, 'wrong-key')).status).toBe(401);
    expect(save).not.toHaveBeenCalled();
  });
});
