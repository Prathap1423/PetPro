"use client";

import { AuthForm } from "@/features/auth/components/auth-form";
import { requestPasswordReset } from "@/features/auth/service";

export default function Page() {
  return <AuthForm mode="forgot" action={requestPasswordReset} />;
}
