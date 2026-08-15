import type { FinancialEntryWithRelations } from "@/lib/finance/entry-query";
import { opportunityStageLabel } from "@/lib/funnel/format";
import type { PurchaseListItem } from "@/lib/purchases/actions";
import type { SaleListItem } from "@/lib/sales/actions";
import type { StockMovementWithRelations } from "@/lib/stock/actions";
import { stockMovementTypeLabel } from "@/lib/stock/format";
import {
  customerGeoLabel,
  customerLabel,
  customerStatusLabel,
  financeEntryTypeLabel,
  financeStatusLabel,
  formatDateBR,
  formatFunnelConversionRate,
  funnelAssignedUserLabel,
  funnelOpportunityCustomerLabel,
  opportunityCreatedDate,
  payablePartyLabel,
  personTypeLabel,
  productStockValue,
  purchaseStatusLabel,
  receivablePartyLabel,
  saleStatusLabel,
  supplierLabel,
  toNumberAmount,
  type CustomersReportKpis,
  type CustomersReportRow,
  type FinanceReportKpis,
  type FunnelReportKpis,
  type FunnelReportRow,
  type FunnelReportStageRow,
  type PayablesReportKpis,
  type PurchasesReportKpis,
  type ReceivablesReportKpis,
  type SalesReportKpis,
  type StockReportKpis,
  type StockReportRow,
} from "@/lib/reports/format";

export type SalesExcelExportInput = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  statusLabel: string;
  customerFilterLabel: string;
  sales: SaleListItem[];
  kpis: SalesReportKpis;
};

export type PurchasesExcelExportInput = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  statusLabel: string;
  supplierFilterLabel: string;
  purchases: PurchaseListItem[];
  kpis: PurchasesReportKpis;
};

export type FinanceExcelExportInput = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  statusLabel: string;
  entryTypeLabel: string;
  categoryFilterLabel: string;
  entries: FinancialEntryWithRelations[];
  kpis: FinanceReportKpis;
};

export type ReceivablesExcelExportInput = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  statusLabel: string;
  customerFilterLabel: string;
  categoryFilterLabel: string;
  entries: FinancialEntryWithRelations[];
  kpis: ReceivablesReportKpis;
};

export type PayablesExcelExportInput = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  statusLabel: string;
  supplierFilterLabel: string;
  categoryFilterLabel: string;
  entries: FinancialEntryWithRelations[];
  kpis: PayablesReportKpis;
};

export type StockExcelExportInput = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  productFilterLabel: string;
  categoryFilterLabel: string;
  situationFilterLabel: string;
  rows: StockReportRow[];
  movements: StockMovementWithRelations[];
  kpis: StockReportKpis;
};

export type CustomersExcelExportInput = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  statusLabel: string;
  personTypeLabel: string;
  stateFilterLabel: string;
  cityFilterLabel: string;
  rows: CustomersReportRow[];
  kpis: CustomersReportKpis;
};

