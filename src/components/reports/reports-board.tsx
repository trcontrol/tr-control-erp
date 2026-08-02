"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  ShoppingBag,
  Wallet,
  Warehouse,
  UsersRound,
  ShoppingCart,
  Target,
  CircleDollarSign,
  HandCoins,
} from "lucide-react";
import { SalesReportPanel } from "@/components/reports/sales-report-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SALE_STATUS_OPTIONS } from "@/lib/constants";
import { getSalesReport } from "@/lib/reports/actions";
import { exportSalesReportExcel } from "@/lib/reports/export-excel";
import {
  currentMonthPeriod,
  customerLabel,
  formatDateBR,
  type SalesReportKpis,
  type SalesReportSeriesPoint,
} from "@/lib/reports/format";
import {
  REPORT_TYPE_OPTIONS,
  REPORT_TYPES,
  type ReportType,
} from "@/lib/reports/types";
import type { SaleListItem } from "@/lib/sales/actions";
import type { Customer } from "@/types/database";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

const REPORT_ICONS: Record<
  ReportType,
  React.ComponentType<{ className?: string }>
> = {
  sales: ShoppingBag,
  purchases: ShoppingCart,
  finance: Wallet,
  receivables: CircleDollarSign,
  payables: HandCoins,
  stock: Warehouse,
  customers: UsersRound,
  funnel: Target,
};

const COMING_SOON_MESSAGE = "Este relatório estará disponível em breve.";

