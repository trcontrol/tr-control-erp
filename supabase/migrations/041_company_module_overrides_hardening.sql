-- TR Control ERP — 041_company_module_overrides_hardening
-- Fase 1.1: ACL em company_has_module, RLS membro ativo, create transacional com overrides.
--
-- Pré-requisito: 040_company_module_overrides.
-- NÃO edita 040. NÃO faz backfill.
-- Aplicar manualmente no SQL Editor.

-- ============================================
-- 1) Helper: membership ATIVA (só para overrides SELECT)
-- ============================================

CREATE OR REPLACE FUNCTION public.is_active_company_member(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = target_company_id
      AND cm.user_id = auth.uid()
      AND COALESCE(cm.status, 'active'::public.member_status)
          = 'active'::public.member_status
  );
$$;

COMMENT ON FUNCTION public.is_active_company_member(UUID) IS
  'True se auth.uid() é membro ATIVO do tenant. Usado em RLS de company_module_overrides.';

REVOKE ALL ON FUNCTION public.is_active_company_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_company_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_company_member(UUID) TO service_role;

-- ============================================
-- 2) RLS overrides: só membro ativo (não inactive)
-- ============================================

DROP POLICY IF EXISTS "Members can view own company module overrides"
  ON public.company_module_overrides;

CREATE POLICY "Active members can view own company module overrides"
  ON public.company_module_overrides
  FOR SELECT
  TO authenticated
  USING (public.is_active_company_member(company_id));

-- Platform admin SELECT policy (040) permanece.

-- ============================================
-- 3) company_has_module_unchecked (interno, sem probe)
-- ============================================