export type FunnelExcelExportInput = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  stageFilterLabel: string;
  assignedFilterLabel: string;
  customerFilterLabel: string;
  rows: FunnelReportRow[];
  stages: FunnelReportStageRow[];
  lostSummary: FunnelReportStageRow;
  kpis: FunnelReportKpis;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportSalesReportExcel(input: SalesExcelExportInput) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TR Control ERP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "label", width: 28 },
    { header: "Valor", key: "value", width: 24 },
  ];

  summary.addRows([
    { label: "Empresa", value: input.companyName },
    {
      label: "Período",
      value: `${formatDateBR(input.periodFrom)} a ${formatDateBR(input.periodTo)}`,
    },
    { label: "Status", value: input.statusLabel },
    { label: "Cliente", value: input.customerFilterLabel },
    { label: "Total do período", value: toNumberAmount(input.kpis.totalAmount) },
    { label: "Quantidade de vendas", value: input.kpis.salesCount },
    { label: "Ticket médio", value: toNumberAmount(input.kpis.averageTicket) },
    {
      label: "Confirmadas (valor)",
      value: toNumberAmount(input.kpis.confirmedAmount),
    },
    { label: "Confirmadas (qtd.)", value: input.kpis.confirmedCount },
    { label: "Rascunhos", value: input.kpis.draftCount },
    { label: "Canceladas", value: input.kpis.cancelledCount },
  ]);

  summary.getCell("B6").numFmt = '"R$"#,##0.00';
  summary.getCell("B8").numFmt = '"R$"#,##0.00';
  summary.getCell("B9").numFmt = '"R$"#,##0.00';

  const details = workbook.addWorksheet("Vendas");
  details.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Cliente", key: "customer", width: 32 },
    { header: "Documento", key: "document", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Subtotal itens", key: "itemsSubtotal", width: 16 },
    { header: "Desconto", key: "discount", width: 14 },
    { header: "Frete", key: "freight", width: 14 },
    { header: "Total", key: "total", width: 16 },
  ];

  for (const sale of input.sales) {
    details.addRow({
      date: formatDateBR(sale.sale_date),
      customer: customerLabel(sale.customer),
      document: sale.document_number || "—",
      status: saleStatusLabel(sale.status),
      itemsSubtotal: toNumberAmount(sale.items_subtotal),
      discount: toNumberAmount(sale.discount_amount),
      freight: toNumberAmount(sale.freight_amount),
      total: toNumberAmount(sale.total_amount),
    });
  }

  for (const key of ["itemsSubtotal", "discount", "freight", "total"] as const) {
    details.getColumn(key).numFmt = '"R$"#,##0.00';
  }

  details.getRow(1).font = { bold: true };
  summary.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `relatorio-vendas_${stamp}.xlsx`);
}

export async function exportPurchasesReportExcel(
  input: PurchasesExcelExportInput
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TR Control ERP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "label", width: 28 },
    { header: "Valor", key: "value", width: 24 },
  ];

  summary.addRows([
    { label: "Empresa", value: input.companyName },
    {
      label: "Período",
      value: `${formatDateBR(input.periodFrom)} a ${formatDateBR(input.periodTo)}`,
    },
    { label: "Status", value: input.statusLabel },
    { label: "Fornecedor", value: input.supplierFilterLabel },
    { label: "Total do período", value: toNumberAmount(input.kpis.totalAmount) },
    { label: "Quantidade de compras", value: input.kpis.purchasesCount },
    { label: "Ticket médio", value: toNumberAmount(input.kpis.averageTicket) },
    {
      label: "Confirmadas (valor)",
      value: toNumberAmount(input.kpis.confirmedAmount),
    },
    { label: "Confirmadas (qtd.)", value: input.kpis.confirmedCount },
    { label: "Rascunhos", value: input.kpis.draftCount },
    { label: "Canceladas", value: input.kpis.cancelledCount },
  ]);

  summary.getCell("B6").numFmt = '"R$"#,##0.00';
  summary.getCell("B8").numFmt = '"R$"#,##0.00';
  summary.getCell("B9").numFmt = '"R$"#,##0.00';

  const details = workbook.addWorksheet("Compras");
  details.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Fornecedor", key: "supplier", width: 32 },
    { header: "Documento", key: "document", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Subtotal itens", key: "itemsSubtotal", width: 16 },
    { header: "Desconto", key: "discount", width: 14 },
    { header: "Frete", key: "freight", width: 14 },
    { header: "Total", key: "total", width: 16 },
  ];

  for (const purchase of input.purchases) {
    details.addRow({
      date: formatDateBR(purchase.purchase_date),
      supplier: supplierLabel(purchase.supplier),
      document: purchase.document_number || "—",
      status: purchaseStatusLabel(purchase.status),
      itemsSubtotal: toNumberAmount(purchase.items_subtotal),
      discount: toNumberAmount(purchase.discount_amount),
      freight: toNumberAmount(purchase.freight_amount),
      total: toNumberAmount(purchase.total_amount),
    });
  }

  for (const key of ["itemsSubtotal", "discount", "freight", "total"] as const) {
    details.getColumn(key).numFmt = '"R$"#,##0.00';
  }

  details.getRow(1).font = { bold: true };
  summary.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `relatorio-compras_${stamp}.xlsx`);
}

