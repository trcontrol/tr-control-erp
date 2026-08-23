"use client";

import { useState } from "react";
import { formatCnpj, formatPhone } from "@/lib/companies/format";
import { formatCpf } from "@/lib/customers/format";
import { PAYMENT_METHODS, SALE_STATUS } from "@/lib/constants";
import type { SaleWithRelations } from "@/lib/sales/actions";
import {
  formatCurrency,
  formatDateBR,
  paymentMethodLabel,
  saleStatusLabel,
  toNumberAmount,
} from "@/lib/sales/format";
import {
  PAYMENT_CONDITIONS,
  paymentConditionLabel,
} from "@/lib/sales/installments";
import { formatStockQuantity } from "@/lib/products/format";
import type { Company } from "@/types/database";

type SaleReceiptProps = {
  sale: SaleWithRelations;
  company: Company;
};

function formatCompanyAddress(company: Company): string | null {
  const parts: string[] = [];

  const streetLine = [company.street, company.number].filter(Boolean).join(", ");
  if (streetLine) parts.push(streetLine);
  if (company.complement) parts.push(company.complement);
  if (company.neighborhood) parts.push(company.neighborhood);

  const cityLine = [company.city, company.state].filter(Boolean).join(" — ");
  if (cityLine) parts.push(cityLine);
  if (company.zip_code) parts.push(`CEP ${company.zip_code}`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatCustomerDocument(document: string | null | undefined): string | null {
  if (!document?.trim()) return null;
  const digits = document.replace(/\D/g, "");
  if (digits.length === 14) return formatCnpj(document);
  if (digits.length === 11) return formatCpf(document);
  return document.trim();
}

function CompanyLogo({ company }: { company: Company }) {
  const [failed, setFailed] = useState(false);

  if (!company.logo_url || failed) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[var(--brand-navy)]/15 bg-[var(--brand-navy)]/5 text-sm font-bold text-[var(--brand-navy)]">
        {(company.name || "TR").slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={company.logo_url}
      alt={company.name}
      className="h-14 w-auto max-w-[160px] object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function ReceiptRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium text-[var(--brand-navy)]">{value}</span>
    </div>
  );
}

export function SaleReceipt({ sale, company }: SaleReceiptProps) {
  const isDraft = sale.status === SALE_STATUS.draft;
  const isCancelled = sale.status === SALE_STATUS.cancelled;
  const isInstallment =
    sale.payment_condition === PAYMENT_CONDITIONS.installment;
  const schedules = sale.payment_schedules ?? [];
  const customerName =
    sale.customer?.trade_name || sale.customer?.full_name || "—";
  const customerDocument = formatCustomerDocument(sale.customer?.document);
  const companyAddress = formatCompanyAddress(company);
  const companyPhone = company.phone || company.whatsapp;
  const legalName =
    company.legal_name &&
    company.legal_name.trim() !== company.name.trim()
      ? company.legal_name
      : null;

  const discountAmount = toNumberAmount(sale.discount_amount);
  const freightAmount = toNumberAmount(sale.freight_amount);

  return (
    <div className="mx-auto max-w-[210mm] bg-white px-6 py-8 text-[var(--brand-navy)] sm:px-10 sm:py-10">
      <header className="flex flex-col gap-4 border-b border-[var(--brand-navy)]/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <CompanyLogo company={company} />
          <div className="min-w-0 space-y-1">
            <p className="text-lg font-bold leading-tight">{company.name}</p>
            {legalName ? (
              <p className="text-sm text-muted-foreground">{legalName}</p>
            ) : null}
            {company.cnpj ? (
              <p className="text-sm text-muted-foreground">
                CNPJ {formatCnpj(company.cnpj)}
              </p>
            ) : null}
            {companyPhone ? (
              <p className="text-sm text-muted-foreground">
                {formatPhone(companyPhone)}
              </p>
            ) : null}
            {companyAddress ? (
              <p className="text-sm text-muted-foreground">{companyAddress}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="py-6 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide text-[var(--brand-navy)]">
          Comprovante de Venda
        </h1>
        {isCancelled ? (
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-destructive">
            Venda cancelada
          </p>
        ) : null}
        {isDraft ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Venda em rascunho — sem validade financeira.
          </p>
        ) : null}
      </div>

      <section className="mb-6 grid gap-2 rounded-lg border border-[var(--brand-navy)]/8 bg-[var(--brand-navy)]/[0.02] p-4 sm:grid-cols-2">
        <ReceiptRow
          label="Nº / Documento"
          value={sale.document_number || sale.id.slice(0, 8).toUpperCase()}
        />
        <ReceiptRow label="Data" value={formatDateBR(sale.sale_date)} />
        <ReceiptRow label="Status" value={saleStatusLabel(sale.status)} />
        <ReceiptRow label="Cliente" value={customerName} />
        {customerDocument ? (
          <ReceiptRow label="CPF/CNPJ" value={customerDocument} />
        ) : null}
        {sale.notes?.trim() ? (
          <div className="sm:col-span-2">
            <ReceiptRow label="Observação" value={sale.notes.trim()} />
          </div>
        ) : null}
        {isCancelled && sale.cancelled_reason?.trim() ? (
          <div className="sm:col-span-2">
            <ReceiptRow
              label="Motivo do cancelamento"
              value={sale.cancelled_reason.trim()}
            />
          </div>
        ) : null}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-navy)]">
          Produtos
        </h2>
        <div className="overflow-hidden rounded-lg border border-[var(--brand-navy)]/10">
          <table className="sale-receipt-table w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--brand-navy)]/10 bg-[var(--brand-navy)]/[0.04] text-left">
                <th className="px-3 py-2.5 font-medium">Produto</th>
                <th className="px-3 py-2.5 font-medium text-right">Qtd.</th>
                <th className="px-3 py-2.5 font-medium text-right">
                  Valor unitário
                </th>
                <th className="px-3 py-2.5 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => {
                const itemDiscount = toNumberAmount(item.discount_amount);
                return (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--brand-navy)]/8"
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium">
                        {item.product?.name ?? "Item"}
                      </div>
                      {itemDiscount > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          Desconto: {formatCurrency(itemDiscount)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {formatStockQuantity(item.quantity, item.product?.unit)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 ml-auto max-w-xs space-y-1.5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--brand-navy)]">
          Resumo
        </h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(sale.items_subtotal)}</span>
        </div>
        {discountAmount > 0 ? (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Desconto geral</span>
            <span>- {formatCurrency(sale.discount_amount)}</span>
          </div>
        ) : null}
        {freightAmount > 0 ? (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frete</span>
            <span>{formatCurrency(sale.freight_amount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-[var(--brand-navy)]/10 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(sale.total_amount)}</span>
        </div>
      </section>

      <section className="mb-6 space-y-1">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--brand-navy)]">
          Pagamento
        </h2>
        <ReceiptRow
          label="Condição"
          value={paymentConditionLabel(sale.payment_condition)}
        />
        <ReceiptRow
          label="Forma de pagamento"
          value={paymentMethodLabel(sale.payment_method, PAYMENT_METHODS)}
        />
        {!isInstallment && sale.due_date ? (
          <ReceiptRow
            label="Vencimento"
            value={formatDateBR(sale.due_date)}
          />
        ) : null}
      </section>

      {isInstallment && schedules.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-navy)]">
            Parcelas
          </h2>
          <div className="overflow-hidden rounded-lg border border-[var(--brand-navy)]/10">
            <table className="sale-receipt-table w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--brand-navy)]/10 bg-[var(--brand-navy)]/[0.04] text-left">
                  <th className="px-3 py-2.5 font-medium">Parcela</th>
                  <th className="px-3 py-2.5 font-medium">Vencimento</th>
                  <th className="px-3 py-2.5 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--brand-navy)]/8"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      {row.installment_number}/{row.installment_count}
                    </td>
                    <td className="px-3 py-2.5">
                      {formatDateBR(row.due_date)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {formatCurrency(toNumberAmount(row.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <footer className="mt-8 border-t border-[var(--brand-navy)]/10 pt-4 text-center text-xs text-muted-foreground">
        <p>Comprovante de venda — documento não fiscal.</p>
        {isDraft ? (
          <p className="mt-1">
            Venda em rascunho — sem validade financeira.
          </p>
        ) : null}
      </footer>
    </div>
  );
}
