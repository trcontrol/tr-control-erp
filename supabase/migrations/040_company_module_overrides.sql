-- TR Control ERP — 040_company_module_overrides
-- Acessos personalizados por empresa (plan preset + overrides esparsos).
--
-- NÃO altera companies.plan enum.
-- NÃO faz backfill — empresas sem rows = comportamento idêntico ao atual.
-- Seats continuam vinculados ao plano-base (032), não aos módulos efetivos.
--
-- Pré-requisitos: 026 (is_platform_admin), 029 (plan_includes_module,
--   member_has_module_permission), 006 (is_company_member, handle_updated_at).

-- ============================================
-- 1) Tabela company_module_overrides
-- ============================================

CREATE TABLE IF NOT EXISTS public.company_module_overrides (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (company_id, module_key),
  CONSTRAINT company_module_overrides_module_key_check CHECK (
    module_key IN (
      'dashboard',
      'customers',
      'products',
      'sales',
      'finance',
      'cash_flow',
      'tasks',
      'reports',
      'settings',
      'suppliers',
      'stock',
      'purchases',
      'agenda',
      'users',
      'funnel'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_company_module_overrides_company
  ON public.company_module_overrides (company_id);

COMMENT ON TABLE public.company_module_overrides IS
  'Deltas esparsos de módulos por empresa sobre o preset de companies.plan. Sem row = usa o plano. Escrita: Super Admin apenas.';

COMMENT ON COLUMN public.company_module_overrides.enabled IS
  'true = concede módulo fora do plano; false = remove módulo incluído no plano.';

DROP TRIGGER IF EXISTS set_company_module_overrides_updated_at
  ON public.company_module_overrides;

CREATE TRIGGER set_company_module_overrides_updated_at
  BEFORE UPDATE ON public.company_module_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 2) RLS
-- ============================================

ALTER TABLE public.company_module_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own company module overrides"
  ON public.company_module_overrides;
DROP POLICY IF EXISTS "Platform admins can view all company module overrides"
  ON public.company_module_overrides;
DROP POLICY IF EXISTS "Platform admins can insert company module overrides"
  ON public.company_module_overrides;
DROP POLICY IF EXISTS "Platform admins can update company module overrides"
  ON public.company_module_overrides;
DROP POLICY IF EXISTS "Platform admins can delete company module overrides"
  ON public.company_module_overrides;

-- Leitura: membro do tenant (snapshot/UI) OU Super Admin
CREATE POLICY "Members can view own company module overrides"
  ON public.company_module_overrides
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Platform admins can view all company module overrides"
  ON public.company_module_overrides
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- Escrita: somente Super Admin (Owner/tenant NÃO edita próprio teto comercial)
CREATE POLICY "Platform admins can insert company module overrides"
  ON public.company_module_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins can update company module overrides"
  ON public.company_module_overrides
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins can delete company module overrides"
  ON public.company_module_overrides
  FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

REVOKE ALL ON TABLE public.company_module_overrides FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_module_overrides
  TO authenticated;
GRANT ALL ON TABLE public.company_module_overrides TO service_role;

-- ============================================
-- 3) company_has_module — entitlement efetivo
-- ============================================

CREATE OR REPLACE FUNCTION public.company_has_module(
  p_company_id UUID,
  p_module TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module TEXT := btrim(COALESCE(p_module, ''));
  v_override BOOLEAN;
  v_plan TEXT;
BEGIN
  IF p_company_id IS NULL OR v_module = '' THEN
    RETURN FALSE;
  END IF;

  SELECT o.enabled
  INTO v_override
  FROM public.company_module_overrides o
  WHERE o.company_id = p_company_id
    AND o.module_key = v_module
  LIMIT 1;

  IF FOUND THEN
    RETURN v_override;
  END IF;

  SELECT c.plan::text
  INTO v_plan
  FROM public.companies c
  WHERE c.id = p_company_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN public.plan_includes_module(v_plan, v_module);
END;
$$;

COMMENT ON FUNCTION public.company_has_module(UUID, TEXT) IS
  'Entitlement efetivo da empresa: override explícito se existir, senão preset de companies.plan via plan_includes_module. Espelha isModuleEntitledForCompany (TS).';

REVOKE ALL ON FUNCTION public.company_has_module(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_has_module(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_has_module(UUID, TEXT) TO service_role;

-- ============================================
-- 4) member_has_module_permission — usa teto efetivo
-- ============================================

CREATE OR REPLACE FUNCTION public.member_has_module_permission(
  p_company_id UUID,
  p_module TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_access_profile TEXT;
  v_status TEXT;
  v_membership_id UUID;
  v_action TEXT := lower(btrim(COALESCE(p_action, '')));
  v_module TEXT := btrim(COALESCE(p_module, ''));
  v_can_view BOOLEAN;
  v_can_create BOOLEAN;
  v_can_edit BOOLEAN;
  v_can_delete BOOLEAN;
  v_can_export BOOLEAN;
BEGIN
  IF v_uid IS NULL OR p_company_id IS NULL OR v_module = '' THEN
    RETURN FALSE;
  END IF;

  IF v_action NOT IN ('view', 'create', 'edit', 'delete', 'export') THEN
    RETURN FALSE;
  END IF;

  SELECT
    cm.id,
    cm.role::text,
    cm.access_profile::text,
    cm.status::text
  INTO
    v_membership_id,
    v_role,
    v_access_profile,
    v_status
  FROM public.company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.user_id = v_uid
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF COALESCE(v_status, 'active') = 'inactive' THEN
    RETURN FALSE;
  END IF;

  -- Teto da empresa (plan ⊕ overrides). Owner/admin NÃO bypassam.
  IF NOT public.company_has_module(p_company_id, v_module) THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'owner' OR v_access_profile = 'administrator' THEN
    RETURN TRUE;
  END IF;

  SELECT
    mp.can_view,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    mp.can_export
  INTO
    v_can_view,
    v_can_create,
    v_can_edit,
    v_can_delete,
    v_can_export
  FROM public.member_permissions mp
  WHERE mp.company_id = p_company_id
    AND mp.membership_id = v_membership_id
    AND mp.module = v_module
  LIMIT 1;

  IF NOT FOUND OR COALESCE(v_can_view, FALSE) IS NOT TRUE THEN
    RETURN FALSE;
  END IF;

  CASE v_action
    WHEN 'view' THEN RETURN TRUE;
    WHEN 'create' THEN RETURN COALESCE(v_can_create, FALSE);
    WHEN 'edit' THEN RETURN COALESCE(v_can_edit, FALSE);
    WHEN 'delete' THEN RETURN COALESCE(v_can_delete, FALSE);
    WHEN 'export' THEN RETURN COALESCE(v_can_export, FALSE);
    ELSE RETURN FALSE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.member_has_module_permission(UUID, TEXT, TEXT) IS
  'Authz: company_has_module (plan⊕overrides) ∩ membership ativa ∩ member_permissions (owner/admin full no teto efetivo).';