CREATE OR REPLACE FUNCTION public.company_has_module_unchecked(
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
    -- Denylist read-side: ignore enabled=false em módulos estruturais do preset
    IF v_override IS FALSE
       AND v_module IN ('dashboard', 'settings', 'sales', 'finance', 'cash_flow')
    THEN
      SELECT c.plan::text
      INTO v_plan
      FROM public.companies c
      WHERE c.id = p_company_id
      LIMIT 1;

      IF FOUND AND public.plan_includes_module(v_plan, v_module) THEN
        RETURN TRUE;
      END IF;
    END IF;

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

COMMENT ON FUNCTION public.company_has_module_unchecked(UUID, TEXT) IS
  'Entitlement efetivo sem check de caller. Somente uso interno (authz SQL). Sem GRANT a authenticated.';

REVOKE ALL ON FUNCTION public.company_has_module_unchecked(UUID, TEXT) FROM PUBLIC;
-- Sem GRANT a authenticated — evita probe cross-tenant.
GRANT EXECUTE ON FUNCTION public.company_has_module_unchecked(UUID, TEXT) TO service_role;

-- ============================================
-- 4) company_has_module — wrapper com ACL
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
BEGIN
  IF p_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Probe cross-tenant negado (retorna false, não vaza existência do módulo).
  IF NOT (
    public.is_platform_admin()
    OR public.is_active_company_member(p_company_id)
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN public.company_has_module_unchecked(p_company_id, p_module);
END;
$$;

COMMENT ON FUNCTION public.company_has_module(UUID, TEXT) IS
  'Entitlement efetivo com ACL: platform admin OU membro ativo da empresa. Espelha isModuleEntitledForCompany.';

REVOKE ALL ON FUNCTION public.company_has_module(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_has_module(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_has_module(UUID, TEXT) TO service_role;

-- ============================================
-- 5) member_has_module_permission → unchecked
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

  -- Usa unchecked: membership já validada acima; evita false negativo do wrapper ACL.
  IF NOT public.company_has_module_unchecked(p_company_id, v_module) THEN
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
  'Authz: company_has_module_unchecked ∩ membership ativa ∩ member_permissions.';

-- ============================================
-- 6) Create transacional: company → overrides → invite
-- ============================================

CREATE OR REPLACE FUNCTION public.create_company_with_custom_access_and_owner_invite(
  p_name TEXT,
  p_legal_name TEXT,
  p_slug TEXT,
  p_cnpj TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_plan public.company_plan,
  p_status public.company_status,
  p_owner_full_name TEXT,
  p_owner_email TEXT,
  p_permissions jsonb DEFAULT '[]'::jsonb,
  p_module_overrides jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  company_id UUID,
  invite_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_invite_id UUID;
  v_slug TEXT;
  v_owner_email TEXT;
  v_token TEXT;
  v_invited_by UUID;
  v_item jsonb;
  v_module TEXT;
  v_enabled BOOLEAN;
  v_structural TEXT[] := ARRAY[
    'dashboard', 'settings', 'sales', 'finance', 'cash_flow'
  ];
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_platform_admin' USING ERRCODE = '42501';
  END IF;

  v_invited_by := auth.uid();
  IF v_invited_by IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  v_slug := lower(btrim(COALESCE(p_slug, '')));
  v_owner_email := lower(btrim(COALESCE(p_owner_email, '')));

  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'company_name_required';
  END IF;
  IF v_slug = '' THEN
    RAISE EXCEPTION 'company_slug_required';
  END IF;
  IF v_owner_email = '' OR position('@' IN v_owner_email) = 0 THEN
    RAISE EXCEPTION 'owner_email_invalid';
  END IF;
  IF p_plan IS NULL THEN
    RAISE EXCEPTION 'company_plan_required';
  END IF;
  IF p_status IS NULL THEN
    p_status := 'active'::public.company_status;
  END IF;

  IF p_permissions IS NULL
     OR jsonb_typeof(p_permissions) <> 'array'
     OR jsonb_array_length(p_permissions) = 0 THEN
    RAISE EXCEPTION 'owner_permissions_required';
  END IF;

  IF p_module_overrides IS NULL THEN
    p_module_overrides := '[]'::jsonb;
  END IF;
  IF jsonb_typeof(p_module_overrides) <> 'array' THEN
    RAISE EXCEPTION 'module_overrides_must_be_array';
  END IF;

  -- A) company
  INSERT INTO public.companies (
    name, legal_name, slug, cnpj, email, phone, plan, status
  ) VALUES (
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_legal_name, '')), ''),
    v_slug,
    NULLIF(regexp_replace(COALESCE(p_cnpj, ''), '\D', '', 'g'), ''),
    NULLIF(lower(btrim(COALESCE(p_email, ''))), ''),
    NULLIF(btrim(COALESCE(p_phone, '')), ''),
    p_plan,
    p_status
  )
  RETURNING id INTO v_company_id;

  -- B) overrides (mesma transação — falha faz rollback da company)
  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_module_overrides)
  LOOP
    v_module := btrim(COALESCE(v_item->>'module_key', ''));
    v_enabled := COALESCE((v_item->>'enabled')::boolean, NULL);

    IF v_module = '' OR v_enabled IS NULL THEN
      RAISE EXCEPTION 'module_override_invalid';
    END IF;

    -- Denylist: não permitir enabled=false em módulo estrutural do preset
    IF v_enabled IS FALSE
       AND v_module = ANY (v_structural)
       AND public.plan_includes_module(p_plan::text, v_module)
    THEN
      RAISE EXCEPTION 'structural_module_cannot_be_disabled:%', v_module;
    END IF;

    INSERT INTO public.company_module_overrides (
      company_id, module_key, enabled, updated_by
    ) VALUES (
      v_company_id, v_module, v_enabled, v_invited_by
    );
  END LOOP;

  -- C) invite Owner (só após overrides OK)
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO public.company_invites (
    company_id, email, full_name, role, access_profile,
    invited_by, token, status, expires_at, permissions, is_initial_owner
  ) VALUES (
    v_company_id,
    v_owner_email,
    NULLIF(btrim(COALESCE(p_owner_full_name, '')), ''),
    'admin'::public.company_role,
    'administrator'::public.access_profile,
    v_invited_by,
    v_token,
    'pending',
    (timezone('utc', now()) + interval '7 days'),
    p_permissions,
    true
  )
  RETURNING id INTO v_invite_id;

  company_id := v_company_id;
  invite_id := v_invite_id;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.create_company_with_custom_access_and_owner_invite IS
  'Platform Admin: company → overrides → invite Owner na mesma transação. E-mail Auth na aplicação.';

REVOKE ALL ON FUNCTION public.create_company_with_custom_access_and_owner_invite(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  public.company_plan, public.company_status,
  TEXT, TEXT, jsonb, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_company_with_custom_access_and_owner_invite(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  public.company_plan, public.company_status,
  TEXT, TEXT, jsonb, jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_company_with_custom_access_and_owner_invite(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  public.company_plan, public.company_status,
  TEXT, TEXT, jsonb, jsonb
) TO service_role;
