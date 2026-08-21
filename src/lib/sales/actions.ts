"use server";

/**
 * Sales — server actions com enforcement:
 * plan entitlement ∩ member_permissions (can_view/create/edit/delete).
 *
 * confirm / cancel → can_edit (efeitos finance/estoque são do domínio Sales).
 * Scope (all/own/team) NÃO é aplicado nesta fase.
 *
 * Relatórios leem via sale-query + client próprio (sem exigir sales.view).
 */
import { SALE_STATUS } from "@/lib/constants";
import { assertMemberPermission } from "@/lib/plans/require-module-access";
import { calcLineTotal } from "@/lib/sales/format";
import {
  PAYMENT_CONDITIONS,
  type PaymentCondition,
  validateInstallmentSchedule,
} from "@/lib/sales/installments";
import {
  querySale,
  querySales,
  type SaleListItem,
  type SaleWithRelations,
} from "@/lib/sales/sale-query";
import { createClient } from "@/lib/supabase/server";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import type {
  Sale,
  SaleInsert,
  SaleItemInsert,
  SalePaymentScheduleInsert,
} from "@/types/database";

export type {
  SaleItemWithProduct,
  SaleListItem,
  SaleWithRelations,
} from "@/lib/sales/sale-query";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type SaleItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  sort_order?: number;
};

export type SaleScheduleInput = {
  installment_number: number;
  installment_count: number;
  due_date: string;
  amount: number;
  payment_method?: string | null;
};

type SaleHeaderInput = Omit<SaleInsert, "company_id" | "status"> & {
  payment_condition?: PaymentCondition | string;
};

async function deny<T>(message: string): Promise<Result<T>> {
  return { data: null, error: { message } };
}

function mapPgError(message: string) {
  if (message.includes("pago ou recebido") || message.includes("recebido")) {
    return message;
  }
  if (message.includes("Estoque insuficiente")) return message;
  if (message.includes("sem itens")) return message;
  if (message.includes("cliente")) return message;
  if (message.includes("duplicidade") || message.includes("Já existem")) {
    return message;
  }
  if (message.includes("rascunho")) return message;
  if (message.includes("quantidade")) return message;
  if (message.includes("unitário") || message.includes("negativo")) {
    return message;
  }
  if (message.includes("Sem permissão")) return message;
  if (message.includes("parcela") || message.includes("parcelas")) {
    return message;
  }
  if (message.includes("plano de pagamento") || message.includes("installment")) {
    return message;
  }
  return message;
}

async function callSaleRpc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { rpc: (...args: any[]) => any },
  fn: "confirm_sale" | "cancel_sale" | "recalculate_sale_totals",
  args: Record<string, unknown>
) {
  return supabase.rpc(fn, args) as Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

function validateItems(items: SaleItemInput[]): string | null {
  if (items.length === 0) {
    return "Adicione pelo menos um produto ou serviço à venda.";
  }

  for (const item of items) {
    if (!item.product_id) return "Selecione o produto de cada item.";
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return "A quantidade de cada item deve ser maior que zero.";
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
      return "O valor unitário não pode ser negativo.";
    }
    if (!Number.isFinite(item.discount_amount) || item.discount_amount < 0) {
      return "O desconto do item não pode ser negativo.";
    }
  }

  return null;
}

function normalizePaymentCondition(
  value?: string | null
): PaymentCondition {
  if (value === PAYMENT_CONDITIONS.installment) {
    return PAYMENT_CONDITIONS.installment;
  }
  return PAYMENT_CONDITIONS.cash;
}

async function replaceSaleSchedules(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any };
  companyId: string;
  saleId: string;
  paymentCondition: PaymentCondition;
  schedules: SaleScheduleInput[] | undefined;
  saleTotal: number;
}): Promise<string | null> {
  const { supabase, companyId, saleId, paymentCondition, schedules, saleTotal } =
    params;

  if (paymentCondition === PAYMENT_CONDITIONS.installment) {
    const rows = schedules ?? [];
    const validationError = validateInstallmentSchedule({
      saleTotal,
      rows: rows.map((row) => ({
        installment_number: row.installment_number,
        installment_count: row.installment_count,
        due_date: row.due_date,
        amount: row.amount,
        payment_method: row.payment_method ?? null,
      })),
    });
    if (validationError) return validationError;
  }

  const { error: deleteError } = await supabase
    .from("sale_payment_schedules")
    .delete()
    .eq("company_id", companyId)
    .eq("sale_id", saleId);

  if (deleteError) {
    return mapPgError(deleteError.message);
  }

  if (paymentCondition !== PAYMENT_CONDITIONS.installment) {
    return null;
  }

  const rows = schedules ?? [];
  const insertRows: SalePaymentScheduleInsert[] = rows.map((row) => ({
    company_id: companyId,
    sale_id: saleId,
    installment_number: row.installment_number,
    installment_count: row.installment_count,
    due_date: row.due_date,
    amount: row.amount,
    payment_method: row.payment_method || null,
  }));

  const { error: insertError } = await supabase
    .from("sale_payment_schedules")
    .insert(insertRows as never);

  if (insertError) {
    return mapPgError(insertError.message);
  }

  return null;
}

