-- TR Control ERP — Autorização nas RPCs de Purchases (Fase 2B)
-- Migration: 030_purchases_rpc_authorization
-- Pré-requisito: 029 (plan_includes_module + member_has_module_permission)
--
-- Endurece confirm_purchase / cancel_purchase / recalculate_purchase_totals:
--   plan entitlement ∩ membership ativa ∩ member_permissions
--   (Owner / access_profile administrator = full dentro do plano).
--
-- NÃO altera lógica funcional (estoque, custo médio, financeiro, status).
-- NÃO altera dados.
-- NÃO recria helpers da 029 — apenas reutiliza.
--
-- Cancelamento: mantém V1 — NÃO reverte products.cost_price.

-- ============================================
-- recalculate_purchase_totals — create|edit
-- ============================================
-- Decisão: exige create OU edit (draft create e update). Sem nova assinatura.
-- Preserva guarda de reentrância de 013.

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
  'Recalcula totais da compra. Authz: purchases.create OU purchases.edit + plano.';

-- ============================================
-- confirm_purchase — exige purchases.edit (+ plano)
-- Corpo = 014 (custo médio) + authz no lugar de is_company_member
-- ============================================

CREATE OR REPLACE FUNCTION public.confirm_purchase(p_purchase_id UUID)
RETURNS public.purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
  v_item public.purchase_items%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_supplier public.suppliers%ROWTYPE;
  v_movement_id UUID;
  v_entry_id UUID;
  v_item_count INTEGER;
  v_existing_movements INTEGER;
  v_existing_entries INTEGER;
  v_description TEXT;
  v_prev_qty NUMERIC(14, 3);
  v_prev_cost NUMERIC(14, 4);
  v_net_unit NUMERIC(14, 4);
  v_new_cost NUMERIC(14, 2);
  v_line_total NUMERIC(14, 2);
