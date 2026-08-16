import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--brand-navy)]/8 bg-white p-8 text-center text-sm text-[var(--brand-navy-mid)]/70 shadow-[var(--shadow-card)]">
            Carregando...
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