export async function listSales(params: {
  companyId: string;
  search?: string;
  status?: string;
  customerId?: string;
  periodFrom?: string;
  periodTo?: string;
}): Promise<Result<SaleListItem[]>> {
  const authz = await assertMemberPermission({
    companyId: params.companyId,
    module: PERMISSION_MODULES.sales,
    action: "view",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  const result = await querySales(supabase, params);
  if (result.error) {
    return { data: null, error: { message: mapPgError(result.error.message) } };
  }
  return result;
}

export async function getSale(
  companyId: string,
  saleId: string
): Promise<Result<SaleWithRelations>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.sales,
    action: "view",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  const result = await querySale(supabase, companyId, saleId);
  if (result.error) {
    return { data: null, error: { message: mapPgError(result.error.message) } };
  }
  return result;
}

export async function createSale(params: {
  companyId: string;
  header: SaleHeaderInput;
  items: SaleItemInput[];
  schedules?: SaleScheduleInput[];
}): Promise<Result<SaleWithRelations>> {
  const authz = await assertMemberPermission({
    companyId: params.companyId,
    module: PERMISSION_MODULES.sales,
    action: "create",
  });
  if (!authz.ok) return deny(authz.message);

  const validationError = validateItems(params.items);
  if (validationError) {
    return { data: null, error: { message: validationError } };
  }

  const paymentCondition = normalizePaymentCondition(
    params.header.payment_condition
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      company_id: params.companyId,
      customer_id: params.header.customer_id || null,
      status: SALE_STATUS.draft,
      sale_date: params.header.sale_date,
      due_date: params.header.due_date || null,
      payment_method: params.header.payment_method || null,
      payment_condition: paymentCondition,
      document_number: params.header.document_number || null,
      notes: params.header.notes || null,
      freight_amount: params.header.freight_amount ?? 0,
      discount_amount: params.header.discount_amount ?? 0,
      payment_terms: params.header.payment_terms || null,
      created_by: user?.id ?? null,
    } as never)
    .select("*")
    .single();

  if (saleError || !sale) {
    return {
      data: null,
      error: {
        message: mapPgError(
          saleError?.message ?? "Não foi possível criar a venda."
        ),
      },
    };
  }

  const saleRow = sale as Sale;
  const itemRows: SaleItemInsert[] = params.items.map((item, index) => ({
    company_id: params.companyId,
    sale_id: saleRow.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount || 0,
    line_total: calcLineTotal(
      item.quantity,
      item.unit_price,
      item.discount_amount || 0
    ),
    sort_order: item.sort_order ?? index,
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemRows as never);

  if (itemsError) {
    await supabase
      .from("sales")
      .delete()
      .eq("company_id", params.companyId)
      .eq("id", saleRow.id);

    return {
      data: null,
      error: { message: mapPgError(itemsError.message) },
    };
  }

  const { error: recalcError } = await callSaleRpc(
    supabase,
    "recalculate_sale_totals",
    { p_sale_id: saleRow.id }
  );

  if (recalcError) {
    return {
      data: null,
      error: { message: mapPgError(recalcError.message) },
    };
  }

  const refreshed = await querySale(supabase, params.companyId, saleRow.id);
  if (refreshed.error || !refreshed.data) {
    return {
      data: null,
      error: {
        message:
          refreshed.error?.message ??
          "Não foi possível carregar a venda após o cálculo dos totais.",
      },
    };
  }

  const scheduleError = await replaceSaleSchedules({
    supabase,
    companyId: params.companyId,
    saleId: saleRow.id,
    paymentCondition,
    schedules: params.schedules,
    saleTotal: Number(refreshed.data.total_amount),
  });

  if (scheduleError) {
    await supabase
      .from("sales")
      .delete()
      .eq("company_id", params.companyId)
      .eq("id", saleRow.id);

    return { data: null, error: { message: scheduleError } };
  }

  return querySale(supabase, params.companyId, saleRow.id);
}

export async function updateSaleDraft(params: {
  companyId: string;
  saleId: string;
  header: SaleHeaderInput;
  items: SaleItemInput[];
  schedules?: SaleScheduleInput[];
}): Promise<Result<SaleWithRelations>> {
  const authz = await assertMemberPermission({
    companyId: params.companyId,
    module: PERMISSION_MODULES.sales,
    action: "edit",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  const current = await querySale(supabase, params.companyId, params.saleId);
  if (current.error || !current.data) {
    return {
      data: null,
      error: { message: current.error?.message ?? "Venda não encontrada." },
    };
  }

  if (current.data.status !== SALE_STATUS.draft) {
    return {
      data: null,
      error: { message: "Somente vendas em rascunho podem ser editadas." },
    };
  }

  const validationError = validateItems(params.items);
  if (validationError) {
    return { data: null, error: { message: validationError } };
  }

  const paymentCondition = normalizePaymentCondition(
    params.header.payment_condition
  );

  const { error: updateError } = await supabase
    .from("sales")
    .update({
      customer_id: params.header.customer_id || null,
      sale_date: params.header.sale_date,
      due_date: params.header.due_date || null,
      payment_method: params.header.payment_method || null,
      payment_condition: paymentCondition,
      document_number: params.header.document_number || null,
      notes: params.header.notes || null,
      freight_amount: params.header.freight_amount ?? 0,
      discount_amount: params.header.discount_amount ?? 0,
      payment_terms: params.header.payment_terms || null,
    } as never)
    .eq("company_id", params.companyId)
    .eq("id", params.saleId)
    .eq("status", SALE_STATUS.draft);

  if (updateError) {
    return { data: null, error: { message: mapPgError(updateError.message) } };
  }

  const { error: deleteError } = await supabase
    .from("sale_items")
    .delete()
    .eq("company_id", params.companyId)
    .eq("sale_id", params.saleId);

  if (deleteError) {
    return { data: null, error: { message: mapPgError(deleteError.message) } };
  }

  const itemRows: SaleItemInsert[] = params.items.map((item, index) => ({
    company_id: params.companyId,
    sale_id: params.saleId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount || 0,
    line_total: calcLineTotal(
      item.quantity,
      item.unit_price,
      item.discount_amount || 0
    ),
    sort_order: item.sort_order ?? index,
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemRows as never);

  if (itemsError) {
    return { data: null, error: { message: mapPgError(itemsError.message) } };
  }

  const { error: recalcError } = await callSaleRpc(
    supabase,
    "recalculate_sale_totals",
    { p_sale_id: params.saleId }
  );

  if (recalcError) {
    return {
      data: null,
      error: { message: mapPgError(recalcError.message) },
    };
  }

  const refreshed = await querySale(supabase, params.companyId, params.saleId);
  if (refreshed.error || !refreshed.data) {
    return {
      data: null,
      error: {
        message:
          refreshed.error?.message ??
          "Não foi possível carregar a venda após o cálculo dos totais.",
      },
    };
  }

  const scheduleError = await replaceSaleSchedules({
    supabase,
    companyId: params.companyId,
    saleId: params.saleId,
    paymentCondition,
    schedules: params.schedules,
    saleTotal: Number(refreshed.data.total_amount),
  });

  if (scheduleError) {
    return { data: null, error: { message: scheduleError } };
  }

  return querySale(supabase, params.companyId, params.saleId);
}

export async function deleteSaleDraft(
  companyId: string,
  saleId: string
): Promise<Result<true>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.sales,
    action: "delete",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("company_id", companyId)
    .eq("id", saleId)
    .eq("status", SALE_STATUS.draft);

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return { data: true, error: null };
}

export async function confirmSale(
  companyId: string,
  saleId: string
): Promise<Result<SaleWithRelations>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.sales,
    action: "edit",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  const current = await querySale(supabase, companyId, saleId);
  if (current.error || !current.data) {
    return {
      data: null,
      error: { message: current.error?.message ?? "Venda não encontrada." },
    };
  }

  if (!current.data.customer_id) {
    return {
      data: null,
      error: { message: "Informe o cliente antes de confirmar a venda." },
    };
  }

  if (!current.data.items?.length) {
    return {
      data: null,
      error: { message: "Não é possível confirmar uma venda sem itens." },
    };
  }

  const { error } = await callSaleRpc(supabase, "confirm_sale", {
    p_sale_id: saleId,
  });

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return querySale(supabase, companyId, saleId);
}

export async function cancelSale(
  companyId: string,
  saleId: string,
  reason?: string | null
): Promise<Result<SaleWithRelations>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.sales,
    action: "edit",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  const { error } = await callSaleRpc(supabase, "cancel_sale", {
    p_sale_id: saleId,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return querySale(supabase, companyId, saleId);
}