BEGIN
  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compra não encontrada.';
  END IF;

  IF NOT public.member_has_module_permission(
    v_purchase.company_id,
    'purchases',
    'edit'
  ) THEN
    RAISE EXCEPTION 'Sem permissão para confirmar esta compra.';
  END IF;

  IF v_purchase.status = 'confirmed' THEN
    RETURN v_purchase;
  END IF;

  IF v_purchase.status = 'cancelled' THEN
    RAISE EXCEPTION 'Não é possível confirmar uma compra cancelada.';
  END IF;

  IF v_purchase.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Somente compras em rascunho podem ser confirmadas.';
  END IF;

  IF v_purchase.supplier_id IS NULL THEN
    RAISE EXCEPTION 'Informe o fornecedor antes de confirmar a compra.';
  END IF;

  SELECT * INTO v_supplier
  FROM public.suppliers
  WHERE id = v_purchase.supplier_id
    AND company_id = v_purchase.company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fornecedor inválido para esta empresa.';
  END IF;

  SELECT COUNT(*) INTO v_item_count
  FROM public.purchase_items
  WHERE purchase_id = v_purchase.id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Não é possível confirmar uma compra sem itens.';
  END IF;

  PERFORM public.recalculate_purchase_totals(v_purchase.id);

  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF COALESCE(v_purchase.stock_posted, FALSE)
    OR COALESCE(v_purchase.finance_posted, FALSE)
    OR COALESCE(v_purchase.cost_posted, FALSE)
    OR v_purchase.financial_entry_id IS NOT NULL
  THEN
    RAISE EXCEPTION 'Esta compra já possui integração de estoque, custo ou financeiro. Evitando duplicidade.';
  END IF;

  SELECT COUNT(*) INTO v_existing_movements
  FROM public.stock_movements
  WHERE company_id = v_purchase.company_id
    AND source_type = 'purchase'
    AND source_id = v_purchase.id;

  IF v_existing_movements > 0 THEN
    RAISE EXCEPTION 'Já existem movimentações de estoque para esta compra.';
  END IF;

  SELECT COUNT(*) INTO v_existing_entries
  FROM public.financial_entries
  WHERE company_id = v_purchase.company_id
    AND source_type = 'purchase'
    AND source_id = v_purchase.id;

  IF v_existing_entries > 0 THEN
    RAISE EXCEPTION 'Já existe lançamento financeiro para esta compra.';
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.purchase_items
    WHERE purchase_id = v_purchase.id
    ORDER BY sort_order, created_at
  LOOP
    IF v_item.cost_after IS NOT NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
      AND company_id = v_purchase.company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto da compra não encontrado.';
    END IF;

    UPDATE public.purchase_items
    SET tracks_stock_snapshot = COALESCE(v_product.tracks_stock, FALSE)
    WHERE id = v_item.id;

    IF COALESCE(v_product.tracks_stock, FALSE) THEN
      v_prev_qty := COALESCE(v_product.current_stock, 0);
      v_prev_cost := COALESCE(v_product.cost_price, 0);

      v_line_total := ROUND(
        (v_item.quantity * v_item.unit_cost) - COALESCE(v_item.discount_amount, 0),
        2
      );
      IF v_line_total < 0 THEN
        v_line_total := 0;
      END IF;

      v_net_unit := ROUND(v_line_total / v_item.quantity, 4);

      v_new_cost := public.calculate_weighted_average_cost(
        v_prev_qty,
        v_prev_cost,
        v_item.quantity,
        v_net_unit
      );

      INSERT INTO public.stock_movements (
        company_id,
        product_id,
        movement_type,
        quantity,
        movement_date,
        notes,
        responsible_user_id,
        source_type,
        source_id
      )
      VALUES (
        v_purchase.company_id,
        v_item.product_id,
        'entry',
        v_item.quantity,
        v_purchase.purchase_date,
        CONCAT(
          'Entrada automática — Compra ',
          COALESCE(NULLIF(btrim(v_purchase.document_number), ''), LEFT(v_purchase.id::text, 8))
        ),
        auth.uid(),
        'purchase',
        v_purchase.id
      )
      RETURNING id INTO v_movement_id;

      UPDATE public.products
      SET cost_price = v_new_cost
      WHERE id = v_product.id
        AND company_id = v_purchase.company_id;

      UPDATE public.purchase_items
      SET
        stock_movement_id = v_movement_id,
        net_unit_cost = v_net_unit,
        cost_before = v_prev_cost,
        cost_after = v_new_cost,
        line_total = v_line_total
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  v_description := CONCAT(
    'Compra ',
    COALESCE(NULLIF(btrim(v_purchase.document_number), ''), LEFT(v_purchase.id::text, 8)),
    ' — ',
    COALESCE(v_supplier.trade_name, v_supplier.full_name)
  );

  INSERT INTO public.financial_entries (
    company_id,
    supplier_id,
    entry_type,
    description,
    category,
    party_name,
    amount,
    issue_date,
    due_date,
    status,
    payment_method,
    document_number,
    notes,
    is_recurring,
    source_type,
    source_id
  )
  VALUES (
    v_purchase.company_id,
    v_purchase.supplier_id,
    'payable',
    v_description,
    'Fornecedores',
    COALESCE(v_supplier.trade_name, v_supplier.full_name),
    v_purchase.total_amount,
    v_purchase.purchase_date,
    COALESCE(v_purchase.due_date, v_purchase.purchase_date),
    'pending',
    v_purchase.payment_method,
    v_purchase.document_number,
    v_purchase.notes,
    FALSE,
    'purchase',
    v_purchase.id
  )
  RETURNING id INTO v_entry_id;

  UPDATE public.purchases
  SET
    status = 'confirmed',
    stock_posted = TRUE,
    finance_posted = TRUE,
    cost_posted = TRUE,
    financial_entry_id = v_entry_id,
    confirmed_at = NOW(),
    confirmed_by = auth.uid(),
    due_date = COALESCE(due_date, purchase_date)
  WHERE id = v_purchase.id
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
END;
$$;

