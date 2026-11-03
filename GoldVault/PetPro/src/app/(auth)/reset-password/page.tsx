import { AuthForm } from "@/components/auth-form";
import { updatePassword } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" action={updatePassword} />;
}
