-- TR Control ERP — Corrigir stack depth limit exceeded no módulo Compras
-- Migration: 013_fix_purchases_trigger_recursion
-- Idempotente: segura para executar mais de uma vez.
-- Não remove isolamento por empresa nem apaga dados.
--
-- Causa exata:
--   public.recalculate_purchase_totals() fazia UPDATE em purchase_items
--   (recalculando line_total). Esse UPDATE disparava o trigger
--   trg_purchase_items_recalc_after, que chamava novamente
--   recalculate_purchase_totals(), formando um ciclo infinito:
--
--     purchase_items AFTER trigger
--       → recalculate_purchase_totals
--         → UPDATE purchase_items
--           → AFTER trigger
--             → recalculate_purchase_totals
--               → ... (stack depth limit exceeded)
--
--   O erro surge ao salvar itens/totais da compra (fluxo de /purchases/new)
--   e também em qualquer RPC/ação que recalcule totais.
--
-- Correção:
--   1) line_total continua sendo calculado no BEFORE trigger (por linha);
--   2) recalculate_purchase_totals só soma line_total e atualiza o cabeçalho;
--   3) guarda de reentrância via set_config;
--   4) AFTER trigger ignora updates só de vínculos (stock_movement_id/snapshot);
--   5) reforço de is_company_member / can_manage_company (SECURITY DEFINER).

-- ============================================
-- Funções de membership (sem recursão RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_company_member(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE company_members.company_id = target_company_id
      AND company_members.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_company(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE company_members.company_id = target_company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_company_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company(UUID) TO authenticated;

-- Garante políticas não-recursivas em company_members (mesmo padrão da 004)
DROP POLICY IF EXISTS "Owners and admins can manage memberships" ON public.company_members;
DROP POLICY IF EXISTS "Members can view company memberships" ON public.company_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.company_members;
DROP POLICY IF EXISTS "Managers can insert memberships" ON public.company_members;
DROP POLICY IF EXISTS "Managers can update memberships" ON public.company_members;
DROP POLICY IF EXISTS "Managers can delete memberships" ON public.company_members;

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers can insert memberships"
  ON public.company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "Managers can update memberships"
  ON public.company_members
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "Managers can delete memberships"
  ON public.company_members
  FOR DELETE
  TO authenticated
  USING (public.can_manage_company(company_id));

-- ============================================
-- Recalcular totais SEM atualizar purchase_items
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_purchase_totals(p_purchase_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items_subtotal NUMERIC(14, 2);
  v_freight NUMERIC(14, 2);
  v_discount NUMERIC(14, 2);
  v_total NUMERIC(14, 2);
  v_guard TEXT;
BEGIN
  -- Evita reentrância se algum caminho antigo ainda atualizar itens
  v_guard := NULLIF(current_setting('app.purchases_recalculating', true), '');
  IF v_guard = '1' THEN
    RETURN;
  END IF;

  PERFORM set_config('app.purchases_recalculating', '1', true);

  -- line_total já é definido no BEFORE trigger; aqui só agregamos
  SELECT COALESCE(SUM(GREATEST(line_total, 0)), 0)
  INTO v_items_subtotal
  FROM public.purchase_items
  WHERE purchase_id = p_purchase_id;

  SELECT freight_amount, discount_amount
  INTO v_freight, v_discount
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM set_config('app.purchases_recalculating', '0', true);
    RETURN;
  END IF;

  v_total := ROUND(
    v_items_subtotal - COALESCE(v_discount, 0) + COALESCE(v_freight, 0),
    2
  );
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  UPDATE public.purchases
  SET
    items_subtotal = v_items_subtotal,
    total_amount = v_total
  WHERE id = p_purchase_id;

  PERFORM set_config('app.purchases_recalculating', '0', true);
END;
$$;

-- BEFORE: valida + calcula line_total da linha (sem chamar recalculate)
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

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- AFTER: atualiza só o cabeçalho; ignora updates de vínculo de estoque
CREATE OR REPLACE FUNCTION public.trg_purchase_items_recalc_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(current_setting('app.purchases_recalculating', true), '') = '1' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Na confirmação/cancelamento só mudam vínculos; não precisa recalcular totais
  IF TG_OP = 'UPDATE'
    AND NEW.quantity IS NOT DISTINCT FROM OLD.quantity
    AND NEW.unit_cost IS NOT DISTINCT FROM OLD.unit_cost
    AND NEW.discount_amount IS NOT DISTINCT FROM OLD.discount_amount
    AND NEW.product_id IS NOT DISTINCT FROM OLD.product_id
    AND NEW.purchase_id IS NOT DISTINCT FROM OLD.purchase_id
  THEN
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_purchase_totals(
    COALESCE(NEW.purchase_id, OLD.purchase_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_items_validate ON public.purchase_items;
CREATE TRIGGER trg_purchase_items_validate
  BEFORE INSERT OR UPDATE OR DELETE ON public.purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchase_items_recalc();

DROP TRIGGER IF EXISTS trg_purchase_items_recalc_after ON public.purchase_items;
CREATE TRIGGER trg_purchase_items_recalc_after
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchase_items_recalc_after();

-- Header: frete/desconto → só agrega (sem tocar itens)
CREATE OR REPLACE FUNCTION public.trg_purchases_recalc_on_header()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(current_setting('app.purchases_recalculating', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      NEW.freight_amount IS DISTINCT FROM OLD.freight_amount
      OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    )
  THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'Frete e desconto só podem ser alterados em compras em rascunho.';
    END IF;
    PERFORM public.recalculate_purchase_totals(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchases_recalc_on_header ON public.purchases;
CREATE TRIGGER trg_purchases_recalc_on_header
  AFTER UPDATE OF freight_amount, discount_amount ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchases_recalc_on_header();

REVOKE ALL ON FUNCTION public.recalculate_purchase_totals(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_purchase_totals(UUID) TO authenticated;
