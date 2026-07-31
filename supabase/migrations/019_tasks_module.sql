-- TR Control ERP — Módulo de Tarefas
-- Migration: 019_tasks_module
-- Idempotente: segura para executar mais de uma vez no SQL Editor.
-- Não altera dados nem cálculos de outros módulos.

-- ============================================
-- Função de membership (garante existência para RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_company_member(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE company_members.company_id = target_company_id
      AND company_members.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_company_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(UUID) TO authenticated;

-- ============================================
-- Leitura segura de colegas da mesma empresa
-- (necessário para responsável da tarefa e joins com profiles)
-- Políticas aditivas: não removem as existentes.
-- ============================================
CREATE OR REPLACE FUNCTION public.shares_company_with(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members AS me
    INNER JOIN public.company_members AS other
      ON other.company_id = me.company_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = target_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.shares_company_with(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_company_with(UUID) TO authenticated;

DROP POLICY IF EXISTS "Members can view company co-memberships" ON public.company_members;
CREATE POLICY "Members can view company co-memberships"
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

DROP POLICY IF EXISTS "Users can view co-member profiles" ON public.profiles;
CREATE POLICY "Users can view co-member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.shares_company_with(id));

-- ============================================
-- Tabela tasks
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colunas (caso a tabela já exista sem algum campo)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS due_time TIME,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Constraints (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_status_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_priority_check
      CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_tasks_company_id
  ON public.tasks (company_id);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON public.tasks (company_id, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON public.tasks (company_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_priority
  ON public.tasks (company_id, priority);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_id
  ON public.tasks (company_id, assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_company_due_datetime
  ON public.tasks (company_id, due_date, due_time);

-- updated_at
DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can insert company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can update company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can delete company tasks" ON public.tasks;

CREATE POLICY "Members can view company tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));
