import { createClient } from "npm:@supabase/supabase-js@2.98.0";
import { createHandler } from "./handler.ts";

Deno.serve(createHandler({
  env: (name) => Deno.env.get(name),
  fetch,
  authenticate: async (token) => {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await sb.auth.getUser(token);
    return !error && Boolean(data.user);
  },
  log: (entry) => console.error(JSON.stringify(entry)),
}));