export async function exportFinanceReportExcel(input: FinanceExcelExportInput) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TR Control ERP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "label", width: 28 },
    { header: "Valor", key: "value", width: 28 },
  ];

  summary.addRows([
    { label: "Empresa", value: input.companyName },
    {
      label: "Período",
      value: `${formatDateBR(input.periodFrom)} a ${formatDateBR(input.periodTo)}`,
    },
    { label: "Tipo de movimentação", value: input.entryTypeLabel },
    { label: "Status", value: input.statusLabel },
    { label: "Categoria", value: input.categoryFilterLabel },
    { label: "Receitas", value: toNumberAmount(input.kpis.totalReceitas) },
    { label: "Despesas", value: toNumberAmount(input.kpis.totalDespesas) },
    { label: "Saldo", value: toNumberAmount(input.kpis.saldoPeriodo) },
    { label: "A receber", value: toNumberAmount(input.kpis.totalAReceber) },
    { label: "A pagar", value: toNumberAmount(input.kpis.totalAPagar) },
    { label: "Em atraso", value: toNumberAmount(input.kpis.totalEmAtraso) },
  ]);

  for (const row of [6, 7, 8, 9, 10, 11] as const) {
    summary.getCell(`B${row}`).numFmt = '"R$"#,##0.00';
  }

  const details = workbook.addWorksheet("Lançamentos");
  details.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Descrição", key: "description", width: 36 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Tipo", key: "type", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Vencimento", key: "dueDate", width: 14 },
    { header: "Valor", key: "amount", width: 16 },
  ];

  for (const entry of input.entries) {
    details.addRow({
      date: formatDateBR(entry.issue_date),
      description: entry.description || "—",
      category: entry.category || "—",
      type: financeEntryTypeLabel(entry.entry_type),
      status: financeStatusLabel(entry.status),
      dueDate: formatDateBR(entry.due_date),
      amount: toNumberAmount(entry.amount),
    });
  }

  details.getColumn("amount").numFmt = '"R$"#,##0.00';
  details.getRow(1).font = { bold: true };
  summary.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `relatorio-financeiro_${stamp}.xlsx`);
}

export async function exportReceivablesReportExcel(
  input: ReceivablesExcelExportInput
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TR Control ERP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "label", width: 28 },
    { header: "Valor", key: "value", width: 28 },
  ];

  summary.addRows([
    { label: "Empresa", value: input.companyName },
    {
      label: "Período",
      value: `${formatDateBR(input.periodFrom)} a ${formatDateBR(input.periodTo)}`,
    },
    { label: "Status", value: input.statusLabel },
    { label: "Cliente", value: input.customerFilterLabel },
    { label: "Categoria", value: input.categoryFilterLabel },
    {
      label: "Total a receber",
      value: toNumberAmount(input.kpis.totalAReceber),
    },
    { label: "Recebido", value: toNumberAmount(input.kpis.totalRecebido) },
    { label: "Pendente", value: toNumberAmount(input.kpis.totalPendente) },
    { label: "Em atraso", value: toNumberAmount(input.kpis.totalEmAtraso) },
    { label: "Quantidade", value: input.kpis.entriesCount },
    { label: "Ticket médio", value: toNumberAmount(input.kpis.averageTicket) },
  ]);

  for (const row of [6, 7, 8, 9, 11] as const) {
    summary.getCell(`B${row}`).numFmt = '"R$"#,##0.00';
  }

  const details = workbook.addWorksheet("Contas a receber");
  details.columns = [
    { header: "Vencimento", key: "dueDate", width: 14 },
    { header: "Descrição", key: "description", width: 36 },
    { header: "Cliente", key: "customer", width: 32 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Valor", key: "amount", width: 16 },
    { header: "Data de recebimento", key: "paymentDate", width: 18 },
  ];

  for (const entry of input.entries) {
    details.addRow({
      dueDate: formatDateBR(entry.due_date),
      description: entry.description || "—",
      customer: receivablePartyLabel(entry),
      category: entry.category || "—",
      status: financeStatusLabel(entry.status),
      amount: toNumberAmount(entry.amount),
      paymentDate: entry.payment_date
        ? formatDateBR(entry.payment_date)
        : "—",
    });
  }

  details.getColumn("amount").numFmt = '"R$"#,##0.00';
  details.getRow(1).font = { bold: true };
  summary.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `relatorio-contas-a-receber_${stamp}.xlsx`);
}

