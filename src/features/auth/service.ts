"use client";

import { BASE_PATH } from "@/config";
import { credentialsSchema } from "@/domain/schemas";
import { supabase } from "@/storage/supabase";

/** `done` tells the form to continue to the dashboard. */
export type AuthState = { error?: string; message?: string; done?: boolean } | undefined;

/** Where links in auth emails send the user back to. */
const siteUrl = (path: string) => `${window.location.origin}${BASE_PATH}${path}`;

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message === "Email not confirmed" ? "Confirm your email first — check your inbox." : "Invalid email or password" };
  return { done: true };
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data, error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo: siteUrl("/dashboard/") } });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Check your email and click the link to confirm your account." };
  return { done: true };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = credentialsSchema.shape.email.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email" };
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: siteUrl("/reset-password/") });
  // Always the same answer, so nobody can find out which emails have accounts.
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 72) return { error: "Password must be 8–72 characters" };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Passwords do not match" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes("session") ? "This reset link has expired. Request a new one." : error.message };
  return { done: true };
}

export async function signOut() {
  await supabase.auth.signOut();
}
