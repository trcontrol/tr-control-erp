"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { SaleReceipt } from "@/components/sales/sale-receipt";
import { Button } from "@/components/ui/button";
import { saleDetailPath } from "@/lib/constants";
import { getSale, type SaleWithRelations } from "@/lib/sales/actions";
import { useTenant } from "@/providers/tenant-provider";

export default function SaleReceiptPage() {
  const params = useParams<{ id: string }>();
  const { company } = useTenant();
  const [sale, setSale] = useState<SaleWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      setError("Selecione uma empresa ativa.");
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getSale(company!.id, params.id);

      if (!active) return;

      if (result.error || !result.data) {
        setSale(null);
        setError(result.error?.message ?? "Venda não encontrada.");
        setLoading(false);
        return;
      }

      setSale(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [company, params.id]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="outline">
          <Link href={sale ? saleDetailPath(sale.id) : "/sales"}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        {sale && company ? (
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando comprovante...
        </div>
      ) : error || !sale || !company ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive print:hidden">
          {error ?? "Venda não encontrada."}
        </div>
      ) : (
        <div
          id="sale-receipt-root"
          className="overflow-hidden rounded-xl border border-[var(--brand-navy)]/8 bg-white shadow-card print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
        >
          <SaleReceipt sale={sale} company={company} />
        </div>
      )}
    </div>
  );
}
