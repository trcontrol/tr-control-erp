import type { SaleListItem } from "@/lib/sales/actions";
import {
  customerLabel,
  formatDateBR,
  saleStatusLabel,
  toNumberAmount,
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
