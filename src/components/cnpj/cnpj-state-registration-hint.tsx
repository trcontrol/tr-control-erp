import { CNPJ_MESSAGES } from "@/lib/cnpj/messages";

export function CnpjStateRegistrationHint() {
  return (
    <p className="text-xs text-muted-foreground">
      {CNPJ_MESSAGES.stateRegistrationMissing}
    </p>
  );
}
