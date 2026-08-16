import {
  companyPlanLabel,
  companyStatusLabel,
  type AdminCompanyDeletionCounts,
  type AdminCompanyListItem,
  type CreateCompanyWithOwnerInput,
  type CreateCompanyWithOwnerResult,
  type DeleteCompanyInput,
  type DeleteCompanyResult,
  type UpdateCompanyCommercialInput,
  type UpdateCompanyCommercialResult,
} from "@/lib/admin/companies-admin-shared";
import { requirePlatformAdmin } from "@/lib/admin/platform-admin";
import { isValidEmail, onlyDigits } from "@/lib/companies/format";
import {
  COMPANY_LOGOS_BUCKET,
  COMPANY_PLANS,
  COMPANY_STATUSES,
  PRODUCT_IMAGES_BUCKET,
  type CompanyPlan,
  type CompanyStatus,
} from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createInviteToken,
  dispatchCompanyInviteEmail,
  findAuthUserIdByEmail,
  inviteExpiresAt,
} from "@/lib/users/invite-server";
import {
  ACCESS_PROFILES,
  serializePermissionsForStorage,
} from "@/lib/users/permissions";
import { permissionsForProfileInPlan } from "@/lib/plans/access";
import {
  isPlanDowngrade,
  normalizeCompanyPlan,
} from "@/lib/plans/entitlements";
import {
  canFitSeatUsage,
  maxUsersForPlan,
  seatDowngradeBlockedMessage,
} from "@/lib/plans/limits";
import { getCompanySeatUsage } from "@/lib/plans/seats";
import type { Json } from "@/types/database";

export type {
  AdminCompanyDeletionCounts,
  AdminCompanyListItem,
  CreateCompanyWithOwnerInput,
  CreateCompanyWithOwnerResult,
  DeleteCompanyInput,
  DeleteCompanyResult,
  UpdateCompanyCommercialInput,
  UpdateCompanyCommercialResult,
} from "@/lib/admin/companies-admin-shared";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listAllCompaniesForPlatformAdmin(): Promise<{
  companies: AdminCompanyListItem[];
  error: string | null;
}> {
  await requirePlatformAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, cnpj, plan, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      companies: [],
      error:
        error.message.includes("is_platform_admin") ||
        error.code === "42883" ||
        error.message.toLowerCase().includes("permission")
          ? "Não foi possível listar empresas. Confirme se as migrations 026/027 foram aplicadas e se você é Super Admin."
          : `Não foi possível listar empresas: ${error.message}`,
    };
  }

  const companies = (data ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    cnpj: string | null;
    plan: string;
    status: string | null;
    created_at: string;
  }>;

  // Super Admin pode não ser membro do tenant — service role só para enriquecer a lista.
  const admin = createAdminClient();
  const { data: pendingOwners, error: pendingError } = await admin
    .from("company_invites")
    .select("id, company_id, email")
    .eq("status", "pending")
    .eq("is_initial_owner", true);

  if (pendingError) {
    return {
      companies: [],
      error: `Não foi possível carregar convites de Owner: ${pendingError.message}`,
    };
  }

  const pendingByCompany = new Map<string, { id: string; email: string }>();
  for (const row of pendingOwners ?? []) {
    const item = row as { id: string; company_id: string; email: string };
    pendingByCompany.set(item.company_id, {
      id: item.id,
      email: item.email,
    });
  }

  return {
    companies: companies.map((company) => {
      const pending = pendingByCompany.get(company.id) ?? null;
      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        cnpj: company.cnpj,
        plan: company.plan,
        status: company.status ?? COMPANY_STATUSES.active,
        createdAt: company.created_at,
        pendingInitialOwnerInviteId: pending?.id ?? null,
        pendingInitialOwnerEmail: pending?.email ?? null,
      };
    }),
    error: null,
  };
}

