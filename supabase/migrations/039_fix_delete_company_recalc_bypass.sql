-- TR Control ERP — 039_fix_delete_company_recalc_bypass
-- Pré-requisito: 029 (recalculate_sale_totals), 030 (recalculate_purchase_totals),
--   035/038 (delete_company_for_platform_admin + GUC deleting_company).
-- Idempotente via CREATE OR REPLACE FUNCTION.
--
-- Problema:
--   Após 038, DELETE sale_items passa no BEFORE validate, mas o AFTER
--   trg_sale_items_recalc_after chama recalculate_sale_totals, que exige
--   membership sales.create|edit no tenant. Super Admin wipeando empresa
--   alheia falha com: "Sem permissão para recalcular totais desta venda."
--
-- Correção mínima:
--   No-op em recalculate_* somente se deleting_company=on AND is_platform_admin().
--   Não altera triggers AFTER nem estoque.

-- ============================================
-- 1) recalculate_sale_totals
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_sale_totals(p_sale_id UUID)
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
  v_company_id UUID;
BEGIN
  -- Wipe de tenant (Super Admin): não recalcular / não exigir membership.
  IF current_setting('tr_control.deleting_company', true) = 'on'
     AND public.is_platform_admin() THEN
    RETURN;
  END IF;

  IF NULLIF(current_setting('app.sales_recalculating', true), '') = '1' THEN
    RETURN;
  END IF;

  SELECT company_id
  INTO v_company_id
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT (
    public.member_has_module_permission(v_company_id, 'sales', 'create')
    OR public.member_has_module_permission(v_company_id, 'sales', 'edit')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para recalcular totais desta venda.';
  END IF;

  PERFORM set_config('app.sales_recalculating', '1', true);

  SELECT COALESCE(SUM(GREATEST(line_total, 0)), 0)
  INTO v_items_subtotal
  FROM public.sale_items
  WHERE sale_id = p_sale_id;

  SELECT freight_amount, discount_amount
  INTO v_freight, v_discount
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM set_config('app.sales_recalculating', '0', true);
    RETURN;
  END IF;

  v_total := ROUND(
    v_items_subtotal - COALESCE(v_discount, 0) + COALESCE(v_freight, 0),
    2
  );
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  UPDATE public.sales
  SET
    items_subtotal = v_items_subtotal,
    total_amount = v_total
  WHERE id = p_sale_id;

  PERFORM set_config('app.sales_recalculating', '0', true);
END;
$$;

COMMENT ON FUNCTION public.recalculate_sale_totals(UUID) IS
  'Recalcula totais da venda. Authz: sales.create|edit + plano. No-op no wipe: deleting_company=on AND is_platform_admin().';

-- ============================================
-- 2) recalculate_purchase_totals
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
  v_company_id UUID;
BEGIN
  IF current_setting('tr_control.deleting_company', true) = 'on'
     AND public.is_platform_admin() THEN
    RETURN;
  END IF;

  v_guard := NULLIF(current_setting('app.purchases_recalculating', true), '');
  IF v_guard = '1' THEN
    RETURN;
  END IF;

  SELECT company_id
  INTO v_company_id
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT (
    public.member_has_module_permission(v_company_id, 'purchases', 'create')
    OR public.member_has_module_permission(v_company_id, 'purchases', 'edit')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para recalcular totais desta compra.';
  END IF;

  PERFORM set_config('app.purchases_recalculating', '1', true);

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

COMMENT ON FUNCTION public.recalculate_purchase_totals(UUID) IS
  'Recalcula totais da compra. Authz: purchases.create|edit + plano. No-op no wipe: deleting_company=on AND is_platform_admin().';
