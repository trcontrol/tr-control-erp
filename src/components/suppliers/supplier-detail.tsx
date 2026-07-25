"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PERSON_TYPE_OPTIONS,
  ROUTES,
  SUPPLIER_STATUS_OPTIONS,
  supplierEditPath,
} from "@/lib/constants";
import { deleteSupplier } from "@/lib/suppliers/actions";
import type { Supplier } from "@/types/database";

type SupplierDetailProps = {
  supplier: Supplier;
  companyId: string;
};

function labelFromOptions(
  options: readonly { value: string; label: string }[],
  value: string
) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value || "—"}</p>
    </div>
  );
}

export function SupplierDetail({ supplier, companyId }: SupplierDetailProps) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteSupplier(companyId, supplier.id);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(ROUTES.suppliers);
    router.refresh();
  }

  const isCompany = supplier.person_type === "company";

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{supplier.full_name}</CardTitle>
            <CardDescription>
              {labelFromOptions(PERSON_TYPE_OPTIONS, supplier.person_type)} ·{" "}
              {labelFromOptions(SUPPLIER_STATUS_OPTIONS, supplier.status)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={supplierEditPath(supplier.id)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
            {!confirmingDelete ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            ) : (
              <>
                <Button
                  variant="destructive"
                  disabled={loading}
                  onClick={() => void handleDelete()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Confirmar exclusão
                </Button>
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label={isCompany ? "Razão social" : "Nome completo"}
            value={supplier.full_name}
          />
          <InfoItem label="Nome fantasia" value={supplier.trade_name} />
          <InfoItem
            label={isCompany ? "CNPJ" : "CPF"}
            value={supplier.document}
          />
          <InfoItem
            label={isCompany ? "Inscrição estadual" : "RG"}
            value={supplier.secondary_document}
          />
          <InfoItem label="Contato responsável" value={supplier.contact_name} />
          <InfoItem label="Categoria" value={supplier.category} />
          <InfoItem label="E-mail" value={supplier.email} />
          <InfoItem label="Telefone" value={supplier.phone} />
          <InfoItem label="WhatsApp" value={supplier.whatsapp} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="CEP" value={supplier.zip_code} />
          <InfoItem label="Endereço" value={supplier.street} />
          <InfoItem label="Número" value={supplier.number} />
          <InfoItem label="Complemento" value={supplier.complement} />
          <InfoItem label="Bairro" value={supplier.neighborhood} />
          <InfoItem label="Cidade" value={supplier.city} />
          <InfoItem label="Estado" value={supplier.state} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {supplier.notes || "Nenhuma observação cadastrada."}
          </p>
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href={ROUTES.suppliers}>Voltar para a lista</Link>
        </Button>
      </div>
    </div>
  );
}
