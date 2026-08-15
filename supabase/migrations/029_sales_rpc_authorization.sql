-- TR Control ERP — Autorização nas RPCs de Sales (Fase 2A)
-- Migration: 029_sales_rpc_authorization
--
-- Endurece confirm_sale / cancel_sale / recalculate_sale_totals:
--   plan entitlement ∩ membership ativa ∩ member_permissions
--   (Owner / access_profile administrator = full dentro do plano).
--
-- NÃO altera lógica funcional (estoque, financeiro, status, validações).
-- NÃO altera dados.
--
-- Espelha src/lib/plans/entitlements.ts + permissionAllowsAction (app).
-- Manter sincronizado se a matriz de planos mudar.

-- ============================================
-- Helpers de autorização (reutilizáveis)
-- ============================================

CREATE OR REPLACE FUNCTION public.plan_includes_module(
  p_plan TEXT,
  p_module TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT := lower(btrim(COALESCE(p_plan, 'essential')));
  v_module TEXT := btrim(COALESCE(p_module, ''));
BEGIN
  IF v_module = '' THEN
    RETURN FALSE;
  END IF;

  IF v_plan NOT IN ('essential', 'professional', 'premium') THEN
    v_plan := 'essential';
  END IF;

  -- essential
  IF v_module IN (
    'dashboard', 'customers', 'products', 'sales', 'finance',
    'cash_flow', 'tasks', 'reports', 'settings'
  ) THEN
    RETURN TRUE;
  END IF;

  -- professional+
  IF v_plan IN ('professional', 'premium')
    AND v_module IN (
      'suppliers', 'stock', 'purchases', 'agenda', 'users'
    )
  THEN
    RETURN TRUE;
  END IF;

  -- premium
  IF v_plan = 'premium' AND v_module = 'funnel' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.plan_includes_module(TEXT, TEXT) IS
  'Entitlement comercial: companies.plan inclui o módulo? Espelha PLAN_MODULE_ENTITLEMENTS v1.';

-- Verifica permissão efetiva do auth.uid() na empresa.
-- p_action: view | create | edit | delete | export
-- recalculate_sale_totals: exige create OU edit (sem mudar assinatura).
CREATE OR REPLACE FUNCTION public.member_has_module_permission(
  p_company_id UUID,
  p_module TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_access_profile TEXT;
  v_status TEXT;
  v_plan TEXT;
  v_membership_id UUID;
  v_action TEXT := lower(btrim(COALESCE(p_action, '')));
  v_module TEXT := btrim(COALESCE(p_module, ''));
  v_can_view BOOLEAN;
  v_can_create BOOLEAN;
  v_can_edit BOOLEAN;
  v_can_delete BOOLEAN;
  v_can_export BOOLEAN;
BEGIN
  IF v_uid IS NULL OR p_company_id IS NULL OR v_module = '' THEN
    RETURN FALSE;
  END IF;

  IF v_action NOT IN ('view', 'create', 'edit', 'delete', 'export') THEN
    RETURN FALSE;
  END IF;

  SELECT
    cm.id,
    cm.role::text,
    cm.access_profile::text,
    cm.status::text,
    c.plan::text
  INTO
    v_membership_id,
    v_role,
    v_access_profile,
    v_status,
    v_plan
  FROM public.company_members cm
  INNER JOIN public.companies c ON c.id = cm.company_id
  WHERE cm.company_id = p_company_id
    AND cm.user_id = v_uid
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF COALESCE(v_status, 'active') = 'inactive' THEN
    RETURN FALSE;
  END IF;

  IF NOT public.plan_includes_module(v_plan, v_module) THEN
    RETURN FALSE;
  END IF;

  -- Owner ou perfil administrator: full dentro do plano (não bypassa plano)
  IF v_role = 'owner' OR v_access_profile = 'administrator' THEN
    RETURN TRUE;
  END IF;

  SELECT
    mp.can_view,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    mp.can_export
  INTO
    v_can_view,
    v_can_create,
    v_can_edit,
    v_can_delete,
    v_can_export
  FROM public.member_permissions mp
  WHERE mp.company_id = p_company_id
    AND mp.membership_id = v_membership_id
    AND mp.module = v_module
  LIMIT 1;

  IF NOT FOUND OR COALESCE(v_can_view, FALSE) IS NOT TRUE THEN
    RETURN FALSE;
  END IF;

  CASE v_action
    WHEN 'view' THEN RETURN TRUE;
    WHEN 'create' THEN RETURN COALESCE(v_can_create, FALSE);
    WHEN 'edit' THEN RETURN COALESCE(v_can_edit, FALSE);
    WHEN 'delete' THEN RETURN COALESCE(v_can_delete, FALSE);
    WHEN 'export' THEN RETURN COALESCE(v_can_export, FALSE);
    ELSE RETURN FALSE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.member_has_module_permission(UUID, TEXT, TEXT) IS
  'Authz app-layer no SQL: plan ∩ membership ativa ∩ member_permissions (owner/admin full no plano).';

REVOKE ALL ON FUNCTION public.plan_includes_module(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.member_has_module_permission(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plan_includes_module(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_has_module_permission(UUID, TEXT, TEXT) TO authenticated;

-- ============================================
-- recalculate_sale_totals — membership + create|edit
-- ============================================
-- Decisão: exige create OU edit (draft create e update). Sem nova assinatura.

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
  'Recalcula totais da venda. Authz: sales.create OU sales.edit + plano.';

-- ============================================
-- confirm_sale — exige sales.edit (+ plano)
-- ============================================

CREATE OR REPLACE FUNCTION public.confirm_sale(p_sale_id UUID)
RETURNS public.sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_item public.sale_items%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_movement_id UUID;
  v_entry_id UUID;
  v_item_count INTEGER;
  v_existing_movements INTEGER;
  v_existing_entries INTEGER;
  v_description TEXT;
  v_should_track BOOLEAN;
BEGIN
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada.';
  END IF;

  IF NOT public.member_has_module_permission(v_sale.company_id, 'sales', 'edit') THEN
    RAISE EXCEPTION 'Sem permissão para confirmar esta venda.';
  END IF;

  IF v_sale.status = 'confirmed' THEN
    RETURN v_sale;
  END IF;

  IF v_sale.status = 'cancelled' THEN
    RAISE EXCEPTION 'Não é possível confirmar uma venda cancelada.';
  END IF;

  IF v_sale.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Somente vendas em rascunho podem ser confirmadas.';
  END IF;

  IF v_sale.customer_id IS NULL THEN
    RAISE EXCEPTION 'Informe o cliente antes de confirmar a venda.';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = v_sale.customer_id
    AND company_id = v_sale.company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente inválido para esta empresa.';
  END IF;

  SELECT COUNT(*) INTO v_item_count
  FROM public.sale_items
  WHERE sale_id = v_sale.id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Não é possível confirmar uma venda sem itens.';
  END IF;

  PERFORM public.recalculate_sale_totals(v_sale.id);

  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF COALESCE(v_sale.stock_posted, FALSE)
    OR COALESCE(v_sale.finance_posted, FALSE)
    OR v_sale.financial_entry_id IS NOT NULL
  THEN
    RAISE EXCEPTION 'Esta venda já possui integração de estoque ou financeiro. Evitando duplicidade.';
  END IF;

  SELECT COUNT(*) INTO v_existing_movements
  FROM public.stock_movements
  WHERE company_id = v_sale.company_id
    AND source_type = 'sale'
    AND source_id = v_sale.id;

  IF v_existing_movements > 0 THEN
    RAISE EXCEPTION 'Já existem movimentações de estoque para esta venda.';
  END IF;

  SELECT COUNT(*) INTO v_existing_entries
  FROM public.financial_entries
  WHERE company_id = v_sale.company_id
    AND source_type = 'sale'
    AND source_id = v_sale.id;

  IF v_existing_entries > 0 THEN
    RAISE EXCEPTION 'Já existe lançamento financeiro para esta venda.';
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.sale_items
    WHERE sale_id = v_sale.id
    ORDER BY sort_order, created_at
  LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
      AND company_id = v_sale.company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto da venda não encontrado.';
    END IF;

    v_should_track := public.sale_item_should_track_stock(
      v_product.product_type,
      v_product.tracks_stock
    );

    IF v_should_track AND COALESCE(v_product.current_stock, 0) < v_item.quantity THEN
      RAISE EXCEPTION
        'Estoque insuficiente para o produto "%" (disponível: %, solicitado: %). A confirmação foi cancelada e nenhuma alteração foi aplicada.',
        v_product.name,
        v_product.current_stock,
        v_item.quantity;
    END IF;
  END LOOP;

  FOR v_item IN
    SELECT *
    FROM public.sale_items
    WHERE sale_id = v_sale.id
    ORDER BY sort_order, created_at
  LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
      AND company_id = v_sale.company_id
    FOR UPDATE;

    v_should_track := public.sale_item_should_track_stock(
      v_product.product_type,
      v_product.tracks_stock
    );

    UPDATE public.sale_items
    SET tracks_stock_snapshot = v_should_track
    WHERE id = v_item.id;

    IF v_should_track THEN
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
        v_sale.company_id,
        v_item.product_id,
        'exit',
        v_item.quantity,
        v_sale.sale_date,
        CONCAT(
          'Saída automática — Venda ',
          COALESCE(NULLIF(btrim(v_sale.document_number), ''), LEFT(v_sale.id::text, 8))
        ),
        auth.uid(),
        'sale',
        v_sale.id
      )
      RETURNING id INTO v_movement_id;

      UPDATE public.sale_items
      SET stock_movement_id = v_movement_id
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  v_description := CONCAT(
    'Venda ',
    COALESCE(NULLIF(btrim(v_sale.document_number), ''), LEFT(v_sale.id::text, 8)),
    ' — ',
    COALESCE(v_customer.trade_name, v_customer.full_name)
  );

  INSERT INTO public.financial_entries (
    company_id,
    customer_id,
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
    v_sale.company_id,
    v_sale.customer_id,
    'receivable',
    v_description,
    'Vendas',
    COALESCE(v_customer.trade_name, v_customer.full_name),
    v_sale.total_amount,
    v_sale.sale_date,
    COALESCE(v_sale.due_date, v_sale.sale_date),
    'pending',
    v_sale.payment_method,
    v_sale.document_number,
    v_sale.notes,
    FALSE,
    'sale',
    v_sale.id
  )
  RETURNING id INTO v_entry_id;

  UPDATE public.sales
  SET
    status = 'confirmed',
    stock_posted = TRUE,
    finance_posted = TRUE,
    financial_entry_id = v_entry_id,
    confirmed_at = NOW(),
    confirmed_by = auth.uid(),
    due_date = COALESCE(due_date, sale_date)
  WHERE id = v_sale.id
  RETURNING * INTO v_sale;

  RETURN v_sale;
END;
$$;

COMMENT ON FUNCTION public.confirm_sale(UUID) IS
  'Confirma venda: estoque + CR. Authz: sales.edit + plano. Não exige finance/stock perms.';

-- ============================================
-- cancel_sale — exige sales.edit (+ plano)
-- ============================================

CREATE OR REPLACE FUNCTION public.cancel_sale(
  p_sale_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_entry public.financial_entries%ROWTYPE;
  v_item public.sale_items%ROWTYPE;
BEGIN
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada.';
  END IF;

  IF NOT public.member_has_module_permission(v_sale.company_id, 'sales', 'edit') THEN
    RAISE EXCEPTION 'Sem permissão para cancelar esta venda.';
  END IF;

  IF v_sale.status = 'cancelled' THEN
    RETURN v_sale;
  END IF;

  IF v_sale.status = 'draft' THEN
    UPDATE public.sales
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = auth.uid(),
      cancelled_reason = NULLIF(btrim(p_reason), '')
    WHERE id = v_sale.id
    RETURNING * INTO v_sale;

    RETURN v_sale;
  END IF;

  IF v_sale.status IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'Somente vendas confirmadas ou em rascunho podem ser canceladas.';
  END IF;

  IF v_sale.financial_entry_id IS NOT NULL THEN
    SELECT * INTO v_entry
    FROM public.financial_entries
    WHERE id = v_sale.financial_entry_id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_entry
    FROM public.financial_entries
    WHERE company_id = v_sale.company_id
      AND source_type = 'sale'
      AND source_id = v_sale.id
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF FOUND AND v_entry.status IN ('paid', 'received') THEN
    RAISE EXCEPTION
      'Não é possível cancelar esta venda porque o lançamento financeiro relacionado já está pago ou recebido. Desfaça ou estorne o recebimento no módulo Financeiro antes de cancelar a venda.';
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.sale_items
    WHERE sale_id = v_sale.id
      AND stock_movement_id IS NOT NULL
  LOOP
    DELETE FROM public.stock_movements
    WHERE id = v_item.stock_movement_id
      AND company_id = v_sale.company_id;

    UPDATE public.sale_items
    SET stock_movement_id = NULL
    WHERE id = v_item.id;
  END LOOP;

  DELETE FROM public.stock_movements
  WHERE company_id = v_sale.company_id
    AND source_type = 'sale'
    AND source_id = v_sale.id;

  UPDATE public.financial_entries
  SET status = 'cancelled'
  WHERE company_id = v_sale.company_id
    AND (
      id = v_sale.financial_entry_id
      OR (source_type = 'sale' AND source_id = v_sale.id)
    )
    AND status IS DISTINCT FROM 'paid'
    AND status IS DISTINCT FROM 'received';

  UPDATE public.sales
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    cancelled_reason = NULLIF(btrim(p_reason), ''),
    stock_posted = FALSE
  WHERE id = v_sale.id
  RETURNING * INTO v_sale;

  RETURN v_sale;
END;
$$;

COMMENT ON FUNCTION public.cancel_sale(UUID, TEXT) IS
  'Cancela venda: estorna estoque + cancela financeiro. Authz: sales.edit + plano.';

REVOKE ALL ON FUNCTION public.recalculate_sale_totals(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_sale(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_sale(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recalculate_sale_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sale(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID, TEXT) TO authenticated;
