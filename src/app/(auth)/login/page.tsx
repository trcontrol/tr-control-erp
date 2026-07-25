import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta para continuar
        </p>
      </div>
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
