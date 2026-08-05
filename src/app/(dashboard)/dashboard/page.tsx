import { ExecutiveDashboardBoard } from "@/components/dashboard/executive-dashboard-board";
import { ExecutivePageShell } from "@/components/dashboard/executive-page-shell";

export const metadata = {
  title: "Dashboard Executivo",
};

export default function DashboardPage() {
  return (
    <ExecutivePageShell>
      <ExecutiveDashboardBoard />
    </ExecutivePageShell>
  );
}
