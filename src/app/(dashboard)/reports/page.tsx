import { ReportsBoard } from "@/components/reports/reports-board";
import { ReportsPageShell } from "@/components/reports/reports-page-shell";

export const metadata = {
  title: "Relatórios",
};

export default function ReportsPage() {
  return (
    <ReportsPageShell>
      <ReportsBoard />
    </ReportsPageShell>
  );
}
