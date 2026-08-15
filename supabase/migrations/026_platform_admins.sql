-- TR Control ERP — Super Admin da plataforma (independente de company_members)
-- Migration: 026_platform_admins
-- Idempotente: segura para executar mais de uma vez no SQL Editor.
--
-- Objetivo:
--   - Identificar administradores da PLATAFORMA TR Control (SaaS)
--   - Separar esse privilégio de owner/admin de empresas clientes
--   - Permitir SELECT global em companies apenas para platform admins
--   - NÃO alterar isolamento por company_id nas tabelas de negócio
--
-- NÃO altera:
--   - company_members / roles de tenant
--   - fluxos de convite / senha
--   - policies de INSERT/UPDATE de members em companies
--   - dados de negócio existentes
--
-- Bootstrap do primeiro Super Admin (manual, após o usuário existir em auth):
--   INSERT INTO public.platform_admins (user_id, notes)
--   SELECT id, 'Bootstrap Super Admin'
--   FROM auth.users
--   WHERE lower(email) = lower('seu-email-admin@dominio.com')
--   ON CONFLICT (user_id) DO UPDATE
--     SET is_active = true,
--         notes = EXCLUDED.notes;
--
-- NÃO executada automaticamente — aplicar manualmente no SQL Editor após autorização.

-- ============================================
-- Tabela platform_admins
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_active
  ON public.platform_admins(user_id)
  WHERE is_active = true;

COMMENT ON TABLE public.platform_admins IS
  'Administradores da plataforma TR Control (SaaS). Independente de company_members.';

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Sem policies para authenticated: acesso direto à tabela fica negado.
-- Leitura autorizada apenas via is_platform_admin() (SECURITY DEFINER)
-- ou service_role / SQL Editor.

-- ============================================
-- Função: is_platform_admin()
-- ============================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
      AND pa.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

COMMENT ON FUNCTION public.is_platform_admin() IS
  'True se auth.uid() é Super Admin ativo da plataforma. Não usa company_members.';

-- ============================================
-- companies: SELECT global só para platform admin
-- (policies de membros permanecem; RLS combina com OR)
-- ============================================
DROP POLICY IF EXISTS "Platform admins can view all companies" ON public.companies;

CREATE POLICY "Platform admins can view all companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());