export async function exportPayablesReportExcel(
  input: PayablesExcelExportInput
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TR Control ERP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "label", width: 28 },
    { header: "Valor", key: "value", width: 28 },
  ];

  summary.addRows([
    { label: "Empresa", value: input.companyName },
    {
      label: "Período",
      value: `${formatDateBR(input.periodFrom)} a ${formatDateBR(input.periodTo)}`,
    },
    { label: "Status", value: input.statusLabel },
    { label: "Fornecedor", value: input.supplierFilterLabel },
    { label: "Categoria", value: input.categoryFilterLabel },
    {
      label: "Total a pagar",
      value: toNumberAmount(input.kpis.totalAPagar),
    },
    { label: "Pago", value: toNumberAmount(input.kpis.totalPago) },
    { label: "Pendente", value: toNumberAmount(input.kpis.totalPendente) },
    { label: "Em atraso", value: toNumberAmount(input.kpis.totalEmAtraso) },
    { label: "Quantidade", value: input.kpis.entriesCount },
    { label: "Ticket médio", value: toNumberAmount(input.kpis.averageTicket) },
  ]);

  for (const row of [6, 7, 8, 9, 11] as const) {
    summary.getCell(`B${row}`).numFmt = '"R$"#,##0.00';
  }

  const details = workbook.addWorksheet("Contas a pagar");
  details.columns = [
    { header: "Vencimento", key: "dueDate", width: 14 },
    { header: "Descrição", key: "description", width: 36 },
    { header: "Fornecedor", key: "supplier", width: 32 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Valor", key: "amount", width: 16 },
    { header: "Data de pagamento", key: "paymentDate", width: 18 },
  ];

  for (const entry of input.entries) {
    details.addRow({
      dueDate: formatDateBR(entry.due_date),
      description: entry.description || "—",
      supplier: payablePartyLabel(entry),
      category: entry.category || "—",
      status: financeStatusLabel(entry.status),
      amount: toNumberAmount(entry.amount),
      paymentDate: entry.payment_date
        ? formatDateBR(entry.payment_date)
        : "—",
    });
  }

  details.getColumn("amount").numFmt = '"R$"#,##0.00';
  details.getRow(1).font = { bold: true };
  summary.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `relatorio-contas-a-pagar_${stamp}.xlsx`);
}

export async function exportStockReportExcel(input: StockExcelExportInput) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TR Control ERP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "label", width: 32 },
    { header: "Valor", key: "value", width: 28 },
  ];

  summary.addRows([
    { label: "Empresa", value: input.companyName },
    {
      label: "Período (movimentações)",
      value: `${formatDateBR(input.periodFrom)} a ${formatDateBR(input.periodTo)}`,
    },
    { label: "Produto", value: input.productFilterLabel },
    { label: "Categoria", value: input.categoryFilterLabel },
    { label: "Situação", value: input.situationFilterLabel },
    {
      label: "Valor total em estoque",
      value: toNumberAmount(input.kpis.totalStockValue),
    },
    {
      label: "Quantidade total de itens",
      value: toNumberAmount(input.kpis.totalControlledQuantity),
    },
    {
      label: "Produtos controlados",
      value: input.kpis.trackedProductsCount,
    },
    {
      label: "Produtos com estoque disponível",
      value: input.kpis.availableProductsCount,
    },
    {
      label: "Produtos abaixo do mínimo",
      value: input.kpis.belowMinProductsCount,
    },
    {
      label: "Produtos sem estoque",
      value: input.kpis.outOfStockProductsCount,
    },
    {
      label: "Total de entradas no período",
      value: toNumberAmount(input.kpis.entriesInPeriod),
    },
    {
      label: "Total de saídas no período",
      value: toNumberAmount(input.kpis.exitsInPeriod),
    },
  ]);

  summary.getCell("B6").numFmt = '"R$"#,##0.00';
  summary.getRow(1).font = { bold: true };

  const stockSheet = workbook.addWorksheet("Estoque");
  stockSheet.columns = [
    { header: "Produto", key: "product", width: 32 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Código / SKU", key: "code", width: 18 },
    { header: "Estoque atual", key: "currentStock", width: 14 },
    { header: "Estoque mínimo", key: "minStock", width: 14 },
    { header: "Situação", key: "situation", width: 18 },
    { header: "Custo médio", key: "avgCost", width: 14 },
    { header: "Valor em estoque", key: "stockValue", width: 16 },
    { header: "Última movimentação", key: "lastMovement", width: 18 },
  ];

  for (const row of input.rows) {
    stockSheet.addRow({
      product: row.product.name,
      category: row.product.category || "—",
      code: row.codeLabel,
      currentStock: toNumberAmount(row.product.current_stock),
      minStock: toNumberAmount(row.product.min_stock),
      situation: row.situationLabel,
      avgCost: toNumberAmount(row.product.cost_price),
      stockValue: productStockValue(row.product),
      lastMovement: row.lastMovementDate
        ? formatDateBR(row.lastMovementDate)
        : "—",
    });
  }

  for (const key of ["avgCost", "stockValue"] as const) {
    stockSheet.getColumn(key).numFmt = '"R$"#,##0.00';
  }
  stockSheet.getRow(1).font = { bold: true };

  const movementsSheet = workbook.addWorksheet("Movimentações");
  movementsSheet.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Produto", key: "product", width: 32 },
    { header: "Tipo", key: "type", width: 14 },
    { header: "Quantidade", key: "quantity", width: 14 },
    { header: "Saldo anterior", key: "previousStock", width: 14 },
    { header: "Novo saldo", key: "newStock", width: 14 },
    { header: "Observações", key: "notes", width: 36 },
  ];

  for (const movement of input.movements) {
    movementsSheet.addRow({
      date: formatDateBR(movement.movement_date),
      product: movement.product?.name || "—",
      type: stockMovementTypeLabel(movement.movement_type),
      quantity: toNumberAmount(movement.quantity),
      previousStock: toNumberAmount(movement.previous_stock ?? 0),
      newStock: toNumberAmount(movement.new_stock ?? 0),
      notes: movement.notes || "—",
    });
  }

  movementsSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `relatorio-estoque_${stamp}.xlsx`);
}

