export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "TR Control ERP";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  companies: "/companies",
  customers: "/customers",
  customersNew: "/customers/new",
  suppliers: "/suppliers",
  suppliersNew: "/suppliers/new",
  products: "/products",
  productsNew: "/products/new",
  stock: "/stock",
  stockMovements: "/stock/movements",
  stockEntry: "/stock/entry",
  stockExit: "/stock/exit",
  stockAdjustment: "/stock/adjustment",
  stockInventory: "/stock/inventory",
  purchases: "/purchases",
  purchasesNew: "/purchases/new",
  sales: "/sales",
  salesNew: "/sales/new",
  finance: "/finance",
  financeNew: "/finance/new",
  cashFlow: "/cash-flow",
  tasks: "/tasks",
  tasksNew: "/tasks/new",
  authCallback: "/api/auth/callback",
} as const;

export function customerDetailPath(id: string) {
  return `/customers/${id}`;
}

export function customerEditPath(id: string) {
  return `/customers/${id}/edit`;
}

export function supplierDetailPath(id: string) {
  return `/suppliers/${id}`;
}

export function supplierEditPath(id: string) {
  return `/suppliers/${id}/edit`;
}

export function financeDetailPath(id: string) {
  return `/finance/${id}`;
}

export function financeEditPath(id: string) {
  return `/finance/${id}/edit`;
}

export function productDetailPath(id: string) {
  return `/products/${id}`;
}

export function productEditPath(id: string) {
  return `/products/${id}/edit`;
}

export function stockProductHistoryPath(productId: string) {
  return `/stock/products/${productId}`;
}

export function stockMovementDetailPath(id: string) {
  return `/stock/movements/${id}`;
}

export function purchaseDetailPath(id: string) {
  return `/purchases/${id}`;
}

export function purchaseEditPath(id: string) {
  return `/purchases/${id}/edit`;
}

export function saleDetailPath(id: string) {
  return `/sales/${id}`;
}

export function saleEditPath(id: string) {
  return `/sales/${id}/edit`;
}

export function taskDetailPath(id: string) {
  return `/tasks/${id}`;
}

export function taskEditPath(id: string) {
  return `/tasks/${id}/edit`;
}