function validateCreateInput(
  input: CreateCompanyWithOwnerInput
): string | null {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerFullName = input.ownerFullName.trim();

  if (!name) return "Informe o nome da empresa.";
  if (!slug) return "Informe o slug da empresa.";
  if (!SLUG_RE.test(slug)) {
    return "Slug inválido. Use apenas letras minúsculas, números e hífens.";
  }
  if (!ownerFullName) return "Informe o nome do Owner.";
  if (!EMAIL_RE.test(ownerEmail)) {
    return "Informe um e-mail válido para o Owner.";
  }

  if (
    input.plan !== COMPANY_PLANS.essential &&
    input.plan !== COMPANY_PLANS.professional &&
    input.plan !== COMPANY_PLANS.premium
  ) {
    return "Plano inválido.";
  }

  const status = input.status ?? COMPANY_STATUSES.active;
  if (
    status !== COMPANY_STATUSES.active &&
    status !== COMPANY_STATUSES.suspended
  ) {
    return "Status inválido.";
  }

  const companyEmail = input.email?.trim() ?? "";
  if (companyEmail && !isValidEmail(companyEmail)) {
    return "E-mail da empresa inválido.";
  }

  const cnpjDigits = onlyDigits(input.cnpj ?? "");
  if (cnpjDigits && cnpjDigits.length !== 14) {
    return "CNPJ deve ter 14 dígitos.";
  }

  return null;
}

async function sendOwnerInviteEmail(params: {
  inviteId: string;
  companyId: string;
  email: string;
  fullName: string;
  token: string;
}): Promise<{ emailSent: boolean; emailError: string | null; mode?: string }> {
  let existingAuthUserId: string | null = null;
  try {
    existingAuthUserId = await findAuthUserIdByEmail(params.email);
  } catch (error) {
    return {
      emailSent: false,
      emailError:
        error instanceof Error
          ? error.message
          : "Falha ao verificar e-mail no Auth.",
    };
  }

  const dispatched = await dispatchCompanyInviteEmail({
    email: params.email,
    fullName: params.fullName,
    inviteId: params.inviteId,
    companyId: params.companyId,
    token: params.token,
    existingAuthUserId,
  });

  if ("error" in dispatched) {
    return { emailSent: false, emailError: dispatched.error };
  }

  return { emailSent: true, emailError: null, mode: dispatched.mode };
}

/**
 * Cria company + invite Owner via RPC e dispara e-mail Auth.
 * Permissões do Owner são geradas no servidor (preset Administrator).
 */
