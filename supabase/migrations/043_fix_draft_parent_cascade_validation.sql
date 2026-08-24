-- TR Control ERP — 043_fix_draft_parent_cascade_validation
-- Pré-requisito: 038 (domain triggers + admin bypass), 039 (recalc no-op on wipe).
-- Idempotente via CREATE OR REPLACE.
--
-- Problema:
--   DELETE sales/purchases (draft) dispara ON DELETE CASCADE em filhos.
--   BEFORE DELETE nos filhos consulta o pai, que já foi removido → status NULL /
--   NOT FOUND → trigger aborta como se não fosse draft.
--
-- Correção:
--   DELETE de filho com pai ausente = CASCADE legítimo → RETURN OLD.
--   INSERT/UPDATE com pai ausente → continua bloqueando.
--   Pai existente e não-draft → comportamento draft-only preservado.
--   Não altera RLS, cancel_sale/cancel_purchase, confirm_*, recalc (039).

-- ============================================
-- 1) sale_items
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

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Venda não encontrada.';
  END IF;

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
  'Valida itens de venda (draft-only). CASCADE: DELETE com pai ausente permitido. Bypass wipe: deleting_company=on AND is_platform_admin().';

-- ============================================
-- 2) sale_payment_schedules
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
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
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
  'Plano de pagamento só em draft. CASCADE: DELETE com pai ausente permitido. Bypass wipe: deleting_company=on AND is_platform_admin().';

-- ============================================
-- 3) purchase_items
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

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Compra não encontrada.';
  END IF;

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
  'Valida itens de compra (draft-only) + line_total. CASCADE: DELETE com pai ausente permitido. Bypass wipe: deleting_company=on AND is_platform_admin().';