export async function exportCustomersReportExcel(
  input: CustomersExcelExportInput
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TR Control ERP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "label", width: 32 },
    { header: "Valor", key: "value", width: 28 },
  ];

  summary.addRows([
    { label: "Empresa", value: input.companyName },
    {
      label: "Período",
      value: `${formatDateBR(input.periodFrom)} a ${formatDateBR(input.periodTo)}`,
    },
    { label: "Status", value: input.statusLabel },
    { label: "Tipo de cliente", value: input.personTypeLabel },
    { label: "UF", value: input.stateFilterLabel },
    { label: "Cidade", value: input.cityFilterLabel },
    { label: "Total de clientes", value: input.kpis.totalCustomers },
    { label: "Clientes ativos", value: input.kpis.activeCustomers },
    { label: "Clientes inativos", value: input.kpis.inactiveCustomers },
    { label: "Novos no período", value: input.kpis.newInPeriod },
    { label: "Clientes com vendas", value: input.kpis.withSales },
    { label: "Clientes sem vendas", value: input.kpis.withoutSales },
    {
      label: "Ticket médio por cliente",
      value: toNumberAmount(input.kpis.averageTicketPerCustomer),
    },
  ]);

  summary.getCell("B13").numFmt = '"R$"#,##0.00';
  summary.getRow(1).font = { bold: true };

  const details = workbook.addWorksheet("Clientes");
  details.columns = [
    { header: "Nome", key: "name", width: 32 },
    { header: "Documento", key: "document", width: 18 },
    { header: "E-mail", key: "email", width: 28 },
    { header: "Telefone", key: "phone", width: 16 },
    { header: "Cidade", key: "city", width: 18 },
    { header: "UF", key: "state", width: 8 },
    { header: "Status", key: "status", width: 12 },
    { header: "Tipo", key: "personType", width: 16 },
    { header: "Data de cadastro", key: "createdAt", width: 16 },
    { header: "Qtd. vendas", key: "salesCount", width: 12 },
    { header: "Valor total comprado", key: "totalPurchased", width: 20 },
  ];

  for (const row of input.rows) {
    details.addRow({
      name: customerLabel(row.customer),
      document: row.customer.document || "—",
      email: row.customer.email || "—",
      phone: row.customer.phone || "—",
      city: customerGeoLabel(row.customer.city),
      state: customerGeoLabel(row.customer.state),
      status: customerStatusLabel(row.customer.status),
      personType: personTypeLabel(row.customer.person_type),
      createdAt: formatDateBR(row.customer.created_at.slice(0, 10)),
      salesCount: row.salesCount,
      totalPurchased: toNumberAmount(row.totalPurchased),
    });
  }

  details.getColumn("totalPurchased").numFmt = '"R$"#,##0.00';
  details.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `relatorio-clientes_${stamp}.xlsx`);
}

