import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only client using the service role key — bypasses RLS entirely.
// Never import this in client components or expose it to the browser.
//
// The client is created lazily on first use (not at module load) so that
// `next build` can collect page data for these routes even when the env vars
// aren't present in the build environment. The env vars are only required at
// request time, when a route actually touches the database.

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
if (!client) {
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
throw new Error(
'Supabase service role is not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
);
}
client = createClient(url, key);
}
return client;
}

// Proxy preserves the `supabaseAdmin.from(...)` call sites while deferring
// instantiation until the first property access at request time.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
get(_target, prop) {
const c = getClient();
const value = (c as any)[prop];
return typeof value === 'function' ? value.bind(c) : value;
},
});