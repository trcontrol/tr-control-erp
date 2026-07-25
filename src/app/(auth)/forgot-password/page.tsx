import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: "Recuperar senha",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Recupere o acesso à sua conta
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
