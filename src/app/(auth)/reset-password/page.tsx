import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: "Redefinir senha",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Escolha uma nova senha para continuar
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
