"use client";

import { AuthForm } from "@/features/auth/components/auth-form";
import { signUp } from "@/features/auth/service";

export default function Page() {
  return <AuthForm mode="register" action={signUp} />;
}
