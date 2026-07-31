import { createClient } from "@/lib/supabase/client";
import { TASK_STATUS } from "@/lib/constants";
import {
  compareTasksByDueDateTime,
  isTaskOverdue,
  normalizeTaskTime,
  todayDateString,
} from "@/lib/tasks/format";
import type {
  Customer,
  Profile,
  Task,
  TaskInsert,
  TaskUpdate,
} from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type TaskWithRelations = Task & {
  assigned_user: Pick<Profile, "id" | "full_name"> | null;
  related_customer: Pick<Customer, "id" | "full_name" | "trade_name"> | null;
  created_by_user: Pick<Profile, "id" | "full_name"> | null;
};

export type CompanyMemberOption = {
  user_id: string;
  full_name: string | null;
  role: string;
};

const TASK_SELECT = `
  *,
  assigned_user:profiles!tasks_assigned_user_id_fkey (
    id,
    full_name
  ),
  related_customer:customers!tasks_related_customer_id_fkey (
    id,
    full_name,
    trade_name
  ),
  created_by_user:profiles!tasks_created_by_fkey (
    id,
    full_name
  )
`;

function mapTaskError(message: string) {
  if (message.includes("tasks_status_check")) {
    return "Status inválido.";
  }
  if (message.includes("tasks_priority_check")) {
    return "Prioridade inválida.";
  }
  return message;
}

export async function listCompanyMemberOptions(
  companyId: string
): Promise<Result<CompanyMemberOption[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select(
      `
      user_id,
      role,
      profile:profiles!company_members_user_id_fkey (
        id,
        full_name
      )
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  const options = ((data ?? []) as Array<{
    user_id: string;
    role: string;
    profile: Pick<Profile, "id" | "full_name"> | null;
  }>).map((row) => ({
    user_id: row.user_id,
    role: row.role,
    full_name: row.profile?.full_name ?? null,
  }));

  return { data: options, error: null };
}

export async function listTasks(params: {
  companyId: string;
  search?: string;
  status?: string;
  priority?: string;
  periodFrom?: string;
  periodTo?: string;
  assignedToMe?: boolean;
  currentUserId?: string | null;
}): Promise<Result<TaskWithRelations[]>> {
  const supabase = createClient();
  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("company_id", params.companyId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.priority && params.priority !== "all") {
    query = query.eq("priority", params.priority);
  }

  if (params.periodFrom) {
    query = query.gte("due_date", params.periodFrom);
  }

  if (params.periodTo) {
    query = query.lte("due_date", params.periodTo);
  }

  if (params.assignedToMe && params.currentUserId) {
    query = query.eq("assigned_user_id", params.currentUserId);
  }

  if (params.search?.trim()) {
    const term = params.search.trim();
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  const tasks = (data ?? []) as TaskWithRelations[];
  tasks.sort(compareTasksByDueDateTime);

  return { data: tasks, error: null };
}

export async function listUpcomingTasks(
  companyId: string,
  limit = 5
): Promise<Result<TaskWithRelations[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("company_id", companyId)
    .in("status", [TASK_STATUS.pending, TASK_STATUS.in_progress])
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false })
    .limit(40);

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  const today = todayDateString();
  const tasks = ((data ?? []) as TaskWithRelations[]).sort((a, b) => {
    const aOverdue = isTaskOverdue({
      dueDate: a.due_date,
      status: a.status,
      today,
    });
    const bOverdue = isTaskOverdue({
      dueDate: b.due_date,
      status: b.status,
      today,
    });

    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1;
    }

    return compareTasksByDueDateTime(a, b);
  });

  return { data: tasks.slice(0, limit), error: null };
}

export async function getTask(
  companyId: string,
  taskId: string
): Promise<Result<TaskWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("company_id", companyId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  if (!data) {
    return { data: null, error: { message: "Tarefa não encontrada." } };
  }

  return { data: data as TaskWithRelations, error: null };
}

export async function createTask(params: {
  companyId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  dueTime?: string | null;
  status?: string;
  priority?: string;
  assignedUserId?: string | null;
  relatedCustomerId?: string | null;
}): Promise<Result<TaskWithRelations>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: "Usuário não autenticado." } };
  }

  const payload: TaskInsert = {
    company_id: params.companyId,
    title: params.title.trim(),
    description: params.description?.trim() || null,
    due_date: params.dueDate,
    due_time: normalizeTaskTime(params.dueTime),
    status: params.status ?? TASK_STATUS.pending,
    priority: params.priority ?? "medium",
    assigned_user_id: params.assignedUserId || null,
    related_customer_id: params.relatedCustomerId || null,
    created_by: user.id,
    completed_at:
      params.status === TASK_STATUS.completed
        ? new Date().toISOString()
        : null,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload as never)
    .select(TASK_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  return { data: data as TaskWithRelations, error: null };
}

export async function updateTask(
  companyId: string,
  taskId: string,
  params: {
    title: string;
    description?: string | null;
    dueDate: string;
    dueTime?: string | null;
    status: string;
    priority: string;
    assignedUserId?: string | null;
    relatedCustomerId?: string | null;
  }
): Promise<Result<TaskWithRelations>> {
  const supabase = createClient();

  let completedAt: string | null = null;
  if (params.status === TASK_STATUS.completed) {
    const current = await getTask(companyId, taskId);
    completedAt =
      current.data?.status === TASK_STATUS.completed &&
      current.data.completed_at
        ? current.data.completed_at
        : new Date().toISOString();
  }

  const payload: TaskUpdate = {
    title: params.title.trim(),
    description: params.description?.trim() || null,
    due_date: params.dueDate,
    due_time: normalizeTaskTime(params.dueTime),
    status: params.status,
    priority: params.priority,
    assigned_user_id: params.assignedUserId || null,
    related_customer_id: params.relatedCustomerId || null,
    completed_at: completedAt,
  };

  const { data, error } = await supabase
    .from("tasks")
    .update(payload as never)
    .eq("company_id", companyId)
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  return { data: data as TaskWithRelations, error: null };
}

export async function completeTask(
  companyId: string,
  taskId: string
): Promise<Result<TaskWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: TASK_STATUS.completed,
      completed_at: new Date().toISOString(),
    } as never)
    .eq("company_id", companyId)
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  return { data: data as TaskWithRelations, error: null };
}

export async function reopenTask(
  companyId: string,
  taskId: string
): Promise<Result<TaskWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: TASK_STATUS.pending,
      completed_at: null,
    } as never)
    .eq("company_id", companyId)
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  return { data: data as TaskWithRelations, error: null };
}

export async function cancelTask(
  companyId: string,
  taskId: string
): Promise<Result<TaskWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: TASK_STATUS.cancelled,
      completed_at: null,
    } as never)
    .eq("company_id", companyId)
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  return { data: data as TaskWithRelations, error: null };
}

export async function deleteTask(
  companyId: string,
  taskId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("company_id", companyId)
    .eq("id", taskId);

  if (error) {
    return { data: null, error: { message: mapTaskError(error.message) } };
  }

  return { data: true, error: null };
}
