-- TR Control ERP — Custo médio ponderado na confirmação de compras
-- Migration: 014_purchase_weighted_average_cost
-- Idempotente: segura para executar mais de uma vez.
-- Não executa automaticamente pelo app.
--
-- Causa do valor total do estoque zerado:
--   O dashboard calcula saldo × products.cost_price, mas confirm_purchase
--   (012) não atualizava cost_price — decisão v1 original.
--
-- Esta migration:
--   - aplica custo médio ponderado ao confirmar compra;
--   - usa valor unitário líquido do item (com desconto do item);
--   - não rateia frete/desconto geral;
--   - só altera produtos com tracks_stock = true;
--   - é idempotente (cost_posted + colunas de auditoria no item);
--   - no cancelamento, NÃO recalcula custo histórico (mantém cost_price).

-- ============================================
-- Colunas de controle / auditoria
-- ============================================
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS cost_posted BOOLEAN;

UPDATE public.purchases
SET cost_posted = FALSE
WHERE cost_posted IS NULL;

ALTER TABLE public.purchases
  ALTER COLUMN cost_posted SET DEFAULT FALSE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchases'
      AND column_name = 'cost_posted'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.purchases
      ALTER COLUMN cost_posted SET NOT NULL;
  END IF;
END $$;

-- Compras já confirmadas: marca como postadas para não reaplicar custo
UPDATE public.purchases
SET cost_posted = TRUE
WHERE status = 'confirmed'
  AND COALESCE(cost_posted, FALSE) = FALSE
  AND COALESCE(stock_posted, FALSE) = TRUE;

ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS net_unit_cost NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS cost_before NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS cost_after NUMERIC(14, 4);

-- ============================================
-- Helper: custo médio ponderado
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_weighted_average_cost(
  p_previous_qty NUMERIC,
  p_previous_cost NUMERIC,
  p_incoming_qty NUMERIC,
  p_net_unit_cost NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_prev_qty NUMERIC(14, 3);
  v_in_qty NUMERIC(14, 3);
  v_new_qty NUMERIC(14, 3);
  v_prev_cost NUMERIC(14, 4);
  v_net_cost NUMERIC(14, 4);
BEGIN
  v_prev_qty := COALESCE(p_previous_qty, 0);
  v_in_qty := COALESCE(p_incoming_qty, 0);
  v_prev_cost := COALESCE(p_previous_cost, 0);
  v_net_cost := COALESCE(p_net_unit_cost, 0);

  IF v_in_qty <= 0 THEN
    RETURN ROUND(v_prev_cost, 2);
  END IF;

  -- Saldo zero (ou negativo tratado como zero na média): custo = unitário líquido
  IF v_prev_qty <= 0 THEN
    RETURN ROUND(v_net_cost, 2);
  END IF;

  v_new_qty := v_prev_qty + v_in_qty;
  IF v_new_qty <= 0 THEN
    RETURN ROUND(v_net_cost, 2);
  END IF;

  RETURN ROUND(
    ((v_prev_qty * v_prev_cost) + (v_in_qty * v_net_cost)) / v_new_qty,
    2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_weighted_average_cost(NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_weighted_average_cost(NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- ============================================
-- RPC confirm_purchase com custo médio
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

  IF NOT public.is_company_member(v_purchase.company_id) THEN
    RAISE EXCEPTION 'Sem permissão para confirmar esta compra.';
  END IF;

  -- Idempotente: compra já confirmada não reprocessa estoque/custo/financeiro
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
    -- Evita reaplicar custo no mesmo item
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

      -- Valor unitário líquido (desconto do item; sem frete/desconto geral)
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

      -- Atualiza custo médio após registrar a entrada (saldo já refletido pelo trigger)
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

-- cancel_purchase: sem alteração de regra de custo (não recalcula cost_price).
-- Mantém a função atual; apenas documentamos o comportamento esperado.
COMMENT ON FUNCTION public.cancel_purchase(UUID, TEXT) IS
  'Cancela compra confirmada: estorna estoque e cancela financeiro. Não recalcula products.cost_price (v1).';

COMMENT ON FUNCTION public.confirm_purchase(UUID) IS
  'Confirma compra: estoque + custo médio ponderado (tracks_stock) + conta a pagar. Idempotente.';

REVOKE ALL ON FUNCTION public.confirm_purchase(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_purchase(UUID) TO authenticated;