export async function createCompanyWithOwnerInvite(
  input: CreateCompanyWithOwnerInput
): Promise<CreateCompanyWithOwnerResult | { error: string }> {
  await requirePlatformAdmin();

  const validationError = validateCreateInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerFullName = input.ownerFullName.trim();
  const status = input.status ?? COMPANY_STATUSES.active;
  const permissions = serializePermissionsForStorage(
    permissionsForProfileInPlan(ACCESS_PROFILES.administrator, input.plan)
  );

  if (permissions.length === 0) {
    return { error: "Falha interna: permissões do Owner ficaram vazias." };
  }

  const supabase = await createClient();
  // Cast alinhado a sales/purchases: tipagem do client com RETURNS TABLE é frágil.
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fnName: string,
        params?: Record<string, unknown>
      ) => Promise<{
        data: Array<{ company_id: string; invite_id: string }> | null;
        error: { message: string } | null;
      }>;
    }
  ).rpc("create_company_with_owner_invite", {
    p_name: name,
    p_legal_name: input.legalName?.trim() || null,
    p_slug: slug,
    p_cnpj: onlyDigits(input.cnpj ?? "") || null,
    p_email: input.email?.trim().toLowerCase() || null,
    p_phone: input.phone?.trim() || null,
    p_plan: input.plan,
    p_status: status,
    p_owner_full_name: ownerFullName,
    p_owner_email: ownerEmail,
    p_permissions: permissions as unknown as Json,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("unique")) {
      return {
        error:
          "Já existe uma empresa com este slug (ou conflito de unicidade). Escolha outro slug.",
      };
    }
    if (message.includes("not_platform_admin")) {
      return { error: "Apenas Super Admin pode criar empresas na plataforma." };
    }
    return { error: `Não foi possível criar a empresa: ${error.message}` };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const companyId = (row as { company_id?: string } | null)?.company_id;
  const inviteId = (row as { invite_id?: string } | null)?.invite_id;

  if (!companyId || !inviteId) {
    return {
      error:
        "Empresa criada, mas a RPC não retornou company_id/invite_id. Verifique no banco.",
    };
  }

  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("company_invites")
    .select("id, company_id, email, full_name, token, status, is_initial_owner")
    .eq("id", inviteId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (inviteError || !invite) {
    return {
      companyId,
      inviteId,
      emailSent: false,
      emailError: inviteError
        ? `Empresa criada, mas falhou ao carregar o convite: ${inviteError.message}`
        : "Empresa criada, mas o convite do Owner não foi encontrado.",
      message:
        "Empresa criada. O e-mail do Owner não foi enviado — use Reenviar convite.",
    };
  }

  const inviteRow = invite as {
    id: string;
    company_id: string;
    email: string;
    full_name: string | null;
    token: string;
  };

  const emailResult = await sendOwnerInviteEmail({
    inviteId: inviteRow.id,
    companyId: inviteRow.company_id,
    email: inviteRow.email,
    fullName: inviteRow.full_name?.trim() || ownerFullName,
    token: inviteRow.token,
  });

  if (!emailResult.emailSent) {
    return {
      companyId,
      inviteId,
      emailSent: false,
      emailError: emailResult.emailError,
      message:
        "Empresa e convite criados, mas o e-mail do Owner falhou. Use Reenviar convite.",
    };
  }

  return {
    companyId,
    inviteId,
    emailSent: true,
    emailError: null,
    message:
      emailResult.mode === "recovery"
        ? "Empresa criada. Enviamos um link para o Owner definir a senha e acessar a empresa."
        : "Empresa criada e convite enviado ao Owner com sucesso.",
  };
}

/**
 * Reenvia convite do Owner inicial (pending + is_initial_owner).
 * Rotaciona token/expiry; não altera is_initial_owner.
 */
export async function resendInitialOwnerInvite(params: {
  companyId: string;
  inviteId: string;
}): Promise<{ message: string } | { error: string }> {
  await requirePlatformAdmin();

  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("company_invites")
    .select(
      "id, company_id, email, full_name, token, status, is_initial_owner"
    )
    .eq("id", params.inviteId)
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (inviteError || !invite) {
    return {
      error: inviteError
        ? `Não foi possível carregar o convite: ${inviteError.message}`
        : "Convite não encontrado.",
    };
  }

  const row = invite as {
    id: string;
    company_id: string;
    email: string;
    full_name: string | null;
    token: string;
    status: string;
    is_initial_owner: boolean;
  };

  if (row.status !== "pending") {
    return { error: "Este convite não está mais pendente." };
  }

  if (!row.is_initial_owner) {
    return {
      error:
        "Este convite não é de Owner inicial. Use o painel de usuários do tenant.",
    };
  }

  const email = row.email.trim().toLowerCase();
  const fullName = row.full_name?.trim() || email;
  const token = createInviteToken();
  const expiresAt = inviteExpiresAt();

  const { error: updateError } = await admin
    .from("company_invites")
    .update({
      token,
      expires_at: expiresAt,
      status: "pending",
      full_name: fullName,
    } as never)
    .eq("id", row.id)
    .eq("company_id", params.companyId)
    .eq("is_initial_owner", true);

  if (updateError) {
    return {
      error: `Não foi possível renovar o convite: ${updateError.message}`,
    };
  }

  const emailResult = await sendOwnerInviteEmail({
    inviteId: row.id,
    companyId: row.company_id,
    email,
    fullName,
    token,
  });

  if (!emailResult.emailSent) {
    return {
      error:
        emailResult.emailError ??
        "Não foi possível reenviar o e-mail do Owner.",
    };
  }

  return {
    message:
      emailResult.mode === "recovery"
        ? "Convite do Owner reenviado. O convidado receberá um link para definir a senha."
        : "Convite do Owner reenviado com sucesso.",
  };
}

function parseCommercialPlan(value: unknown): CompanyPlan | null {
  if (
    value === COMPANY_PLANS.essential ||
    value === COMPANY_PLANS.professional ||
    value === COMPANY_PLANS.premium
  ) {
    return value;
  }
  return null;
}

function parseCommercialStatus(value: unknown): CompanyStatus | null {
  if (
    value === COMPANY_STATUSES.active ||
    value === COMPANY_STATUSES.suspended
  ) {
    return value;
  }
  return null;
}

/**
 * Atualiza somente companies.plan e companies.status (Super Admin).
 * Não reconcilia member_permissions (estratégia B — órfãs permanecem).
 */
export async function updateCompanyCommercial(
  input: UpdateCompanyCommercialInput
): Promise<UpdateCompanyCommercialResult | { error: string }> {
  await requirePlatformAdmin();

  const companyId =
    typeof input.companyId === "string" ? input.companyId.trim() : "";
  if (!UUID_RE.test(companyId)) {
    return { error: "Identificador da empresa inválido." };
  }

  const plan = parseCommercialPlan(input.plan);
  if (!plan) {
    return { error: "Plano inválido. Use essential, professional ou premium." };
  }

  const status = parseCommercialStatus(input.status);
  if (!status) {
    return { error: "Status inválido. Use active ou suspended." };
  }

  const admin = createAdminClient();
  const { data: currentRow, error: currentError } = await admin
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .maybeSingle();

  if (currentError) {
    return {
      error: `Não foi possível carregar a empresa: ${currentError.message}`,
    };
  }
  if (!currentRow) {
    return { error: "Empresa não encontrada." };
  }

  const currentPlan = normalizeCompanyPlan(
    (currentRow as { plan?: string }).plan
  );
  if (isPlanDowngrade(currentPlan, plan)) {
    const seats = await getCompanySeatUsage({
      companyId,
      useAdmin: true,
    });
    if ("error" in seats) {
      return { error: seats.error };
    }
    if (!canFitSeatUsage(seats, plan)) {
      return {
        error: seatDowngradeBlockedMessage({
          targetPlan: plan,
          usedSeats: seats.usedSeats,
          maxUsers: maxUsersForPlan(plan),
        }),
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fnName: string,
        params?: Record<string, unknown>
      ) => Promise<{
        data: Array<{
          company_id: string;
          plan: string;
          status: string;
        }> | null;
        error: { message: string } | null;
      }>;
    }
  ).rpc("update_company_plan_status", {
    p_company_id: companyId,
    p_plan: plan,
    p_status: status,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not_platform_admin")) {
      return {
        error: "Apenas Super Admin pode alterar plano e status da empresa.",
      };
    }
    if (message.includes("company_not_found")) {
      return { error: "Empresa não encontrada." };
    }
    if (message.includes("company_plan_status_requires_platform_admin")) {
      return {
        error: "Apenas Super Admin pode alterar plano e status da empresa.",
      };
    }
    if (message.includes("company_plan_downgrade_seat_limit")) {
      const seats = await getCompanySeatUsage({
        companyId,
        useAdmin: true,
      });
      if (!("error" in seats)) {
        return {
          error: seatDowngradeBlockedMessage({
            targetPlan: plan,
            usedSeats: seats.usedSeats,
            maxUsers: maxUsersForPlan(plan),
          }),
        };
      }
      return {
        error:
          "Não é possível concluir o downgrade: a empresa excede o limite de usuários do plano de destino. Regularize em Usuários e tente novamente.",
      };
    }
    if (
      message.includes("update_company_plan_status") &&
      (message.includes("does not exist") || message.includes("schema cache"))
    ) {
      return {
        error:
          "RPC de alteração comercial indisponível. Aplique a migration 028_protect_company_plan_status.",
      };
    }
    return {
      error: `Não foi possível atualizar a empresa: ${error.message}`,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.company_id) {
    return { error: "Empresa não encontrada." };
  }

  const nextPlan = parseCommercialPlan(row.plan) ?? plan;
  const nextStatus = parseCommercialStatus(row.status) ?? status;

  return {
    companyId: row.company_id,
    plan: nextPlan,
    status: nextStatus,
    message: `Empresa atualizada: ${companyPlanLabel(nextPlan)} · ${companyStatusLabel(nextStatus)}.`,
  };
}

async function countRowsForCompany(
  admin: ReturnType<typeof createAdminClient>,
  table:
    | "company_members"
    | "company_invites"
    | "customers"
    | "suppliers"
    | "products"
    | "purchases"
    | "sales"
    | "financial_entries"
    | "tasks"
    | "agenda_events"
    | "opportunities",
  companyId: string,
  extraEq?: { column: string; value: string }
): Promise<number | { error: string }> {
  let query = admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (extraEq) {
    query = query.eq(extraEq.column, extraEq.value);
  }

  const { count, error } = await query;
  if (error) {
    return { error: error.message };
  }
  return count ?? 0;
}

/**
 * Contagens informativas para o modal de exclusão (somente leitura).
 * Não são usadas como fonte de verdade no delete.
 */
export async function getAdminCompanyDeletionCounts(
  companyId: string
): Promise<AdminCompanyDeletionCounts | { error: string }> {
  await requirePlatformAdmin();

  const id = typeof companyId === "string" ? companyId.trim() : "";
  if (!UUID_RE.test(id)) {
    return { error: "Identificador da empresa inválido." };
  }

  const admin = createAdminClient();
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, name, slug, plan, status")
    .eq("id", id)
    .maybeSingle();

  if (companyError) {
    return {
      error: `Não foi possível carregar a empresa: ${companyError.message}`,
    };
  }
  if (!company) {
    return { error: "Empresa não encontrada." };
  }

  const row = company as {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
  };

  const results = await Promise.all([
    countRowsForCompany(admin, "company_members", id, {
      column: "status",
      value: "active",
    }),
    countRowsForCompany(admin, "company_invites", id, {
      column: "status",
      value: "pending",
    }),
    countRowsForCompany(admin, "customers", id),
    countRowsForCompany(admin, "suppliers", id),
    countRowsForCompany(admin, "products", id),
    countRowsForCompany(admin, "purchases", id),
    countRowsForCompany(admin, "sales", id),
    countRowsForCompany(admin, "financial_entries", id),
    countRowsForCompany(admin, "tasks", id),
    countRowsForCompany(admin, "agenda_events", id),
    countRowsForCompany(admin, "opportunities", id),
  ]);

  for (const result of results) {
    if (typeof result === "object" && "error" in result) {
      return {
        error: `Não foi possível carregar as contagens: ${result.error}`,
      };
    }
  }

  const [
    activeMembers,
    pendingInvites,
    customers,
    suppliers,
    products,
    purchases,
    sales,
    financialEntries,
    tasks,
    agendaEvents,
    opportunities,
  ] = results as number[];

  return {
    companyId: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    status: row.status ?? COMPANY_STATUSES.active,
    activeMembers,
    pendingInvites,
    customers,
    suppliers,
    products,
    purchases,
    sales,
    financialEntries,
    tasks,
    agendaEvents,
    opportunities,
  };
}

async function listStorageObjectPaths(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string
): Promise<{ paths: string[]; error: string | null }> {
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: 1000,
    offset: 0,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("no such file")
    ) {
      return { paths: [], error: null };
    }
    return { paths: [], error: error.message };
  }

  const paths: string[] = [];
  for (const item of data ?? []) {
    if (!item.name || item.name === ".emptyFolderPlaceholder") continue;

    // Pasta (id null): listar um nível abaixo sob o mesmo companyId.
    if (item.id === null) {
      const nested = await listStorageObjectPaths(
        admin,
        bucket,
        `${prefix}/${item.name}`
      );
      if (nested.error) {
        return nested;
      }
      paths.push(...nested.paths);
      continue;
    }

    paths.push(`${prefix}/${item.name}`);
  }

  return { paths, error: null };
}

