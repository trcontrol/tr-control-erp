import { FunnelBoard } from "@/components/funnel/funnel-board";

export const metadata = {
  title: "Funil Comercial",
};

export default function FunnelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funil Comercial</h1>
        <p className="text-muted-foreground">
          Acompanhe oportunidades por etapa na empresa ativa
        </p>
      </div>
      <FunnelBoard />
    </div>
  );
}
