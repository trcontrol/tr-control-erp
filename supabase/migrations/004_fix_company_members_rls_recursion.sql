-- TR Control ERP — Corrigir recursão infinita nas políticas RLS de company_members
-- Migration: 004_fix_company_members_rls_recursion
--
-- Causa:
--   A política "Owners and admins can manage memberships" (FOR ALL) fazia
--   EXISTS (SELECT 1 FROM company_members ...), reentrando na própria RLS.
--
-- Idempotente: segura para executar mais de uma vez.
-- Não altera nem exclui dados de negócio.

-- ============================================
-- Funções SECURITY DEFINER (bypass RLS interno)
-- Usadas por companies / storage / gestão de memberships.
-- Não devem ser usadas DENTRO de políticas SELECT de company_members
-- que voltem a consultar company_members sem definer.
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

CREATE OR REPLACE FUNCTION public.can_manage_company(target_company_id UUID)
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
      AND company_members.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_company_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company(UUID) TO authenticated;

-- ============================================
-- company_members: remover políticas recursivas
-- ============================================
DROP POLICY IF EXISTS "Owners and admins can manage memberships" ON public.company_members;
DROP POLICY IF EXISTS "Members can view company memberships" ON public.company_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.company_members;
DROP POLICY IF EXISTS "Managers can insert memberships" ON public.company_members;
DROP POLICY IF EXISTS "Managers can update memberships" ON public.company_members;
DROP POLICY IF EXISTS "Managers can delete memberships" ON public.company_members;

-- RLS permanece ativo
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas os próprios vínculos (sem subquery na mesma tabela)
CREATE POLICY "Users can view own memberships"
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: gestão multiempresa via função SECURITY DEFINER
-- (a função lê company_members sem reaplicar a RLS do invocador)
CREATE POLICY "Managers can insert memberships"
  ON public.company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "Managers can update memberships"
  ON public.company_members
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "Managers can delete memberships"
  ON public.company_members
  FOR DELETE
  TO authenticated
  USING (public.can_manage_company(company_id));

-- ============================================
-- companies: evitar SELECT direto em company_members nas policies
-- (usa função SECURITY DEFINER com search_path fixado)
-- ============================================
DROP POLICY IF EXISTS "Members can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Members can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Owners and admins can update their companies" ON public.companies;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(id));

CREATE POLICY "Members can update their companies"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(id))
  WITH CHECK (public.is_company_member(id));
