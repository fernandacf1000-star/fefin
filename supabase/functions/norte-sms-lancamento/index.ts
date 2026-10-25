import { createClient } from 'npm:@supabase/supabase-js@2.98.0';
import { createHandler } from '../norte-ai/handler.ts';
import { createSmsHandler } from './handler.ts';
import type { Entry } from '../_shared/norte.ts';

const USER_ID = '3b2ffd9c-6122-4128-9474-9bf796410e94';
const env = (name: string) => Deno.env.get(name);
// Called only in-process, after the webhook has authenticated x-sms-key.
// The public norte-ai endpoint retains its independent JWT authentication.
const classify = createHandler({ env, fetch, authenticate: async () => true,
  log: (entry) => console.error(JSON.stringify(entry)) });
const client = () => createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(createSmsHandler({
  secret: () => env('SMS_SECRET'), userId: USER_ID,
  history: async () => {
    const sb = client();
    const history: Entry[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await sb.from('norte_lancamentos').select('*').eq('user_id', USER_ID)
        .order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
      if (error) throw error;
      history.push(...data as Entry[]);
      if (data.length < 1000) return history;
    }
  },
  save: async (rows) => {
    const { error } = await client().from('norte_lancamentos').insert(rows);
    if (error) throw error;
  },
  ask: async (body) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await classify(new Request('https://internal.invalid/classify', { method: 'POST',
        headers: { Authorization: 'Bearer internal-sms', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
      const result = await response.json();
      if (response.ok) return result;
      if (attempt === 1 || result.code !== 'provider_unavailable') throw new Error('classification_failed');
    }
    throw new Error('classification_failed');
  },
}));
