"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { AuthState } from "@/app/actions/auth";

type Mode = "login" | "register" | "forgot" | "reset";
type Action = (s: AuthState, f: FormData) => Promise<AuthState>;

const copy: Record<Mode, { title: string; cta: string }> = {
  login: { title: "Welcome back", cta: "Sign in" },
  register: { title: "Create your vault", cta: "Create account" },
  forgot: { title: "Reset password", cta: "Send reset link" },
  reset: { title: "Choose a new password", cta: "Update password" },
};

export function AuthForm({ mode, action }: { mode: Mode; action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { title, cta } = copy[mode];
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="gold-gradient mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-gold-foreground shadow"><Gem className="h-7 w-7" /></span>
          <h1 className="font-serif text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">My Gold Vault — your private jewellery locker</p>
        </div>
        <Card>
          <CardContent className="pt-4">
            <form action={formAction} className="space-y-4" noValidate>
              {mode === "register" && (
                <Field label="Your name"><Input name="display_name" autoComplete="name" maxLength={60} /></Field>
              )}
              {mode !== "reset" && (
                <Field label="Email"><Input name="email" type="email" autoComplete="email" required inputMode="email" /></Field>
              )}
              {mode !== "forgot" && (
                <Field label={mode === "reset" ? "New password" : "Password"} hint={mode !== "login" ? "At least 8 characters" : undefined}>
                  <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
                </Field>
              )}
              {mode === "reset" && (
                <Field label="Confirm password"><Input name="confirm" type="password" autoComplete="new-password" required minLength={8} /></Field>
              )}
              {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
              {state?.message && <p role="status" className="text-sm text-success">{state.message}</p>}
              <Button type="submit" className="w-full" disabled={pending}>{pending ? "Please wait…" : cta}</Button>
            </form>
            <div className="mt-4 space-y-1 text-center text-sm">
              {mode === "login" && (<>
                <p><Link className="text-gold underline" href="/forgot-password">Forgot password?</Link></p>
                <p className="text-muted-foreground">New here? <Link className="text-gold underline" href="/register">Create an account</Link></p>
              </>)}
              {mode !== "login" && mode !== "reset" && (
                <p className="text-muted-foreground">Back to <Link className="text-gold underline" href="/login">sign in</Link></p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
