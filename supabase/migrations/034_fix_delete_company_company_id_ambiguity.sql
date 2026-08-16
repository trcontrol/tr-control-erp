-- TR Control ERP — 034_fix_delete_company_company_id_ambiguity
-- Pré-requisito: 033 já aplicada no remoto (RPC existe, mas falha com
-- "column reference company_id is ambiguous").
-- Idempotente: CREATE OR REPLACE da mesma assinatura.
-- NÃO alterar UI/Auth. NÃO aplicar automaticamente sem autorização.
--
-- Causa:
--   RETURNS TABLE (company_id UUID, company_name TEXT) introduz variáveis
--   PL/pgSQL com esses nomes. Em
--     DELETE FROM public.sale_items WHERE company_id = p_company_id;
--   o PostgreSQL não distingue a coluna da tabela da variável OUT → ambiguo.
--   O primeiro statement a falhar é o DELETE em sale_items; os demais WHERE
--   company_id não qualificados teriam o mesmo problema.
--
-- Correção:
--   Qualificar todas as colunas com alias de tabela (si.company_id, etc.).

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
  'Super Admin: exclui tenant e dados operacionais do company_id. Não apaga auth.users/profiles/platform_admins. Colunas company_id qualificadas (fix 034).';
