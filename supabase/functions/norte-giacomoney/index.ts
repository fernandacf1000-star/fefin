import { createClient } from 'npm:@supabase/supabase-js@2.98.0';
import { createHandler } from '../norte-ai/handler.ts';
import { createGiacoHandler } from './handler.ts';
import type { Entry } from '../_shared/norte.ts';

const USER_ID = '3b2ffd9c-6122-4128-9474-9bf796410e94';
const env = (name: string) => Deno.env.get(name);
const sb = createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!);
const classify = createHandler({env, fetch, authenticate: async () => true, log: entry => console.error(JSON.stringify(entry))});
Deno.serve(createGiacoHandler({
  secret: () => env('GIACOMONEY_INTEGRATION_KEY'), userId: USER_ID,
  exists: async id => {
    const {data, error} = await sb.from('norte_lancamentos').select('id').eq('user_id', USER_ID).eq('id', id).maybeSingle();
    if (error) throw error;
    return !!data;
  },
  history: async () => {
    const rows: Entry[] = [];
    for (let offset = 0; ; offset += 1000) {
      const {data, error} = await sb.from('norte_lancamentos').select('*').eq('user_id', USER_ID)
        .order('created_at', {ascending: false}).order('id').range(offset, offset + 999);
      if (error) throw error;
      rows.push(...data as Entry[]);
      if (data.length < 1000) return rows;
    }
  },
  save: async row => {
    // ON CONFLICT DO NOTHING preserves user edits on retry; no overwrite.
    const {error} = await sb.from('norte_lancamentos').upsert(row, {onConflict: 'id', ignoreDuplicates: true});
    if (error) throw error;
  },
  ask: async body => {
    const response = await classify(new Request('https://internal.invalid/classify', {method: 'POST',
      headers: {Authorization: 'Bearer internal-giacomoney', 'Content-Type': 'application/json'}, body: JSON.stringify(body)}));
    if (!response.ok) throw Error('classification_failed');
    return response.json();
  },
}));
