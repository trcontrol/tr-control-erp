import { CashFlowBoard } from "@/components/cash-flow/cash-flow-board";
import { CashFlowPageShell } from "@/components/cash-flow/cash-flow-page-shell";

export const metadata = {
  title: "Fluxo de Caixa",
};

export default function CashFlowPage() {
  return (
    <CashFlowPageShell
      title="Fluxo de Caixa"
      description="Visão consolidada das entradas e saídas da empresa ativa"
    >
      <CashFlowBoard />
    </CashFlowPageShell>
  );
}
