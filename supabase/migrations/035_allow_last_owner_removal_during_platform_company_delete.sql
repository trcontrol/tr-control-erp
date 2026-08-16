-- TR Control ERP — 035_allow_last_owner_removal_during_platform_company_delete
-- Pré-requisito: 024 (enforce_company_member_protections), 026 (is_platform_admin),
--   033/034 (delete_company_for_platform_admin).
-- Idempotente. NÃO aplicar automaticamente sem autorização.
--
-- Diagnóstico:
--   Trigger trg_enforce_company_member_protections (BEFORE UPDATE OR DELETE
--   ON public.company_members) → function enforce_company_member_protections().
--   No DELETE do último owner, RAISE:
--     "Não é permitido remover o proprietário principal (último owner) da empresa."
--   A RPC 034 setava tr_control.deleting_company=on só em torno de
--   financial_entries e voltava off ANTES de DELETE company_members → bloqueio.
--
-- Correção:
--   1) Bypass no trigger SOMENTE se GUC deleting_company=on AND is_platform_admin().
--      (GUC sozinho não basta: authenticated pode set_config manualmente.)
--   2) RPC mantém GUC=on desde antes dos deletes sensíveis até após company_members.

-- ============================================
-- 1) Proteção de membership: bypass controlado
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_company_member_protections()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company_id UUID;
  remaining_owners INTEGER;
  remaining_admins INTEGER;
  old_role public.company_role;
  new_role public.company_role;
  old_status public.member_status;
  new_status public.member_status;
BEGIN
  -- Wipe integral de tenant (Super Admin): GUC local + is_platform_admin().
  IF current_setting('tr_control.deleting_company', true) = 'on'
     AND public.is_platform_admin() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    target_company_id := OLD.company_id;
    old_role := OLD.role;
    old_status := COALESCE(OLD.status, 'active'::public.member_status);

    IF old_role = 'owner' THEN
      SELECT COUNT(*)::INTEGER INTO remaining_owners
      FROM public.company_members
      WHERE company_id = target_company_id
        AND id <> OLD.id
        AND role = 'owner'
        AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

      IF remaining_owners = 0 THEN
        RAISE EXCEPTION
          'Não é permitido remover o proprietário principal (último owner) da empresa.';
      END IF;
    END IF;

    IF old_role IN ('owner', 'admin')
       AND COALESCE(old_status, 'active'::public.member_status) <> 'inactive' THEN
      SELECT COUNT(*)::INTEGER INTO remaining_admins
      FROM public.company_members
      WHERE company_id = target_company_id
        AND id <> OLD.id
        AND role IN ('owner', 'admin')
        AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

      IF remaining_admins = 0 THEN
        RAISE EXCEPTION
          'Não é permitido remover o último administrador da empresa.';
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  -- UPDATE
  target_company_id := NEW.company_id;
  old_role := OLD.role;
  new_role := NEW.role;
  old_status := COALESCE(OLD.status, 'active'::public.member_status);
  new_status := COALESCE(NEW.status, 'active'::public.member_status);

  -- Impede rebaixar o último owner
  IF old_role = 'owner' AND new_role IS DISTINCT FROM 'owner' THEN
    SELECT COUNT(*)::INTEGER INTO remaining_owners
    FROM public.company_members
    WHERE company_id = target_company_id
      AND id <> OLD.id
      AND role = 'owner'
      AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

    IF remaining_owners = 0 THEN
      RAISE EXCEPTION
        'Não é permitido rebaixar o proprietário principal (último owner) da empresa.';
    END IF;
  END IF;

  -- Impede inativar o último owner
  IF old_role = 'owner'
     AND old_status <> 'inactive'
     AND new_status = 'inactive' THEN
    SELECT COUNT(*)::INTEGER INTO remaining_owners
    FROM public.company_members
    WHERE company_id = target_company_id
      AND id <> OLD.id
      AND role = 'owner'
      AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

    IF remaining_owners = 0 THEN
      RAISE EXCEPTION
        'Não é permitido inativar o proprietário principal (último owner) da empresa.';
    END IF;
  END IF;

  -- Impede perder o último administrador (owner|admin ativo)
  IF (
        (old_role IN ('owner', 'admin') AND new_role NOT IN ('owner', 'admin'))
        OR
        (old_role IN ('owner', 'admin')
          AND old_status <> 'inactive'
          AND new_status = 'inactive')
      ) THEN
    SELECT COUNT(*)::INTEGER INTO remaining_admins
    FROM public.company_members
    WHERE company_id = target_company_id
      AND id <> OLD.id
      AND role IN ('owner', 'admin')
      AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION
        'Não é permitido remover ou inativar o último administrador da empresa.';
    END IF;
  END IF;

  -- Não permitir trocar company_id (protege isolamento multi-tenant)
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Não é permitido mover membership entre empresas.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_company_member_protections() IS
  'BEFORE UPDATE/DELETE em company_members: protege último owner/admin. Bypass só com tr_control.deleting_company=on E is_platform_admin().';

-- ============================================
-- 2) RPC: GUC ativo até após company_members
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_company_for_platform_admin(
  p_company_id UUID
)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
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

  SELECT c.name
  INTO v_name
  FROM public.companies AS c
  WHERE c.id = p_company_id
  FOR UPDATE;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'company_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Contexto local à transação: financeiro (031) + memberships (024).
  -- Triggers exigem também is_platform_admin() no bypass de memberships.
  PERFORM set_config('tr_control.deleting_company', 'on', true);

  DELETE FROM public.sale_items AS si
  WHERE si.company_id = p_company_id;

  DELETE FROM public.purchase_items AS pi
  WHERE pi.company_id = p_company_id;

  DELETE FROM public.stock_movements AS sm
  WHERE sm.company_id = p_company_id;

  DELETE FROM public.sales AS s
  WHERE s.company_id = p_company_id;

  DELETE FROM public.purchases AS p
  WHERE p.company_id = p_company_id;

  DELETE FROM public.financial_entries AS fe
  WHERE fe.company_id = p_company_id;

  DELETE FROM public.opportunities AS o
  WHERE o.company_id = p_company_id;

  DELETE FROM public.tasks AS t
  WHERE t.company_id = p_company_id;

  DELETE FROM public.agenda_events AS ae
  WHERE ae.company_id = p_company_id;

  DELETE FROM public.products AS pr
  WHERE pr.company_id = p_company_id;

  DELETE FROM public.customers AS cu
  WHERE cu.company_id = p_company_id;

  DELETE FROM public.suppliers AS su
  WHERE su.company_id = p_company_id;

  DELETE FROM public.member_permissions AS mp
  WHERE mp.company_id = p_company_id;

  DELETE FROM public.company_invites AS ci
  WHERE ci.company_id = p_company_id;

  DELETE FROM public.company_members AS cm
  WHERE cm.company_id = p_company_id;

  DELETE FROM public.companies AS c
  WHERE c.id = p_company_id;

  PERFORM set_config('tr_control.deleting_company', 'off', true);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found' USING ERRCODE = 'P0002';
  END IF;

  company_id := p_company_id;
  company_name := v_name;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_company_for_platform_admin(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.delete_company_for_platform_admin(UUID)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.delete_company_for_platform_admin(UUID)
  TO service_role;

COMMENT ON FUNCTION public.delete_company_for_platform_admin(UUID) IS
  'Super Admin: exclui tenant. GUC deleting_company=on até após company_members. Não apaga auth.users/profiles/platform_admins.';
