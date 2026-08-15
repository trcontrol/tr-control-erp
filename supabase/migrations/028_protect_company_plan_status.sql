-- TR Control ERP — 028_protect_company_plan_status
-- Pré-requisito: 026 (is_platform_admin), 027 (company_plan / company_status).
-- Idempotente. NÃO alterar dados de empresas existentes.
--
-- Objetivo:
--   1) Impedir que membros do tenant alterem companies.plan / companies.status
--      via UPDATE direto (RLS de membro continua permitindo outros campos).
--   2) RPC update_company_plan_status somente para Platform Admin.
--
-- Estratégia de permissões órfãs (app): B — não apaga member_permissions no
-- downgrade; runtime de entitlement ignora módulos fora do plano.

-- ============================================
-- 1) Trigger: só Platform Admin (ou service_role) muda plan/status
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_companies_plan_status_platform_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Demais colunas (nome, telefone, logo, endereço etc.) fluem normalmente.
  IF NEW.plan IS NOT DISTINCT FROM OLD.plan
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- service_role: scripts / admin client operacional (nunca no browser).
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'company_plan_status_requires_platform_admin'
      USING ERRCODE = '42501',
            HINT = 'Somente Super Admin da plataforma pode alterar plan/status.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_companies_plan_status_platform_admin
  ON public.companies;

CREATE TRIGGER trg_enforce_companies_plan_status_platform_admin
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_companies_plan_status_platform_admin();

COMMENT ON FUNCTION public.enforce_companies_plan_status_platform_admin() IS
  'Bloqueia UPDATE de companies.plan/status por não–Platform-Admin. Outros campos permanecem editáveis pelo tenant.';

-- ============================================
-- 2) RPC: atualização comercial (plan + status)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_company_plan_status(
  p_company_id UUID,
  p_plan public.company_plan,
  p_status public.company_status
)
RETURNS TABLE (
  company_id UUID,
  plan public.company_plan,
  status public.company_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_platform_admin' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id_required';
  END IF;

  IF p_plan IS NULL THEN
    RAISE EXCEPTION 'company_plan_required';
  END IF;

  IF p_status IS NULL THEN
    RAISE EXCEPTION 'company_status_required';
  END IF;

  RETURN QUERY
  UPDATE public.companies AS c
  SET
    plan = p_plan,
    status = p_status,
    updated_at = NOW()
  WHERE c.id = p_company_id
  RETURNING c.id, c.plan, c.status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_company_plan_status(
  UUID,
  public.company_plan,
  public.company_status
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_company_plan_status(
  UUID,
  public.company_plan,
  public.company_status
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_company_plan_status(
  UUID,
  public.company_plan,
  public.company_status
) TO service_role;

COMMENT ON FUNCTION public.update_company_plan_status IS
  'Super Admin: atualiza somente companies.plan e companies.status. Não reconcilia member_permissions (estratégia B).';
