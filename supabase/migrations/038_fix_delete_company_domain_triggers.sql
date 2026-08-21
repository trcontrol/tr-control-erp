-- TR Control ERP — 038_fix_delete_company_domain_triggers
-- Pré-requisito: 013 (purchase items), 015 (sale items), 035 (delete company RPC),
--   036 (sale_payment_schedules).
-- Idempotente via CREATE OR REPLACE.
--
-- Problema:
--   delete_company_for_platform_admin liga tr_control.deleting_company=on, mas
--   trg_sale_items_validate / schedules / purchase_items NÃO respeitam o GUC.
--   DELETE de sale_items de vendas confirmed/cancelled aborta o wipe com:
--   "Itens só podem ser incluídos ou removidos em vendas em rascunho."
--
-- Correção mínima:
--   Bypass nos triggers de domínio SOMENTE se GUC=on AND is_platform_admin().
--   Uso normal (draft-only) permanece intacto.
--   RPC: DELETE explícito de sale_payment_schedules antes de sales.

-- ============================================
-- 1) sale_items — bypass administrativo
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_sale_items_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
  v_status TEXT;
BEGIN
  -- Wipe de tenant (Super Admin): GUC local + is_platform_admin().
  IF current_setting('tr_control.deleting_company', true) = 'on'
     AND public.is_platform_admin() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

  SELECT status INTO v_status
  FROM public.sales
  WHERE id = v_sale_id;

  IF v_status IS DISTINCT FROM 'draft' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Itens só podem ser incluídos ou removidos em vendas em rascunho.';
    END IF;

    IF TG_OP = 'UPDATE'
      AND (
        NEW.quantity IS DISTINCT FROM OLD.quantity
        OR NEW.unit_price IS DISTINCT FROM OLD.unit_price
        OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
        OR NEW.product_id IS DISTINCT FROM OLD.product_id
        OR NEW.company_id IS DISTINCT FROM OLD.company_id
        OR NEW.sale_id IS DISTINCT FROM OLD.sale_id
      )
    THEN
      RAISE EXCEPTION 'Itens só podem ser alterados em vendas com status rascunho.';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
      RAISE EXCEPTION 'A quantidade do item deve ser maior que zero.';
    END IF;
    IF NEW.unit_price IS NULL OR NEW.unit_price < 0 THEN
      RAISE EXCEPTION 'O valor unitário não pode ser negativo.';
    END IF;
    IF NEW.discount_amount IS NULL OR NEW.discount_amount < 0 THEN
      RAISE EXCEPTION 'O desconto do item não pode ser negativo.';
    END IF;

    NEW.line_total := ROUND((NEW.quantity * NEW.unit_price) - NEW.discount_amount, 2);
    IF NEW.line_total < 0 THEN
      RAISE EXCEPTION 'O total do item não pode ser negativo.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_sale_items_validate() IS
  'Valida itens de venda (draft-only). Bypass wipe: deleting_company=on AND is_platform_admin().';

-- ============================================
-- 2) sale_payment_schedules — bypass administrativo
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_sale_payment_schedules_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
  v_status TEXT;
  v_company_id UUID;
BEGIN
  IF current_setting('tr_control.deleting_company', true) = 'on'
     AND public.is_platform_admin() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

  SELECT status, company_id
  INTO v_status, v_company_id
  FROM public.sales
  WHERE id = v_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada para o plano de pagamento.';
  END IF;

  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION
      'O plano de pagamento só pode ser incluído, alterado ou removido em vendas em rascunho.';
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.company_id IS DISTINCT FROM v_company_id THEN
      RAISE EXCEPTION
        'company_id do plano de pagamento deve coincidir com a empresa da venda.';
    END IF;

    IF NEW.installment_number IS NULL OR NEW.installment_number < 1 THEN
      RAISE EXCEPTION 'O número da parcela deve ser maior ou igual a 1.';
    END IF;

    IF NEW.installment_count IS NULL OR NEW.installment_count < 1 THEN
      RAISE EXCEPTION 'O total de parcelas deve ser maior ou igual a 1.';
    END IF;

    IF NEW.installment_number > NEW.installment_count THEN
      RAISE EXCEPTION 'O número da parcela não pode exceder o total de parcelas.';
    END IF;

    IF NEW.amount IS NULL OR NEW.amount < 0 THEN
      RAISE EXCEPTION 'O valor da parcela não pode ser negativo.';
    END IF;

    IF NEW.due_date IS NULL THEN
      RAISE EXCEPTION 'A data de vencimento da parcela é obrigatória.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_sale_payment_schedules_validate() IS
  'Plano de pagamento só em draft. Bypass wipe: deleting_company=on AND is_platform_admin().';

-- ============================================
-- 3) purchase_items — bypass administrativo (espelho)
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_purchase_items_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id UUID;
  v_status TEXT;
BEGIN
  IF current_setting('tr_control.deleting_company', true) = 'on'
     AND public.is_platform_admin() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  v_purchase_id := COALESCE(NEW.purchase_id, OLD.purchase_id);

  SELECT status INTO v_status
  FROM public.purchases
  WHERE id = v_purchase_id;

  IF v_status IS DISTINCT FROM 'draft' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Itens só podem ser incluídos ou removidos em compras em rascunho.';
    END IF;

    IF TG_OP = 'UPDATE'
      AND (
        NEW.quantity IS DISTINCT FROM OLD.quantity
        OR NEW.unit_cost IS DISTINCT FROM OLD.unit_cost
        OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
        OR NEW.product_id IS DISTINCT FROM OLD.product_id
        OR NEW.company_id IS DISTINCT FROM OLD.company_id
        OR NEW.purchase_id IS DISTINCT FROM OLD.purchase_id
      )
    THEN
      RAISE EXCEPTION 'Itens só podem ser alterados em compras com status rascunho.';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
      RAISE EXCEPTION 'A quantidade do item deve ser maior que zero.';
    END IF;
    IF NEW.unit_cost IS NULL OR NEW.unit_cost < 0 THEN
      RAISE EXCEPTION 'O valor unitário não pode ser negativo.';
    END IF;
    IF NEW.discount_amount IS NULL OR NEW.discount_amount < 0 THEN
      RAISE EXCEPTION 'O desconto do item não pode ser negativo.';
    END IF;

    NEW.line_total := ROUND((NEW.quantity * NEW.unit_cost) - NEW.discount_amount, 2);
    IF NEW.line_total < 0 THEN
      RAISE EXCEPTION 'O total do item não pode ser negativo.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_purchase_items_recalc() IS
  'Valida itens de compra (draft-only) + line_total. Bypass wipe: deleting_company=on AND is_platform_admin().';

-- ============================================
-- 4) RPC — DELETE explícito de sale_payment_schedules
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

  -- Contexto local à transação: financeiro (031) + memberships (024) + domain triggers (038).
  PERFORM set_config('tr_control.deleting_company', 'on', true);

  DELETE FROM public.sale_items AS si
  WHERE si.company_id = p_company_id;

  DELETE FROM public.purchase_items AS pi
  WHERE pi.company_id = p_company_id;

  DELETE FROM public.stock_movements AS sm
  WHERE sm.company_id = p_company_id;

  -- Explícito (036): não depender só de CASCADE em sales.
  DELETE FROM public.sale_payment_schedules AS sps
  WHERE sps.company_id = p_company_id;

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
  'Super Admin: exclui tenant. GUC deleting_company=on até após company_members. Inclui sale_payment_schedules. Não apaga auth.users/profiles/platform_admins.';
