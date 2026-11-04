import { AuthForm } from "@/components/auth-form";
import { requestPasswordReset } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" action={requestPasswordReset} />;
}