/**
 * Remove objetos de Storage sob companyId nos buckets do tenant.
 * Falhas viram warning — não revertem o delete do banco.
 */
async function cleanupCompanyStorage(companyId: string): Promise<{
  storageWarning: boolean;
}> {
  const admin = createAdminClient();
  const buckets = [COMPANY_LOGOS_BUCKET, PRODUCT_IMAGES_BUCKET] as const;
  let storageWarning = false;

  for (const bucket of buckets) {
    const listed = await listStorageObjectPaths(admin, bucket, companyId);
    if (listed.error) {
      storageWarning = true;
      continue;
    }
    if (listed.paths.length === 0) continue;

    const { error: removeError } = await admin.storage
      .from(bucket)
      .remove(listed.paths);

    if (removeError) {
      storageWarning = true;
    }
  }

  return { storageWarning };
}

/**
 * Exclusão definitiva de tenant (Super Admin).
 * Valida nome no servidor; RPC remove dados do company_id; limpa Storage após.
 */
export async function deleteCompanyForPlatformAdmin(
  input: DeleteCompanyInput
): Promise<DeleteCompanyResult | { error: string }> {
  await requirePlatformAdmin();

  const companyId =
    typeof input.companyId === "string" ? input.companyId.trim() : "";
  if (!UUID_RE.test(companyId)) {
    return { error: "Identificador da empresa inválido." };
  }

  const confirmName =
    typeof input.confirmName === "string" ? input.confirmName.trim() : "";
  if (!confirmName) {
    return { error: "Digite o nome da empresa para confirmar a exclusão." };
  }

  const admin = createAdminClient();
  const { data: currentRow, error: currentError } = await admin
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();

  if (currentError) {
    return {
      error: `Não foi possível carregar a empresa: ${currentError.message}`,
    };
  }
  if (!currentRow) {
    return { error: "Empresa não encontrada." };
  }

  const currentName = String(
    (currentRow as { name?: string }).name ?? ""
  ).trim();
  if (confirmName !== currentName) {
    return {
      error:
        "O nome digitado não confere com o nome atual da empresa. Digite exatamente o nome para confirmar.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fnName: string,
        params?: Record<string, unknown>
      ) => Promise<{
        data: Array<{
          company_id: string;
          company_name: string;
        }> | null;
        error: { message: string } | null;
      }>;
    }
  ).rpc("delete_company_for_platform_admin", {
    p_company_id: companyId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not_platform_admin")) {
      return {
        error: "Apenas Super Admin pode excluir empresas da plataforma.",
      };
    }
    if (message.includes("company_not_found")) {
      return { error: "Empresa não encontrada." };
    }
    if (
      message.includes("delete_company_for_platform_admin") &&
      (message.includes("does not exist") || message.includes("schema cache"))
    ) {
      return {
        error:
          "RPC de exclusão indisponível. Aplique a migration 033_delete_company_for_platform_admin.",
      };
    }
    return {
      error: `Não foi possível excluir a empresa: ${error.message}`,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.company_id) {
    return { error: "Empresa não encontrada." };
  }

  const { storageWarning } = await cleanupCompanyStorage(companyId);

  return {
    companyId: row.company_id,
    message: storageWarning
      ? "A empresa foi excluída, mas alguns arquivos não puderam ser removidos do armazenamento."
      : "Empresa excluída permanentemente.",
    storageWarning,
  };
}
