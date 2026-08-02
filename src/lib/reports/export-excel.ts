import type { FinancialEntryWithRelations } from "@/lib/finance/actions";
import type { PurchaseListItem } from "@/lib/purchases/actions";
import type { SaleListItem } from "@/lib/sales/actions";
import {
  customerLabel,
  financeEntryTypeLabel,
  financeStatusLabel,
  formatDateBR,
  purchaseStatusLabel,
  receivablePartyLabel,
  saleStatusLabel,
  supplierLabel,
  toNumberAmount,
  type FinanceReportKpis,
  type PurchasesReportKpis,
  type ReceivablesReportKpis,
  type SalesReportKpis,
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
