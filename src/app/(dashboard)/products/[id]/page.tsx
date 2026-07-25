"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProductDetail } from "@/components/products/product-detail";
import { ProductPageShell } from "@/components/products/product-page-shell";
import { getProduct } from "@/lib/products/actions";
import { useTenant } from "@/providers/tenant-provider";
import type { Product } from "@/types/database";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { company } = useTenant();
  const [product, setProduct] = useState<Product | null>(null);
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

      const result = await getProduct(company!.id, params.id);

      if (!active) return;

      if (result.error || !result.data) {
        setProduct(null);
        setError(result.error?.message ?? "Produto não encontrado.");
        setLoading(false);
        return;
      }

      setProduct(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [company, params.id]);

  return (
    <ProductPageShell
      title="Detalhes do produto"
      description="Visualização completa do cadastro"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando produto...
        </div>
      ) : error || !product || !company ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Produto não encontrado."}
        </div>
      ) : (
        <ProductDetail product={product} companyId={company.id} />
      )}
    </ProductPageShell>
  );
}
