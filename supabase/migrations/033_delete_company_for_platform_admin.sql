-- TR Control ERP — 033_delete_company_for_platform_admin
-- Pré-requisito: 026 (is_platform_admin), 031 (protect financial delete), schema multi-tenant.
-- Idempotente. NÃO aplicar automaticamente em produção sem autorização.
--
-- Objetivo:
--   RPC SECURITY DEFINER para Super Admin excluir um tenant completo.
--   Preserva auth.users, profiles e platform_admins.
--   Exclusões explícitas na ordem segura (RESTRICT entre filhas) antes de
--   DELETE FROM companies — não altera FKs existentes.
--   Bypass controlado do trigger 031 via GUC de sessão (só nesta RPC).
--
-- Nota: RETURNS TABLE (company_id, company_name) cria variáveis PL/pgSQL com
-- esses nomes. Todo WHERE em colunas company_id DEVE ser qualificado com alias
-- (ex.: si.company_id) para evitar "column reference company_id is ambiguous".
-- Correção histórica no remoto: migration 034.

-- ============================================
-- 1) Permitir DELETE de financial_entries durante wipe do tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.protect_financial_entry_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_source TEXT;
BEGIN
  -- Bypass somente quando a RPC de exclusão de empresa marca a sessão.
  IF current_setting('tr_control.deleting_company', true) = 'on' THEN
    RETURN OLD;
  END IF;

  v_source := lower(btrim(COALESCE(OLD.source_type, '')));

  IF v_source IN ('purchase', 'sale') THEN
    RAISE EXCEPTION
      'Não é possível excluir lançamentos originados de compra ou venda. Gerencie o ciclo de vida pela operação de origem.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status IN ('paid', 'received') THEN
    RAISE EXCEPTION
      'Não é possível excluir um lançamento já pago ou recebido.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.protect_financial_entry_delete() IS
  'BEFORE DELETE: bloqueia hard-delete indevido; permite wipe de tenant via GUC tr_control.deleting_company=on.';

-- ============================================
-- 2) RPC: delete_company_for_platform_admin
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

  -- Ordem segura: quebra RESTRICT entre filhas antes de pais compartilhados.
  -- Não toca auth.users / profiles / platform_admins.
  -- Colunas company_id sempre qualificadas (conflito com OUT company_id).

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

  -- Libera o trigger 031 apenas nesta transação (is_local = true).
  PERFORM set_config('tr_control.deleting_company', 'on', true);

  DELETE FROM public.financial_entries AS fe
  WHERE fe.company_id = p_company_id;

  PERFORM set_config('tr_control.deleting_company', 'off', true);

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
  'Super Admin: exclui tenant e dados operacionais do company_id. Não apaga auth.users/profiles/platform_admins.';
