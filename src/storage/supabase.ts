"use client";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config";

/** One shared client; the signed-in session is kept in localStorage. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** The signed-in user's id. Throws when signed out (the app layout redirects before this happens). */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Please sign in again.");
  return id;
}

/** Throws a readable error for a failed Supabase call; returns the data otherwise. */
export function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Like must, for queries returning a list. */
export function rowsOf<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  return must(res) ?? [];
}
