"use client";

import { AuthForm } from "@/features/auth/components/auth-form";
import { signIn } from "@/features/auth/service";

export default function Page() {
  return <AuthForm mode="login" action={signIn} />;
}
