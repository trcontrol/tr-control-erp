-- TR Control ERP — 027_admin_companies_plans_status_owner_invite (REVISADA)
-- Pré-requisito: 024, 025, 026.
-- Idempotente. NÃO executar sem autorização.
--
-- Segurança is_initial_owner:
--   - trigger impede INSERT/UPDATE do flag por não-Platform-Admin
--   - UNIQUE parcial: 1 Owner inicial pending por empresa
--   - CHECK role <> 'owner' permanece
-- Plan: ALTER TYPE in-place (sem DROP COLUMN).

-- ============================================
-- 1) Enums
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_plan') THEN
    CREATE TYPE public.company_plan AS ENUM (
      'essential',
      'professional',
      'premium'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_status') THEN
    CREATE TYPE public.company_status AS ENUM (
      'active',
      'suspended'
    );
  END IF;
END $$;

-- ============================================
-- 2) companies.plan — backfill text + ALTER TYPE (sem DROP)
-- ============================================
DO $$
BEGIN
  -- Só se plan ainda for text
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'plan'
      AND data_type = 'text'
  ) THEN
    UPDATE public.companies
    SET plan = CASE lower(btrim(COALESCE(plan, '')))
      WHEN 'free' THEN 'essential'
      WHEN 'starter' THEN 'essential'
      WHEN 'essential' THEN 'essential'
      WHEN 'business' THEN 'professional'
      WHEN 'professional' THEN 'professional'
      WHEN 'enterprise' THEN 'premium'
      WHEN 'premium' THEN 'premium'
      ELSE 'essential'
    END;

    ALTER TABLE public.companies
      ALTER COLUMN plan DROP DEFAULT;

    ALTER TABLE public.companies
      ALTER COLUMN plan TYPE public.company_plan
      USING plan::public.company_plan;

    ALTER TABLE public.companies
      ALTER COLUMN plan SET DEFAULT 'essential'::public.company_plan;

    ALTER TABLE public.companies
      ALTER COLUMN plan SET NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.companies.plan IS
  'Plano comercial: essential | professional | premium';

-- ============================================
-- 3) companies.status
-- ============================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status public.company_status NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_companies_status
  ON public.companies (status);

COMMENT ON COLUMN public.companies.status IS
  'active | suspended. Bloqueio de acesso na app: etapa posterior.';

-- ============================================
-- 4) company_invites.is_initial_owner + índice único parcial
-- ============================================
ALTER TABLE public.company_invites
  ADD COLUMN IF NOT EXISTS is_initial_owner BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.company_invites.is_initial_owner IS
  'Owner inicial do tenant. Só Platform Admin pode definir true. Aceite promove role=owner.';

DROP INDEX IF EXISTS public.idx_company_invites_initial_owner_pending;
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_invites_one_initial_owner_pending
  ON public.company_invites (company_id)
  WHERE is_initial_owner = true AND status = 'pending';

-- ============================================
-- 5) Trigger: só Platform Admin altera is_initial_owner → true / muda o flag
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_company_invite_initial_owner_admin_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_initial_owner IS TRUE AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'is_initial_owner_requires_platform_admin'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_initial_owner IS DISTINCT FROM OLD.is_initial_owner
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'is_initial_owner_requires_platform_admin'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_invite_initial_owner_admin_only
  ON public.company_invites;

CREATE TRIGGER trg_enforce_invite_initial_owner_admin_only
  BEFORE INSERT OR UPDATE ON public.company_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_invite_initial_owner_admin_only();

REVOKE ALL ON FUNCTION public.enforce_company_invite_initial_owner_admin_only() FROM PUBLIC;

-- Reforço RLS (OR com policies existentes; trigger é a garantia)
DROP POLICY IF EXISTS "Managers can insert company invites" ON public.company_invites;
CREATE POLICY "Managers can insert company invites"
  ON public.company_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_company(company_id)
    AND (
      is_initial_owner = false
      OR public.is_platform_admin()
    )
  );

DROP POLICY IF EXISTS "Managers can update company invites" ON public.company_invites;
CREATE POLICY "Managers can update company invites"
  ON public.company_invites
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (
    public.can_manage_company(company_id)
    AND (
      is_initial_owner = false
      OR public.is_platform_admin()
    )
  );

-- Platform Admin: INSERT/UPDATE de convites (necessário se não for membro do tenant)
DROP POLICY IF EXISTS "Platform admins can insert company invites" ON public.company_invites;
CREATE POLICY "Platform admins can insert company invites"
  ON public.company_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update company invites" ON public.company_invites;
CREATE POLICY "Platform admins can update company invites"
  ON public.company_invites
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ============================================
-- 6) RPC atômica (e-mail Auth fora)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_company_with_owner_invite(
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
  p_permissions jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  company_id UUID,
  invite_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
  v_invite_id UUID;
  v_slug TEXT;
  v_owner_email TEXT;
  v_token TEXT;
  v_invited_by UUID;
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

  -- Owner inicial NÃO pode nascer com permissions vazias
  IF p_permissions IS NULL
     OR jsonb_typeof(p_permissions) <> 'array'
     OR jsonb_array_length(p_permissions) = 0 THEN
    RAISE EXCEPTION 'owner_permissions_required';
  END IF;

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

REVOKE ALL ON FUNCTION public.create_company_with_owner_invite(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  public.company_plan, public.company_status,
  TEXT, TEXT, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_company_with_owner_invite(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  public.company_plan, public.company_status,
  TEXT, TEXT, jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_company_with_owner_invite(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  public.company_plan, public.company_status,
  TEXT, TEXT, jsonb
) TO service_role;

COMMENT ON FUNCTION public.create_company_with_owner_invite IS
  'Platform Admin only. Cria company + invite Owner inicial. E-mail Auth na aplicação; reenvio se falhar.';