COMMENT ON FUNCTION public.confirm_purchase(UUID) IS
  'Confirma compra: estoque + custo médio + CP. Authz: purchases.edit + plano. Não exige finance/stock perms.';

-- ============================================
-- cancel_purchase — exige purchases.edit (+ plano)
-- V1: NÃO recalcula products.cost_price
-- ============================================

CREATE OR REPLACE FUNCTION public.cancel_purchase(
  p_purchase_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
  v_entry public.financial_entries%ROWTYPE;
  v_item public.purchase_items%ROWTYPE;
BEGIN
  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compra não encontrada.';
  END IF;

  IF NOT public.member_has_module_permission(
    v_purchase.company_id,
    'purchases',
    'edit'
  ) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar esta compra.';
  END IF;

  IF v_purchase.status = 'cancelled' THEN
    RETURN v_purchase;
  END IF;

  IF v_purchase.status = 'draft' THEN
    UPDATE public.purchases
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = auth.uid(),
      cancelled_reason = NULLIF(btrim(p_reason), '')
    WHERE id = v_purchase.id
    RETURNING * INTO v_purchase;

    RETURN v_purchase;
  END IF;

  IF v_purchase.status IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'Somente compras confirmadas ou em rascunho podem ser canceladas.';
  END IF;

  IF v_purchase.financial_entry_id IS NOT NULL THEN
    SELECT * INTO v_entry
    FROM public.financial_entries
    WHERE id = v_purchase.financial_entry_id
    FOR UPDATE;

    IF FOUND AND v_entry.status IN ('paid', 'received') THEN
      RAISE EXCEPTION
        'Não é possível cancelar esta compra porque o lançamento financeiro relacionado já está pago. Desfaça ou estorne o pagamento no módulo Financeiro antes de cancelar a compra.';
    END IF;
  ELSE
    SELECT * INTO v_entry
    FROM public.financial_entries
    WHERE company_id = v_purchase.company_id
      AND source_type = 'purchase'
      AND source_id = v_purchase.id
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_entry.status IN ('paid', 'received') THEN
      RAISE EXCEPTION
        'Não é possível cancelar esta compra porque o lançamento financeiro relacionado já está pago. Desfaça ou estorne o pagamento no módulo Financeiro antes de cancelar a compra.';
    END IF;
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.purchase_items
    WHERE purchase_id = v_purchase.id
      AND stock_movement_id IS NOT NULL
  LOOP
    DELETE FROM public.stock_movements
    WHERE id = v_item.stock_movement_id
      AND company_id = v_purchase.company_id;

    UPDATE public.purchase_items
    SET stock_movement_id = NULL
    WHERE id = v_item.id;
  END LOOP;

  DELETE FROM public.stock_movements
  WHERE company_id = v_purchase.company_id
    AND source_type = 'purchase'
    AND source_id = v_purchase.id;

  UPDATE public.financial_entries
  SET status = 'cancelled'
  WHERE company_id = v_purchase.company_id
    AND (
      id = v_purchase.financial_entry_id
      OR (source_type = 'purchase' AND source_id = v_purchase.id)
    )
    AND status IS DISTINCT FROM 'paid'
    AND status IS DISTINCT FROM 'received';

  UPDATE public.purchases
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    cancelled_reason = NULLIF(btrim(p_reason), ''),
    stock_posted = FALSE
  WHERE id = v_purchase.id
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
END;
$$;

COMMENT ON FUNCTION public.cancel_purchase(UUID, TEXT) IS
  'Cancela compra: estorna estoque + cancela financeiro. Authz: purchases.edit + plano. V1 não reverte cost_price.';

REVOKE ALL ON FUNCTION public.recalculate_purchase_totals(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_purchase(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_purchase(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recalculate_purchase_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_purchase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_purchase(UUID, TEXT) TO authenticated;
