import { createClient } from 'npm:@supabase/supabase-js@2.98.0';
import { createPixHandler } from './handler.ts';

const USER_ID = '3b2ffd9c-6122-4128-9474-9bf796410e94';
const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(createPixHandler({
  secret: () => Deno.env.get('SMS_SECRET'),
  userId: USER_ID,
  save: async (row) => {
    // The notification's stable primary key makes concurrent retries safe.
    const { data, error } = await client.from('norte_lancamentos')
      .upsert(row, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (error) throw error;
    return data.length === 1;
  },
}));