export async function exportFunnelReportExcel(input: FunnelExcelExportInput) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TR Control ERP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "label", width: 36 },
    { header: "Valor", key: "value", width: 28 },
  ];

  summary.addRows([
    { label: "Empresa", value: input.companyName },
    {
      label: "Período",
      value: `${formatDateBR(input.periodFrom)} a ${formatDateBR(input.periodTo)}`,
    },
    { label: "Etapa", value: input.stageFilterLabel },
    { label: "Responsável", value: input.assignedFilterLabel },
    { label: "Cliente", value: input.customerFilterLabel },
    {
      label: "Total de oportunidades",
      value: input.kpis.totalCount,
    },
    {
      label: "Valor total estimado",
      value: toNumberAmount(input.kpis.totalValue),
    },
    {
      label: "Oportunidades em aberto",
      value: input.kpis.openCount,
    },
    {
      label: "Valor em aberto",
      value: toNumberAmount(input.kpis.openValue),
    },
    {
      label: "Contratos fechados",
      value: input.kpis.closedCount,
    },
    {
      label: "Oportunidades perdidas",
      value: input.kpis.lostCount,
    },
    {
      label: "Taxa de conversão",
      value: formatFunnelConversionRate(input.kpis.conversionRate),
    },
    {
      label: "Ticket médio fechado",
      value: toNumberAmount(input.kpis.averageClosedTicket),
    },
  ]);

  summary.addRow({ label: "", value: "" });
  summary.addRow({ label: "Valores por etapa", value: "" });

  const stageValueRows: number[] = [];

  for (const stage of input.stages) {
    summary.addRow({
      label: `${stage.label} (qtd)`,
      value: stage.count,
    });
    const valueRow = summary.addRow({
      label: `${stage.label} (valor)`,
      value: toNumberAmount(stage.totalValue),
    });
    stageValueRows.push(valueRow.number);
  }

  summary.addRow({
    label: `${input.lostSummary.label} (qtd)`,
    value: input.lostSummary.count,
  });
  const lostValueRow = summary.addRow({
    label: `${input.lostSummary.label} (valor)`,
    value: toNumberAmount(input.lostSummary.totalValue),
  });

  summary.getCell("B8").numFmt = '"R$"#,##0.00';
  summary.getCell("B10").numFmt = '"R$"#,##0.00';
  summary.getCell("B14").numFmt = '"R$"#,##0.00';
  for (const rowNumber of stageValueRows) {
    summary.getCell(`B${rowNumber}`).numFmt = '"R$"#,##0.00';
  }
  summary.getCell(`B${lostValueRow.number}`).numFmt = '"R$"#,##0.00';
  summary.getRow(1).font = { bold: true };

  const details = workbook.addWorksheet("Oportunidades");
  details.columns = [
    { header: "Data de criação", key: "createdAt", width: 16 },
    { header: "Oportunidade", key: "title", width: 34 },
    { header: "Cliente", key: "customer", width: 28 },
    { header: "Responsável", key: "assigned", width: 22 },
    { header: "Etapa", key: "stage", width: 22 },
    { header: "Valor estimado", key: "estimatedValue", width: 16 },
    { header: "Próxima ação", key: "nextAction", width: 14 },
  ];

  for (const row of input.rows) {
    details.addRow({
      createdAt: formatDateBR(opportunityCreatedDate(row)),
      title: row.title,
      customer: funnelOpportunityCustomerLabel(row),
      assigned: funnelAssignedUserLabel(row),
      stage: opportunityStageLabel(row.stage),
      estimatedValue: toNumberAmount(row.estimated_value),
      nextAction: row.next_action_date
        ? formatDateBR(row.next_action_date)
        : "—",
    });
  }

  details.getColumn("estimatedValue").numFmt = '"R$"#,##0.00';
  details.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `relatorio-funil-comercial_${stamp}.xlsx`);
}
