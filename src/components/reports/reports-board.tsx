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
import { CustomersReportPanel } from "@/components/reports/customers-report-panel";
import { FinanceReportPanel } from "@/components/reports/finance-report-panel";
import { FunnelReportPanel } from "@/components/reports/funnel-report-panel";
import { PayablesReportPanel } from "@/components/reports/payables-report-panel";
import { PurchasesReportPanel } from "@/components/reports/purchases-report-panel";
import { ReceivablesReportPanel } from "@/components/reports/receivables-report-panel";
import { SalesReportPanel } from "@/components/reports/sales-report-panel";
import { StockReportPanel } from "@/components/reports/stock-report-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CUSTOMER_STATUS_OPTIONS,
  FINANCIAL_ENTRY_TYPE_OPTIONS,
  FINANCIAL_STATUS_OPTIONS,
  OPPORTUNITY_STAGE_OPTIONS,
  PERSON_TYPE_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  SALE_STATUS_OPTIONS,
} from "@/lib/constants";
import type { FinancialEntryWithRelations } from "@/lib/finance/entry-query";
import { opportunityStageLabel } from "@/lib/funnel/format";
import {
  getCustomersReport,
  getFinanceReport,
  getFunnelReport,
  getPayablesReport,
  getPurchasesReport,
  getReceivablesReport,
  getSalesReport,
  getStockReport,
} from "@/lib/reports/actions";
import {
  exportCustomersReportExcel,
  exportFinanceReportExcel,
  exportFunnelReportExcel,
  exportPayablesReportExcel,
  exportPurchasesReportExcel,
  exportReceivablesReportExcel,
  exportSalesReportExcel,
  exportStockReportExcel,
} from "@/lib/reports/export-excel";
import {
  CUSTOMERS_REPORT_EMPTY_GEO,
  currentMonthPeriod,
  customerLabel,
  financeEntryTypeLabel,
  formatDateBR,
  personTypeLabel,
  STOCK_REPORT_SITUATIONS,
  stockSituationLabel,
  supplierLabel,
  type CustomersReportKpis,
  type CustomersReportRow,
  type CustomersReportSeriesPoint,
  type CustomersSalesDistributionPoint,
  type FinanceReportKpis,
  type FinanceReportSeriesPoint,
  type FunnelReportCreatedSeriesPoint,
  type FunnelReportKpis,
  type FunnelReportRow,
  type FunnelReportStageRow,
  type PayablesReportKpis,
  type PayablesReportSeriesPoint,
  type PurchasesReportKpis,
  type PurchasesReportSeriesPoint,
  type ReceivablesReportKpis,
  type ReceivablesReportSeriesPoint,
  type SalesReportKpis,
  type SalesReportSeriesPoint,
  type StockLowBalancePoint,
  type StockReportKpis,
  type StockReportRow,
  type StockReportSeriesPoint,
} from "@/lib/reports/format";
import {
  REPORT_TYPE_OPTIONS,
  REPORT_TYPES,
  type ReportType,
} from "@/lib/reports/types";
import type { PurchaseListItem } from "@/lib/purchases/actions";
import type { SaleListItem } from "@/lib/sales/actions";
import type { StockMovementWithRelations } from "@/lib/stock/actions";
import type { CompanyMemberOption } from "@/lib/tasks/actions";
import type { Customer, Product, Supplier } from "@/types/database";
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

  const [selectedReportType, setSelectedReportType] = useState<ReportType>(
    REPORT_TYPES.sales
  );
  const [periodFrom, setPeriodFrom] = useState(defaultPeriod.from);
  const [periodTo, setPeriodTo] = useState(defaultPeriod.to);
  const [status, setStatus] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [supplierId, setSupplierId] = useState("all");
  const [entryType, setEntryType] = useState("all");
  const [category, setCategory] = useState("all");
  const [productId, setProductId] = useState("all");
  const [stockSituation, setStockSituation] = useState<string>(
    STOCK_REPORT_SITUATIONS.all
  );
  const [personType, setPersonType] = useState("all");
  const [customerState, setCustomerState] = useState("all");
  const [customerCity, setCustomerCity] = useState("all");
  const [funnelStage, setFunnelStage] = useState("all");
  const [assignedUserId, setAssignedUserId] = useState("all");

  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesKpis, setSalesKpis] = useState<SalesReportKpis | null>(null);
  const [salesSeries, setSalesSeries] = useState<SalesReportSeriesPoint[]>([]);

  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchasesKpis, setPurchasesKpis] =
    useState<PurchasesReportKpis | null>(null);
  const [purchasesSeries, setPurchasesSeries] = useState<
    PurchasesReportSeriesPoint[]
  >([]);

  const [entries, setEntries] = useState<FinancialEntryWithRelations[]>([]);
  const [financeKpis, setFinanceKpis] = useState<FinanceReportKpis | null>(null);
  const [financeSeries, setFinanceSeries] = useState<FinanceReportSeriesPoint[]>(
    []
  );

  const [receivablesEntries, setReceivablesEntries] = useState<
    FinancialEntryWithRelations[]
  >([]);
  const [receivablesCustomers, setReceivablesCustomers] = useState<Customer[]>(
    []
  );
  const [receivablesKpis, setReceivablesKpis] =
    useState<ReceivablesReportKpis | null>(null);
  const [receivablesSeries, setReceivablesSeries] = useState<
    ReceivablesReportSeriesPoint[]
  >([]);

  const [payablesEntries, setPayablesEntries] = useState<
    FinancialEntryWithRelations[]
  >([]);
  const [payablesSuppliers, setPayablesSuppliers] = useState<Supplier[]>([]);
  const [payablesKpis, setPayablesKpis] = useState<PayablesReportKpis | null>(
    null
  );
  const [payablesSeries, setPayablesSeries] = useState<
    PayablesReportSeriesPoint[]
  >([]);

  const [stockProducts, setStockProducts] = useState<Product[]>([]);
  const [stockCategories, setStockCategories] = useState<string[]>([]);
  const [stockRows, setStockRows] = useState<StockReportRow[]>([]);
  const [stockMovements, setStockMovements] = useState<
    StockMovementWithRelations[]
  >([]);
  const [stockKpis, setStockKpis] = useState<StockReportKpis | null>(null);
  const [stockSeries, setStockSeries] = useState<StockReportSeriesPoint[]>([]);
  const [stockLowBalanceSeries, setStockLowBalanceSeries] = useState<
    StockLowBalancePoint[]
  >([]);

  const [customersRows, setCustomersRows] = useState<CustomersReportRow[]>([]);
  const [customersKpis, setCustomersKpis] =
    useState<CustomersReportKpis | null>(null);
  const [customersSeries, setCustomersSeries] = useState<
    CustomersReportSeriesPoint[]
  >([]);
  const [customersSalesDistribution, setCustomersSalesDistribution] = useState<
    CustomersSalesDistributionPoint[]
  >([]);
  const [customerStateOptions, setCustomerStateOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [customerCityOptions, setCustomerCityOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const [funnelRows, setFunnelRows] = useState<FunnelReportRow[]>([]);
  const [funnelKpis, setFunnelKpis] = useState<FunnelReportKpis | null>(null);
  const [funnelStages, setFunnelStages] = useState<FunnelReportStageRow[]>([]);
  const [funnelLostSummary, setFunnelLostSummary] =
    useState<FunnelReportStageRow | null>(null);
  const [funnelCreatedSeries, setFunnelCreatedSeries] = useState<
    FunnelReportCreatedSeriesPoint[]
  >([]);
  const [funnelCustomers, setFunnelCustomers] = useState<Customer[]>([]);
  const [funnelMembers, setFunnelMembers] = useState<CompanyMemberOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [comingSoonNotice, setComingSoonNotice] = useState<string | null>(null);
  const [pulsedReportId, setPulsedReportId] = useState<ReportType | null>(null);

  const isSalesReport = selectedReportType === REPORT_TYPES.sales;
  const isPurchasesReport = selectedReportType === REPORT_TYPES.purchases;
  const isFinanceReport = selectedReportType === REPORT_TYPES.finance;
  const isReceivablesReport = selectedReportType === REPORT_TYPES.receivables;
  const isPayablesReport = selectedReportType === REPORT_TYPES.payables;
  const isStockReport = selectedReportType === REPORT_TYPES.stock;
  const isCustomersReport = selectedReportType === REPORT_TYPES.customers;
  const isFunnelReport = selectedReportType === REPORT_TYPES.funnel;

  const validatePeriod = useCallback(() => {
    if (!company?.id) {
      setLoading(false);
      setError("Selecione uma empresa ativa para gerar relatórios.");
      return false;
    }

    if (!periodFrom || !periodTo) {
      setError("Informe o período completo.");
      setLoading(false);
      return false;
    }

    if (periodTo < periodFrom) {
      setError("A data final não pode ser anterior à inicial.");
      setLoading(false);
      return false;
    }

    return true;
  }, [company?.id, periodFrom, periodTo]);

  const loadSalesReport = useCallback(async () => {
    if (!validatePeriod() || !company?.id) {
      setSales([]);
      setCustomers([]);
      setSalesKpis(null);
      setSalesSeries([]);
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
      setSalesKpis(null);
      setSalesSeries([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setSales(result.data.sales);
    setCustomers(result.data.customers);
    setSalesKpis(result.data.kpis);
    setSalesSeries(result.data.series);
    setLoading(false);
  }, [company?.id, customerId, periodFrom, periodTo, status, validatePeriod]);

  const loadPurchasesReport = useCallback(async () => {
    if (!validatePeriod() || !company?.id) {
      setPurchases([]);
      setSuppliers([]);
      setPurchasesKpis(null);
      setPurchasesSeries([]);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getPurchasesReport({
      companyId: company.id,
      status,
      supplierId,
      periodFrom,
      periodTo,
    });

    if (result.error || !result.data) {
      setPurchases([]);
      setSuppliers([]);
      setPurchasesKpis(null);
      setPurchasesSeries([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setPurchases(result.data.purchases);
    setSuppliers(result.data.suppliers);
    setPurchasesKpis(result.data.kpis);
    setPurchasesSeries(result.data.series);
    setLoading(false);
  }, [company?.id, periodFrom, periodTo, status, supplierId, validatePeriod]);

  const loadFinanceReport = useCallback(async () => {
    if (!validatePeriod() || !company?.id) {
      setEntries([]);
      setFinanceKpis(null);
      setFinanceSeries([]);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getFinanceReport({
      companyId: company.id,
      entryType,
      status,
      category,
      periodFrom,
      periodTo,
    });

    if (result.error || !result.data) {
      setEntries([]);
      setFinanceKpis(null);
      setFinanceSeries([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setEntries(result.data.entries);
    setFinanceKpis(result.data.kpis);
    setFinanceSeries(result.data.series);
    setLoading(false);
  }, [
    category,
    company?.id,
    entryType,
    periodFrom,
    periodTo,
    status,
    validatePeriod,
  ]);

  const loadReceivablesReport = useCallback(async () => {
    if (!validatePeriod() || !company?.id) {
      setReceivablesEntries([]);
      setReceivablesCustomers([]);
      setReceivablesKpis(null);
      setReceivablesSeries([]);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getReceivablesReport({
      companyId: company.id,
      status,
      customerId,
      category,
      periodFrom,
      periodTo,
    });

    if (result.error || !result.data) {
      setReceivablesEntries([]);
      setReceivablesCustomers([]);
      setReceivablesKpis(null);
      setReceivablesSeries([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setReceivablesEntries(result.data.entries);
    setReceivablesCustomers(result.data.customers);
    setReceivablesKpis(result.data.kpis);
    setReceivablesSeries(result.data.series);
    setLoading(false);
  }, [
    category,
    company?.id,
    customerId,
    periodFrom,
    periodTo,
    status,
    validatePeriod,
  ]);

  const loadPayablesReport = useCallback(async () => {
    if (!validatePeriod() || !company?.id) {
      setPayablesEntries([]);
      setPayablesSuppliers([]);
      setPayablesKpis(null);
      setPayablesSeries([]);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getPayablesReport({
      companyId: company.id,
      status,
      supplierId,
      category,
      periodFrom,
      periodTo,
    });

    if (result.error || !result.data) {
      setPayablesEntries([]);
      setPayablesSuppliers([]);
      setPayablesKpis(null);
      setPayablesSeries([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setPayablesEntries(result.data.entries);
    setPayablesSuppliers(result.data.suppliers);
    setPayablesKpis(result.data.kpis);
    setPayablesSeries(result.data.series);
    setLoading(false);
  }, [
    category,
    company?.id,
    periodFrom,
    periodTo,
    status,
    supplierId,
    validatePeriod,
  ]);

  const loadStockReport = useCallback(async () => {
    if (!validatePeriod() || !company?.id) {
      setStockProducts([]);
      setStockCategories([]);
      setStockRows([]);
      setStockMovements([]);
      setStockKpis(null);
      setStockSeries([]);
      setStockLowBalanceSeries([]);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getStockReport({
      companyId: company.id,
      productId,
      category,
      situation: stockSituation,
      periodFrom,
      periodTo,
    });

    if (result.error || !result.data) {
      setStockProducts([]);
      setStockCategories([]);
      setStockRows([]);
      setStockMovements([]);
      setStockKpis(null);
      setStockSeries([]);
      setStockLowBalanceSeries([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setStockProducts(result.data.products);
    setStockCategories(result.data.categories);
    setStockRows(result.data.rows);
    setStockMovements(result.data.movements);
    setStockKpis(result.data.kpis);
    setStockSeries(result.data.series);
    setStockLowBalanceSeries(result.data.lowBalanceSeries);
    setLoading(false);
  }, [
    category,
    company?.id,
    periodFrom,
    periodTo,
    productId,
    stockSituation,
    validatePeriod,
  ]);

  const loadCustomersReport = useCallback(async () => {
    if (!validatePeriod() || !company?.id) {
      setCustomersRows([]);
      setCustomersKpis(null);
      setCustomersSeries([]);
      setCustomersSalesDistribution([]);
      setCustomerStateOptions([]);
      setCustomerCityOptions([]);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getCustomersReport({
      companyId: company.id,
      status,
      personType,
      state: customerState,
      city: customerCity,
      periodFrom,
      periodTo,
    });

    if (result.error || !result.data) {
      setCustomersRows([]);
      setCustomersKpis(null);
      setCustomersSeries([]);
      setCustomersSalesDistribution([]);
      setCustomerStateOptions([]);
      setCustomerCityOptions([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setCustomersRows(result.data.rows);
    setCustomersKpis(result.data.kpis);
    setCustomersSeries(result.data.series);
    setCustomersSalesDistribution(result.data.salesDistribution);
    setCustomerStateOptions(result.data.stateOptions);
    setCustomerCityOptions(result.data.cityOptions);

    if (
      customerCity !== "all" &&
      !result.data.cityOptions.some((option) => option.value === customerCity)
    ) {
      setCustomerCity("all");
    }

    setLoading(false);
  }, [
    company?.id,
    customerCity,
    customerState,
    periodFrom,
    periodTo,
    personType,
    status,
    validatePeriod,
  ]);

  const loadFunnelReport = useCallback(async () => {
    if (!validatePeriod() || !company?.id) {
      setFunnelRows([]);
      setFunnelKpis(null);
      setFunnelStages([]);
      setFunnelLostSummary(null);
      setFunnelCreatedSeries([]);
      setFunnelCustomers([]);
      setFunnelMembers([]);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getFunnelReport({
      companyId: company.id,
      stage: funnelStage,
      assignedUserId,
      customerId,
      periodFrom,
      periodTo,
    });

    if (result.error || !result.data) {
      setFunnelRows([]);
      setFunnelKpis(null);
      setFunnelStages([]);
      setFunnelLostSummary(null);
      setFunnelCreatedSeries([]);
      setFunnelCustomers([]);
      setFunnelMembers([]);
      setError(result.error?.message ?? "Erro ao carregar o relatório.");
      setLoading(false);
      return;
    }

    setFunnelRows(result.data.rows);
    setFunnelKpis(result.data.kpis);
    setFunnelStages(result.data.stages);
    setFunnelLostSummary(result.data.lostSummary);
    setFunnelCreatedSeries(result.data.createdSeries);
    setFunnelCustomers(result.data.customers);
    setFunnelMembers(result.data.members);
    setLoading(false);
  }, [
    assignedUserId,
    company?.id,
    customerId,
    funnelStage,
    periodFrom,
    periodTo,
    validatePeriod,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isSalesReport) {
        void loadSalesReport();
      } else if (isPurchasesReport) {
        void loadPurchasesReport();
      } else if (isFinanceReport) {
        void loadFinanceReport();
      } else if (isReceivablesReport) {
        void loadReceivablesReport();
      } else if (isPayablesReport) {
        void loadPayablesReport();
      } else if (isStockReport) {
        void loadStockReport();
      } else if (isCustomersReport) {
        void loadCustomersReport();
      } else if (isFunnelReport) {
        void loadFunnelReport();
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [
    isCustomersReport,
    isFinanceReport,
    isFunnelReport,
    isPayablesReport,
    isPurchasesReport,
    isReceivablesReport,
    isSalesReport,
    isStockReport,
    loadCustomersReport,
    loadFinanceReport,
    loadFunnelReport,
    loadPayablesReport,
    loadPurchasesReport,
    loadReceivablesReport,
    loadSalesReport,
    loadStockReport,
  ]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (status === "all") return "Todos os status";

    const options =
      isFinanceReport || isReceivablesReport || isPayablesReport
        ? FINANCIAL_STATUS_OPTIONS
        : isPurchasesReport
          ? PURCHASE_STATUS_OPTIONS
          : isCustomersReport
            ? CUSTOMER_STATUS_OPTIONS
            : SALE_STATUS_OPTIONS;

    return options.find((item) => item.value === status)?.label ?? status;
  }, [
    isCustomersReport,
    isFinanceReport,
    isPayablesReport,
    isPurchasesReport,
    isReceivablesReport,
    status,
  ]);

  const customersPersonTypeLabel =
    personType === "all"
      ? "Todos os tipos"
      : personTypeLabel(personType) ||
        PERSON_TYPE_OPTIONS.find((item) => item.value === personType)?.label ||
        personType;

  const customersStateFilterLabel =
    customerState === "all"
      ? "Todas as UFs"
      : customerState === CUSTOMERS_REPORT_EMPTY_GEO
        ? "Sem estado"
        : customerState;

  const customersCityFilterLabel =
    customerCity === "all"
      ? "Todas as cidades"
      : customerCity === CUSTOMERS_REPORT_EMPTY_GEO
        ? "Sem cidade"
        : customerCity;

  const activeCustomers = isReceivablesReport
    ? receivablesCustomers
    : isFunnelReport
      ? funnelCustomers
      : customers;

  const activeSuppliers = isPayablesReport ? payablesSuppliers : suppliers;

  const customerFilterLabel =
    customerId === "all"
      ? "Todos os clientes"
      : customerLabel(
          activeCustomers.find((item) => item.id === customerId) ?? null
        );

  const funnelStageFilterLabel =
    funnelStage === "all"
      ? "Todas as etapas"
      : OPPORTUNITY_STAGE_OPTIONS.find((item) => item.value === funnelStage)
          ?.label ||
        opportunityStageLabel(funnelStage) ||
        funnelStage;

  const assignedFilterLabel =
    assignedUserId === "all"
      ? "Todos os responsáveis"
      : funnelMembers.find((item) => item.user_id === assignedUserId)
          ?.full_name || "Responsável";

  const supplierFilterLabel =
    supplierId === "all"
      ? "Todos os fornecedores"
      : supplierLabel(
          activeSuppliers.find((item) => item.id === supplierId) ?? null
        );

  const entryTypeLabel =
    entryType === "all"
      ? "Todos os tipos"
      : financeEntryTypeLabel(entryType) ||
        FINANCIAL_ENTRY_TYPE_OPTIONS.find((item) => item.value === entryType)
          ?.label ||
        entryType;

  const categoryFilterLabel =
    category === "all" ? "Todas as categorias" : category;

  const productFilterLabel =
    productId === "all"
      ? "Todos os produtos"
      : stockProducts.find((item) => item.id === productId)?.name || "Produto";

  const situationFilterLabel =
    stockSituation === STOCK_REPORT_SITUATIONS.all
      ? "Todas as situações"
      : stockSituationLabel(stockSituation);

  const activeKpis = isFinanceReport
    ? financeKpis
    : isReceivablesReport
      ? receivablesKpis
      : isPayablesReport
        ? payablesKpis
        : isStockReport
          ? stockKpis
          : isCustomersReport
            ? customersKpis
            : isFunnelReport
              ? funnelKpis
              : isPurchasesReport
                ? purchasesKpis
                : salesKpis;
  const canExport =
    !loading && !error && Boolean(activeKpis) && Boolean(company);

  const handleExportExcel = async () => {
    if (!company || !canExport) return;

    setExporting(true);
    try {
      if (isFinanceReport) {
        if (!financeKpis) return;
        await exportFinanceReportExcel({
          companyName: company.name,
          periodFrom,
          periodTo,
          statusLabel,
          entryTypeLabel,
          categoryFilterLabel,
          entries,
          kpis: financeKpis,
        });
      } else if (isReceivablesReport) {
        if (!receivablesKpis) return;
        await exportReceivablesReportExcel({
          companyName: company.name,
          periodFrom,
          periodTo,
          statusLabel,
          customerFilterLabel,
          categoryFilterLabel,
          entries: receivablesEntries,
          kpis: receivablesKpis,
        });
      } else if (isPayablesReport) {
        if (!payablesKpis) return;
        await exportPayablesReportExcel({
          companyName: company.name,
          periodFrom,
          periodTo,
          statusLabel,
          supplierFilterLabel,
          categoryFilterLabel,
          entries: payablesEntries,
          kpis: payablesKpis,
        });
      } else if (isStockReport) {
        if (!stockKpis) return;
        await exportStockReportExcel({
          companyName: company.name,
          periodFrom,
          periodTo,
          productFilterLabel,
          categoryFilterLabel,
          situationFilterLabel,
          rows: stockRows,
          movements: stockMovements,
          kpis: stockKpis,
        });
      } else if (isPurchasesReport) {
        if (!purchasesKpis) return;
        await exportPurchasesReportExcel({
          companyName: company.name,
          periodFrom,
          periodTo,
          statusLabel,
          supplierFilterLabel,
          purchases,
          kpis: purchasesKpis,
        });
      } else if (isCustomersReport) {
        if (!customersKpis) return;
        await exportCustomersReportExcel({
          companyName: company.name,
          periodFrom,
          periodTo,
          statusLabel,
          personTypeLabel: customersPersonTypeLabel,
          stateFilterLabel: customersStateFilterLabel,
          cityFilterLabel: customersCityFilterLabel,
          rows: customersRows,
          kpis: customersKpis,
        });
      } else if (isFunnelReport) {
        if (!funnelKpis || !funnelLostSummary) return;
        await exportFunnelReportExcel({
          companyName: company.name,
          periodFrom,
          periodTo,
          stageFilterLabel: funnelStageFilterLabel,
          assignedFilterLabel,
          customerFilterLabel,
          rows: funnelRows,
          stages: funnelStages,
          lostSummary: funnelLostSummary,
          kpis: funnelKpis,
        });
      } else if (salesKpis) {
        await exportSalesReportExcel({
          companyName: company.name,
          periodFrom,
          periodTo,
          statusLabel,
          customerFilterLabel,
          sales,
          kpis: salesKpis,
        });
      }
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
    if (option.id === selectedReportType) return;

    setSelectedReportType(option.id);
    setStatus("all");
    setCustomerId("all");
    setSupplierId("all");
    setEntryType("all");
    setCategory("all");
    setProductId("all");
    setStockSituation(STOCK_REPORT_SITUATIONS.all);
    setPersonType("all");
    setCustomerState("all");
    setCustomerCity("all");
    setFunnelStage("all");
    setAssignedUserId("all");
    setError(null);
  };

  const handleCustomerStateChange = (value: string) => {
    setCustomerState(value);
    setCustomerCity("all");
  };

  const printTitle = isFinanceReport
    ? "Relatório Financeiro"
    : isReceivablesReport
      ? "Relatório de Contas a Receber"
      : isPayablesReport
        ? "Relatório de Contas a Pagar"
        : isStockReport
          ? "Relatório de Estoque"
          : isCustomersReport
            ? "Relatório de Clientes"
            : isFunnelReport
              ? "Relatório do Funil Comercial"
              : isPurchasesReport
                ? "Relatório de Compras"
                : "Relatório de Vendas";

  const printMeta = isFinanceReport
    ? `Financeiro · ${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)} · ${entryTypeLabel} · ${statusLabel} · ${categoryFilterLabel}`
    : isReceivablesReport
      ? `Contas a receber · ${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)} · ${statusLabel} · ${customerFilterLabel} · ${categoryFilterLabel}`
      : isPayablesReport
        ? `Contas a pagar · ${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)} · ${statusLabel} · ${supplierFilterLabel} · ${categoryFilterLabel}`
        : isStockReport
          ? `Estoque · ${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)} · ${productFilterLabel} · ${categoryFilterLabel} · ${situationFilterLabel}`
          : isCustomersReport
            ? `Clientes · ${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)} · ${statusLabel} · ${customersPersonTypeLabel} · ${customersStateFilterLabel} · ${customersCityFilterLabel}`
            : isFunnelReport
              ? `Funil comercial · ${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)} · ${funnelStageFilterLabel} · ${assignedFilterLabel} · ${customerFilterLabel}`
              : isPurchasesReport
                ? `Compras · ${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)} · ${statusLabel} · ${supplierFilterLabel}`
                : `Vendas · ${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)} · ${statusLabel} · ${customerFilterLabel}`;

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
            const selected =
              option.available && option.id === selectedReportType;
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
                  "relative cursor-pointer overflow-hidden rounded-2xl border-2 p-4 text-left transition duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/50",
                  "active:scale-[0.985]",
                  selected &&
                    "z-[1] -translate-y-px border-[var(--brand-coral)] bg-gradient-to-br from-[var(--brand-coral)]/[0.09] via-white to-white shadow-[0_6px_18px_rgb(196_147_159/0.22),0_2px_6px_rgb(17_32_59/0.06)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[var(--brand-coral)]",
                  !selected &&
                    !unavailable &&
                    "border-[var(--brand-navy)]/10 bg-white shadow-[0_1px_6px_rgb(17_32_59/0.04)] hover:border-[var(--brand-navy)]/18 hover:shadow-[0_2px_10px_rgb(17_32_59/0.06)]",
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
                        ? "bg-[var(--brand-coral)]/22 text-[var(--brand-coral)] ring-[var(--brand-coral)]/35"
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
                    "mt-3 text-sm",
                    selected
                      ? "font-bold text-[var(--brand-navy)]"
                      : "font-semibold text-[var(--brand-navy)]/70"
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
        <h2 className="text-xl font-bold text-[var(--brand-navy)]">
          {printTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {company?.name ? `${company.name} · ` : ""}
          {printMeta}
        </p>
      </div>

      {isFinanceReport ? (
        <FinanceReportPanel
          companyName={company?.name ?? ""}
          periodFrom={periodFrom}
          periodTo={periodTo}
          entryType={entryType}
          status={status}
          category={category}
          entries={entries}
          kpis={financeKpis}
          series={financeSeries}
          loading={loading}
          error={error}
          onEntryTypeChange={setEntryType}
          onStatusChange={setStatus}
          onCategoryChange={setCategory}
        />
      ) : isReceivablesReport ? (
        <ReceivablesReportPanel
          companyName={company?.name ?? ""}
          periodFrom={periodFrom}
          periodTo={periodTo}
          status={status}
          customerId={customerId}
          category={category}
          customers={receivablesCustomers}
          entries={receivablesEntries}
          kpis={receivablesKpis}
          series={receivablesSeries}
          loading={loading}
          error={error}
          onStatusChange={setStatus}
          onCustomerChange={setCustomerId}
          onCategoryChange={setCategory}
        />
      ) : isPayablesReport ? (
        <PayablesReportPanel
          companyName={company?.name ?? ""}
          periodFrom={periodFrom}
          periodTo={periodTo}
          status={status}
          supplierId={supplierId}
          category={category}
          suppliers={payablesSuppliers}
          entries={payablesEntries}
          kpis={payablesKpis}
          series={payablesSeries}
          loading={loading}
          error={error}
          onStatusChange={setStatus}
          onSupplierChange={setSupplierId}
          onCategoryChange={setCategory}
        />
      ) : isStockReport ? (
        <StockReportPanel
          companyName={company?.name ?? ""}
          periodFrom={periodFrom}
          periodTo={periodTo}
          productId={productId}
          category={category}
          situation={stockSituation}
          products={stockProducts}
          categories={stockCategories}
          rows={stockRows}
          kpis={stockKpis}
          series={stockSeries}
          lowBalanceSeries={stockLowBalanceSeries}
          loading={loading}
          error={error}
          onProductChange={setProductId}
          onCategoryChange={setCategory}
          onSituationChange={setStockSituation}
        />
      ) : isPurchasesReport ? (
        <PurchasesReportPanel
          companyName={company?.name ?? ""}
          periodFrom={periodFrom}
          periodTo={periodTo}
          status={status}
          supplierId={supplierId}
          suppliers={suppliers}
          purchases={purchases}
          kpis={purchasesKpis}
          series={purchasesSeries}
          loading={loading}
          error={error}
          onStatusChange={setStatus}
          onSupplierChange={setSupplierId}
        />
      ) : isCustomersReport ? (
        <CustomersReportPanel
          companyName={company?.name ?? ""}
          periodFrom={periodFrom}
          periodTo={periodTo}
          status={status}
          personType={personType}
          state={customerState}
          city={customerCity}
          stateOptions={customerStateOptions}
          cityOptions={customerCityOptions}
          rows={customersRows}
          kpis={customersKpis}
          series={customersSeries}
          salesDistribution={customersSalesDistribution}
          loading={loading}
          error={error}
          onStatusChange={setStatus}
          onPersonTypeChange={setPersonType}
          onStateChange={handleCustomerStateChange}
          onCityChange={setCustomerCity}
        />
      ) : isFunnelReport ? (
        <FunnelReportPanel
          companyName={company?.name ?? ""}
          periodFrom={periodFrom}
          periodTo={periodTo}
          stage={funnelStage}
          assignedUserId={assignedUserId}
          customerId={customerId}
          customers={funnelCustomers}
          members={funnelMembers}
          rows={funnelRows}
          kpis={funnelKpis}
          stages={funnelStages}
          lostSummary={funnelLostSummary}
          createdSeries={funnelCreatedSeries}
          loading={loading}
          error={error}
          onStageChange={setFunnelStage}
          onAssignedUserChange={setAssignedUserId}
          onCustomerChange={setCustomerId}
        />
      ) : (
        <SalesReportPanel
          companyName={company?.name ?? ""}
          periodFrom={periodFrom}
          periodTo={periodTo}
          status={status}
          customerId={customerId}
          customers={customers}
          sales={sales}
          kpis={salesKpis}
          series={salesSeries}
          loading={loading}
          error={error}
          onStatusChange={setStatus}
          onCustomerChange={setCustomerId}
        />
      )}
    </div>
  );
}
