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
  CUSTOMER_STATUS_OPTIONS,
  PERSON_TYPE_OPTIONS,
  ROUTES,
  customerEditPath,
} from "@/lib/constants";
import { deleteCustomer } from "@/lib/customers/actions";
import type { Customer } from "@/types/database";

type CustomerDetailProps = {
  customer: Customer;
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

export function CustomerDetail({ customer, companyId }: CustomerDetailProps) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteCustomer(companyId, customer.id);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(ROUTES.customers);
    router.refresh();
  }

  const isCompany = customer.person_type === "company";

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
            <CardTitle>{customer.full_name}</CardTitle>
            <CardDescription>
              {labelFromOptions(PERSON_TYPE_OPTIONS, customer.person_type)} ·{" "}
              {labelFromOptions(CUSTOMER_STATUS_OPTIONS, customer.status)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={customerEditPath(customer.id)}>
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
            value={customer.full_name}
          />
          <InfoItem label="Nome fantasia" value={customer.trade_name} />
          <InfoItem
            label={isCompany ? "CNPJ" : "CPF"}
            value={customer.document}
          />
          <InfoItem
            label={isCompany ? "Inscrição estadual" : "RG"}
            value={customer.secondary_document}
          />
          {!isCompany ? (
            <InfoItem
              label="Data de nascimento"
              value={
                customer.birth_date
                  ? new Date(`${customer.birth_date}T00:00:00`).toLocaleDateString(
                      "pt-BR"
                    )
                  : null
              }
            />
          ) : null}
          <InfoItem label="E-mail" value={customer.email} />
          <InfoItem label="Telefone" value={customer.phone} />
          <InfoItem label="WhatsApp" value={customer.whatsapp} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="CEP" value={customer.zip_code} />
          <InfoItem label="Endereço" value={customer.street} />
          <InfoItem label="Número" value={customer.number} />
          <InfoItem label="Complemento" value={customer.complement} />
          <InfoItem label="Bairro" value={customer.neighborhood} />
          <InfoItem label="Cidade" value={customer.city} />
          <InfoItem label="Estado" value={customer.state} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {customer.notes || "Nenhuma observação cadastrada."}
          </p>
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href={ROUTES.customers}>Voltar para a lista</Link>
        </Button>
      </div>
    </div>
  );
}
