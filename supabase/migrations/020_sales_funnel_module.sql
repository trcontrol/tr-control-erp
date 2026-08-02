-- TR Control ERP — Módulo Funil Comercial
-- Migration: 020_sales_funnel_module
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
-- Tabela opportunities
-- ============================================
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  estimated_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'new_contact'
    CHECK (stage IN (
      'new_contact',
      'negotiating',
      'proposal_sent',
      'won',
      'lost'
    )),
  assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  next_action_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colunas (caso a tabela já exista sem algum campo)
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new_contact',
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_action_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Constraints (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'opportunities_stage_check'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_stage_check
      CHECK (stage IN (
        'new_contact',
        'negotiating',
        'proposal_sent',
        'won',
        'lost'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'opportunities_status_check'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_status_check
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_opportunities_company_id
  ON public.opportunities (company_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_stage
  ON public.opportunities (company_id, stage);

CREATE INDEX IF NOT EXISTS idx_opportunities_status
  ON public.opportunities (company_id, status);

CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_user_id
  ON public.opportunities (company_id, assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_next_action_date
  ON public.opportunities (company_id, next_action_date);

CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id
  ON public.opportunities (company_id, customer_id);

-- updated_at
DROP TRIGGER IF EXISTS set_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Members can insert company opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Members can update company opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Members can delete company opportunities" ON public.opportunities;

CREATE POLICY "Members can view company opportunities"
  ON public.opportunities
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company opportunities"
  ON public.opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company opportunities"
  ON public.opportunities
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company opportunities"
  ON public.opportunities
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));
