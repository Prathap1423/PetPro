"use client";

import { AuthForm } from "@/features/auth/components/auth-form";
import { updatePassword } from "@/features/auth/service";

export default function Page() {
  return <AuthForm mode="reset" action={updatePassword} />;
}
