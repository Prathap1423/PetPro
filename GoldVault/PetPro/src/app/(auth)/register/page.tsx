import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/app/actions/auth";

export default function RegisterPage() {
  return <AuthForm mode="register" action={signUp} />;
}