export function ReportsBoard() {
  const { company } = useTenant();
  const defaultPeriod = useMemo(() => currentMonthPeriod(), []);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [periodFrom, setPeriodFrom] = useState(defaultPeriod.from);
  const [periodTo, setPeriodTo] = useState(defaultPeriod.to);
  const [status, setStatus] = useState("all");
  const [customerId, setCustomerId] = useState("all");

  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [kpis, setKpis] = useState<SalesReportKpis | null>(null);
  const [series, setSeries] = useState<SalesReportSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [comingSoonNotice, setComingSoonNotice] = useState<string | null>(null);
  const [pulsedReportId, setPulsedReportId] = useState<ReportType | null>(null);

  const loadSalesReport = useCallback(async () => {
    if (!company?.id) {
      setSales([]);
      setCustomers([]);
      setKpis(null);
      setSeries([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerar relatórios.");
      return;
    }

    if (!periodFrom || !periodTo) {
      setError("Informe o período completo.");
      setLoading(false);
      return;
    }

    if (periodTo < periodFrom) {
      setError("A data final não pode ser anterior à inicial.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getSalesReport({
      companyId: company.id,
      status,
      customerId,
      periodFrom,
      periodTo,
    });

    if (result.error || !result.data) {
      setSales([]);
      setCustomers([]);
      setKpis(null);
      setSeries([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setSales(result.data.sales);
    setCustomers(result.data.customers);
    setKpis(result.data.kpis);
    setSeries(result.data.series);
    setLoading(false);
  }, [company?.id, customerId, periodFrom, periodTo, status]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadSalesReport();
    }, 200);

    return () => clearTimeout(timeout);
  }, [loadSalesReport]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const statusLabel =
    status === "all"
      ? "Todos os status"
      : (SALE_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
        status);

  const customerFilterLabel =
    customerId === "all"
      ? "Todos os clientes"
      : customerLabel(customers.find((item) => item.id === customerId) ?? null);

  const canExport =
    !loading && !error && Boolean(kpis) && Boolean(company);

  const handleExportExcel = async () => {
    if (!company || !kpis || !canExport) return;

    setExporting(true);
    try {
      await exportSalesReportExcel({
        companyName: company.name,
        periodFrom,
        periodTo,
        statusLabel,
        customerFilterLabel,
        sales,
        kpis,
      });
    } catch {
      setError("Não foi possível exportar o Excel. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const showComingSoonNotice = (reportId: ReportType) => {
    setComingSoonNotice(COMING_SOON_MESSAGE);
    setPulsedReportId(reportId);

    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);

    noticeTimeoutRef.current = setTimeout(() => {
      setComingSoonNotice(null);
    }, 2800);

    pulseTimeoutRef.current = setTimeout(() => {
      setPulsedReportId(null);
    }, 420);
  };

  const handleReportTypeClick = (option: (typeof REPORT_TYPE_OPTIONS)[number]) => {
    if (!option.available) {
      showComingSoonNotice(option.id);
      return;
    }

    setComingSoonNotice(null);
  };

  return (
    <div id="reports-print-root" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-navy)]">
            Relatórios
          </h1>
          <p className="mt-1 text-muted-foreground">
            Visão gerencial por período da empresa{" "}
            <span className="font-medium text-[var(--brand-navy)]">
              {company?.name}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end print:hidden">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="report-period-from" className="text-xs">
                De
              </Label>
              <Input
                id="report-period-from"
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="w-full sm:w-[150px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-period-to" className="text-xs">
                Até
              </Label>
              <Input
                id="report-period-to"
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="w-full sm:w-[150px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              disabled={!canExport}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" disabled={!canExport || exporting}>
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    void handleExportExcel();
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--brand-navy)]">
              Tipo de relatório
            </h2>
            <p className="text-xs text-muted-foreground">
              Selecione o módulo para análise
            </p>
          </div>
          {comingSoonNotice ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/10 px-3 py-1.5 text-xs font-medium text-[var(--brand-navy)]/75"
            >
              {comingSoonNotice}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {REPORT_TYPE_OPTIONS.map((option) => {
            const Icon = REPORT_ICONS[option.id];
            const selected = option.id === REPORT_TYPES.sales && option.available;
            const unavailable = !option.available;
            const pulsed = pulsedReportId === option.id;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                aria-label={
                  unavailable
                    ? `${option.title} — em breve`
                    : option.title
                }
                onClick={() => handleReportTypeClick(option)}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 text-left transition duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/50",
                  "active:scale-[0.985]",
                  selected &&
                    "border-[var(--brand-coral)]/55 bg-white shadow-[0_2px_10px_rgb(17_32_59/0.08)] ring-1 ring-[var(--brand-coral)]/30",
                  unavailable &&
                    "border-[var(--brand-navy)]/8 bg-[var(--brand-surface-soft)]/80 text-[var(--brand-navy)]/75 shadow-none hover:border-[var(--brand-navy)]/14 hover:bg-[var(--brand-surface-soft)] hover:shadow-[0_1px_6px_rgb(17_32_59/0.05)]",
                  pulsed &&
                    "scale-[0.975] border-[var(--brand-gold)]/50 bg-[var(--brand-gold)]/10 ring-1 ring-[var(--brand-gold)]/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
                      selected
                        ? "bg-[var(--brand-coral)]/14 text-[var(--brand-coral)] ring-[var(--brand-coral)]/20"
                        : "bg-[var(--brand-navy)]/6 text-[var(--brand-navy)]/55 ring-[var(--brand-navy)]/8"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {unavailable ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-gold)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-navy)]/70">
                      <Clock3 className="h-3 w-3 text-[var(--brand-gold)]" />
                      Em breve
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "mt-3 text-sm font-semibold",
                    selected
                      ? "text-[var(--brand-navy)]"
                      : "text-[var(--brand-navy)]/70"
                  )}
                >
                  {option.title}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs leading-relaxed",
                    selected
                      ? "text-muted-foreground"
                      : "text-muted-foreground/80"
                  )}
                >
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden print:block">
        <p className="text-sm text-muted-foreground">
          Vendas · {formatDateBR(periodFrom)} a {formatDateBR(periodTo)} ·{" "}
          {statusLabel} · {customerFilterLabel}
        </p>
      </div>

      <SalesReportPanel
        companyName={company?.name ?? ""}
        periodFrom={periodFrom}
        periodTo={periodTo}
        status={status}
        customerId={customerId}
        customers={customers}
        sales={sales}
        kpis={kpis}
        series={series}
        loading={loading}
        error={error}
        onStatusChange={setStatus}
        onCustomerChange={setCustomerId}
      />
    </div>
  );
}
