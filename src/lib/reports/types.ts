export const REPORT_TYPES = {
  sales: "sales",
  purchases: "purchases",
  finance: "finance",
  receivables: "receivables",
  payables: "payables",
  stock: "stock",
  customers: "customers",
  funnel: "funnel",
} as const;

export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];

export type ReportTypeMeta = {
  id: ReportType;
  title: string;
  description: string;
  available: boolean;
};

export const REPORT_TYPE_OPTIONS: ReportTypeMeta[] = [
  {
    id: REPORT_TYPES.sales,
    title: "Vendas",
    description: "Faturamento, ticket médio e detalhamento por período",
    available: true,
  },
  {
    id: REPORT_TYPES.purchases,
    title: "Compras",
    description: "Aquisições e totais por fornecedor",
    available: true,
  },
  {
    id: REPORT_TYPES.finance,
    title: "Financeiro",
    description: "Visão consolidada de lançamentos",
    available: true,
  },
  {
    id: REPORT_TYPES.receivables,
    title: "Contas a receber",
    description: "Recebíveis por status e vencimento",
    available: true,
  },
  {
    id: REPORT_TYPES.payables,
    title: "Contas a pagar",
    description: "Obrigações por status e vencimento",
    available: true,
  },
  {
    id: REPORT_TYPES.stock,
    title: "Estoque",
    description: "Movimentações e posição de produtos",
    available: false,
  },
  {
    id: REPORT_TYPES.customers,
    title: "Clientes",
    description: "Base de clientes e situação cadastral",
    available: false,
  },
  {
    id: REPORT_TYPES.funnel,
    title: "Funil comercial",
    description: "Oportunidades, etapas e conversão",
    available: false,
  },
];
