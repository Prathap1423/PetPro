/**
 * Supabase project settings. Both values are public by design (the browser uses them);
 * row level security in supabase/schema.sql is what keeps each user's data private.
 * Never put the service_role / secret key here.
 */
export const SUPABASE_URL = "https://pgumuqgirbmycttdvbsl.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Uf4Nby3PTvVAa-8WTNMXig_6Oi0ooU5";

/** Sub-path the site is served from ("/site" on Slate), so auth emails link back correctly. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
