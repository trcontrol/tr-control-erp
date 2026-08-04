import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Cadastro",
};

/** Cadastro público desabilitado — acesso apenas por contratação. */
export default function RegisterPage() {
  redirect(ROUTES.login);
}