export const TASK_STATUS = {
  pending: "pending",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type TaskStatusValue =
  (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_OPTIONS = [
  { value: TASK_STATUS.pending, label: "Pendente" },
  { value: TASK_STATUS.in_progress, label: "Em andamento" },
  { value: TASK_STATUS.completed, label: "Concluída" },
  { value: TASK_STATUS.cancelled, label: "Cancelada" },
] as const;

export const TASK_PRIORITY = {
  low: "low",
  medium: "medium",
  high: "high",
  urgent: "urgent",
} as const;

export type TaskPriorityValue =
  (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const TASK_PRIORITY_OPTIONS = [
  { value: TASK_PRIORITY.low, label: "Baixa" },
  { value: TASK_PRIORITY.medium, label: "Média" },
  { value: TASK_PRIORITY.high, label: "Alta" },
  { value: TASK_PRIORITY.urgent, label: "Urgente" },
] as const;

export const PRODUCT_IMAGES_BUCKET = "product-images";

export const PRODUCT_STATUS = {
  active: "active",
  inactive: "inactive",
} as const;

export type ProductStatus =
  (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export const PRODUCT_STATUS_OPTIONS = [
  { value: PRODUCT_STATUS.active, label: "Ativo" },
  { value: PRODUCT_STATUS.inactive, label: "Inativo" },
] as const;

export const PRODUCT_TYPES = {
  product: "product",
  service: "service",
} as const;

export type ProductItemType =
  (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES];

export const PRODUCT_TYPE_OPTIONS = [
  { value: PRODUCT_TYPES.product, label: "Produto" },
  { value: PRODUCT_TYPES.service, label: "Serviço" },
] as const;

export const TRACK_STOCK_OPTIONS = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
] as const;

export const STOCK_MOVEMENT_TYPES = {
  entry: "entry",
  exit: "exit",
  adjustment: "adjustment",
  inventory: "inventory",
} as const;

export type StockMovementType =
  (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES];

export const STOCK_MOVEMENT_TYPE_OPTIONS = [
  { value: STOCK_MOVEMENT_TYPES.entry, label: "Entrada" },
  { value: STOCK_MOVEMENT_TYPES.exit, label: "Saída" },
  { value: STOCK_MOVEMENT_TYPES.adjustment, label: "Ajuste" },
  { value: STOCK_MOVEMENT_TYPES.inventory, label: "Inventário" },
] as const;

export const STOCK_ADJUSTMENT_DIRECTIONS = {
  increase: "increase",
  decrease: "decrease",
} as const;

export const STOCK_ADJUSTMENT_DIRECTION_OPTIONS = [
  { value: STOCK_ADJUSTMENT_DIRECTIONS.increase, label: "Aumentar estoque" },
  { value: STOCK_ADJUSTMENT_DIRECTIONS.decrease, label: "Diminuir estoque" },
] as const;

export const PURCHASE_STATUS = {
  draft: "draft",
  confirmed: "confirmed",
  cancelled: "cancelled",
} as const;

export type PurchaseStatus =
  (typeof PURCHASE_STATUS)[keyof typeof PURCHASE_STATUS];

export const PURCHASE_STATUS_OPTIONS = [
  { value: PURCHASE_STATUS.draft, label: "Rascunho" },
  { value: PURCHASE_STATUS.confirmed, label: "Confirmada" },
  { value: PURCHASE_STATUS.cancelled, label: "Cancelada" },
] as const;

export const SALE_STATUS = {
  draft: "draft",
  confirmed: "confirmed",
  cancelled: "cancelled",
} as const;

export type SaleStatus = (typeof SALE_STATUS)[keyof typeof SALE_STATUS];

export const SALE_STATUS_OPTIONS = [
  { value: SALE_STATUS.draft, label: "Rascunho" },
  { value: SALE_STATUS.confirmed, label: "Confirmada" },
  { value: SALE_STATUS.cancelled, label: "Cancelada" },
] as const;

export const PRODUCT_UNITS = [
  { value: "UN", label: "UN — Unidade" },
  { value: "PC", label: "PC — Peça" },
  { value: "CX", label: "CX — Caixa" },
  { value: "KG", label: "KG — Quilograma" },
  { value: "G", label: "G — Grama" },
  { value: "L", label: "L — Litro" },
  { value: "ML", label: "ML — Mililitro" },
  { value: "M", label: "M — Metro" },
  { value: "M2", label: "M² — Metro quadrado" },
  { value: "M3", label: "M³ — Metro cúbico" },
  { value: "PAR", label: "PAR — Par" },
  { value: "DZ", label: "DZ — Dúzia" },
] as const;

export const PRODUCT_CATEGORIES = [
  "Geral",
  "Eletrônicos",
  "Informática",
  "Alimentos",
  "Bebidas",
  "Higiene",
  "Limpeza",
  "Vestuário",
  "Ferramentas",
  "Serviços",
  "Outros",
] as const;

export const FINANCIAL_ENTRY_TYPES = {
  payable: "payable",
  receivable: "receivable",
} as const;

export type FinancialEntryType =
  (typeof FINANCIAL_ENTRY_TYPES)[keyof typeof FINANCIAL_ENTRY_TYPES];

export const FINANCIAL_ENTRY_TYPE_OPTIONS = [
  { value: FINANCIAL_ENTRY_TYPES.payable, label: "Contas a pagar" },
  { value: FINANCIAL_ENTRY_TYPES.receivable, label: "Contas a receber" },
] as const;

export const FINANCIAL_STATUS = {
  pending: "pending",
  paid: "paid",
  received: "received",
  overdue: "overdue",
  cancelled: "cancelled",
} as const;

export type FinancialStatus =
  (typeof FINANCIAL_STATUS)[keyof typeof FINANCIAL_STATUS];

export const FINANCIAL_STATUS_OPTIONS = [
  { value: FINANCIAL_STATUS.pending, label: "Pendente" },
  { value: FINANCIAL_STATUS.paid, label: "Pago" },
  { value: FINANCIAL_STATUS.received, label: "Recebido" },
  { value: FINANCIAL_STATUS.overdue, label: "Vencido" },
  { value: FINANCIAL_STATUS.cancelled, label: "Cancelado" },
] as const;

export const FINANCIAL_CATEGORIES = [
  "Aluguel",
  "Salários",
  "Fornecedores",
  "Impostos",
  "Serviços",
  "Vendas",
  "Comissões",
  "Utilidades",
  "Marketing",
  "Outros",
] as const;

export const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "bank_transfer", label: "Transferência" },
  { value: "cash", label: "Dinheiro" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Outro" },
] as const;

export const CASH_FLOW_MODES = {
  realized: "realized",
  projected: "projected",
} as const;

export type CashFlowMode =
  (typeof CASH_FLOW_MODES)[keyof typeof CASH_FLOW_MODES];

export const CASH_FLOW_MODE_OPTIONS = [
  { value: CASH_FLOW_MODES.realized, label: "Realizado" },
  { value: CASH_FLOW_MODES.projected, label: "Projetado" },
] as const;

export const CASH_FLOW_DIRECTIONS = {
  all: "all",
  inflow: "inflow",
  outflow: "outflow",
} as const;

export const CASH_FLOW_DIRECTION_OPTIONS = [
  { value: CASH_FLOW_DIRECTIONS.all, label: "Entradas e saídas" },
  { value: CASH_FLOW_DIRECTIONS.inflow, label: "Entradas" },
  { value: CASH_FLOW_DIRECTIONS.outflow, label: "Saídas" },
] as const;

export const CASH_FLOW_ORIGINS = {
  sale: "sale",
  purchase: "purchase",
  manual: "manual",
  other: "other",
} as const;

export type CashFlowOrigin =
  (typeof CASH_FLOW_ORIGINS)[keyof typeof CASH_FLOW_ORIGINS];

export const CASH_FLOW_ORIGIN_OPTIONS = [
  { value: CASH_FLOW_ORIGINS.sale, label: "Venda" },
  { value: CASH_FLOW_ORIGINS.purchase, label: "Compra" },
  { value: CASH_FLOW_ORIGINS.manual, label: "Lançamento manual" },
  { value: CASH_FLOW_ORIGINS.other, label: "Outro" },
] as const;

export const CASH_FLOW_GRAINS = {
  day: "day",
  week: "week",
  month: "month",
} as const;

export type CashFlowGrain =
  (typeof CASH_FLOW_GRAINS)[keyof typeof CASH_FLOW_GRAINS];

export const CASH_FLOW_GRAIN_OPTIONS = [
  { value: CASH_FLOW_GRAINS.day, label: "Diária" },
  { value: CASH_FLOW_GRAINS.week, label: "Semanal" },
  { value: CASH_FLOW_GRAINS.month, label: "Mensal" },
] as const;

export const PERSON_TYPES = {
  individual: "individual",
  company: "company",
} as const;

export type PersonType = (typeof PERSON_TYPES)[keyof typeof PERSON_TYPES];

export const PERSON_TYPE_OPTIONS = [
  { value: PERSON_TYPES.individual, label: "Pessoa física" },
  { value: PERSON_TYPES.company, label: "Pessoa jurídica" },
] as const;

export const CUSTOMER_STATUS = {
  active: "active",
  inactive: "inactive",
} as const;

export type CustomerStatus =
  (typeof CUSTOMER_STATUS)[keyof typeof CUSTOMER_STATUS];

export const CUSTOMER_STATUS_OPTIONS = [
  { value: CUSTOMER_STATUS.active, label: "Ativo" },
  { value: CUSTOMER_STATUS.inactive, label: "Inativo" },
] as const;

export const SUPPLIER_STATUS = CUSTOMER_STATUS;
export type SupplierStatus = CustomerStatus;
export const SUPPLIER_STATUS_OPTIONS = CUSTOMER_STATUS_OPTIONS;

export const SUPPLIER_CATEGORIES = [
  "Materiais",
  "Serviços",
  "Transportes",
  "Tecnologia",
  "Utilidades",
  "Imobiliário",
  "Consultoria",
  "Outros",
] as const;

export const COMPANY_ROLES = {
  owner: "owner",
  admin: "admin",
  member: "member",
} as const;

export type CompanyRole =
  (typeof COMPANY_ROLES)[keyof typeof COMPANY_ROLES];

export const COMPANY_PLANS = {
  free: "free",
  starter: "starter",
  business: "business",
  enterprise: "enterprise",
} as const;

export type CompanyPlan =
  (typeof COMPANY_PLANS)[keyof typeof COMPANY_PLANS];

export const COMPANY_LOGOS_BUCKET = "company-logos";

export const TAX_REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
  { value: "isento", label: "Isento" },
] as const;

export type TaxRegime = (typeof TAX_REGIMES)[number]["value"];

export const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const;
