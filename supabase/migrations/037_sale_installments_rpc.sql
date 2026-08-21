-- TR Control ERP — 037_sale_installments_rpc
-- Fase 2.1: materialização de parcelamento em confirm_sale / cancel_sale.
-- Pré-requisito: 029 (RPCs sales), 036 (schema parcelamento).
-- Idempotente via CREATE OR REPLACE FUNCTION.
-- NÃO altera schema de tabelas (sem novas colunas/índices/tabelas).

-- ============================================
-- confirm_sale — à vista (1 título) ou parcelado (N títulos)
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
  v_schedule public.sale_payment_schedules%ROWTYPE;
  v_movement_id UUID;
  v_entry_id UUID;
  v_first_entry_id UUID;
  v_item_count INTEGER;
  v_existing_movements INTEGER;
  v_existing_entries INTEGER;
  v_description TEXT;
  v_should_track BOOLEAN;
  v_payment_condition TEXT;
  v_schedule_count INTEGER;
  v_distinct_numbers INTEGER;
  v_distinct_counts INTEGER;
  v_min_number INTEGER;
  v_max_number INTEGER;
  v_installment_count INTEGER;
  v_schedules_sum NUMERIC(14, 2);
  v_null_due_dates INTEGER;
  v_negative_amounts INTEGER;
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

  -- Anti-duplicidade financeira: zero títulos antes de qualquer materialização.
  SELECT COUNT(*) INTO v_existing_entries
  FROM public.financial_entries
  WHERE company_id = v_sale.company_id
    AND source_type = 'sale'
    AND source_id = v_sale.id;

  IF v_existing_entries > 0 THEN
    RAISE EXCEPTION 'Já existe lançamento financeiro para esta venda.';
  END IF;

  v_payment_condition := COALESCE(NULLIF(btrim(v_sale.payment_condition), ''), 'cash');

  -- Validações de parcelamento ANTES do estoque (falha => rollback total, sem movimento).
  IF v_payment_condition = 'installment' THEN
    SELECT
      COUNT(*)::INTEGER,
      COUNT(DISTINCT installment_number)::INTEGER,
      COUNT(DISTINCT installment_count)::INTEGER,
      MIN(installment_number),
      MAX(installment_number),
      MAX(installment_count),
      COALESCE(ROUND(SUM(amount), 2), 0),
      COUNT(*) FILTER (WHERE due_date IS NULL)::INTEGER,
      COUNT(*) FILTER (WHERE amount < 0)::INTEGER
    INTO
      v_schedule_count,
      v_distinct_numbers,
      v_distinct_counts,
      v_min_number,
      v_max_number,
      v_installment_count,
      v_schedules_sum,
      v_null_due_dates,
      v_negative_amounts
    FROM public.sale_payment_schedules
    WHERE sale_id = v_sale.id
      AND company_id = v_sale.company_id;

    IF v_schedule_count IS NULL OR v_schedule_count = 0 THEN
      RAISE EXCEPTION
        'Venda parcelada exige plano de pagamento (sale_payment_schedules).';
    END IF;

    IF v_schedule_count < 2 THEN
      RAISE EXCEPTION
        'Venda parcelada exige no mínimo 2 parcelas. Encontradas: %.',
        v_schedule_count;
    END IF;

    IF v_null_due_dates > 0 THEN
      RAISE EXCEPTION 'Todas as parcelas devem possuir data de vencimento.';
    END IF;

    IF v_negative_amounts > 0 THEN
      RAISE EXCEPTION 'Nenhuma parcela pode ter valor negativo.';
    END IF;

    IF v_distinct_counts IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION
        'Todas as parcelas devem informar o mesmo installment_count.';
    END IF;

    IF v_installment_count IS DISTINCT FROM v_schedule_count THEN
      RAISE EXCEPTION
        'installment_count (%) deve ser igual à quantidade de parcelas (%).',
        v_installment_count,
        v_schedule_count;
    END IF;

    IF v_min_number IS DISTINCT FROM 1
      OR v_max_number IS DISTINCT FROM v_schedule_count
      OR v_distinct_numbers IS DISTINCT FROM v_schedule_count
    THEN
      RAISE EXCEPTION
        'Os números das parcelas devem formar a sequência contínua 1..%.',
        v_schedule_count;
    END IF;

    IF v_schedules_sum IS DISTINCT FROM ROUND(COALESCE(v_sale.total_amount, 0), 2) THEN
      RAISE EXCEPTION
        'A soma das parcelas (%) deve ser exatamente igual ao total da venda (%).',
        v_schedules_sum,
        ROUND(COALESCE(v_sale.total_amount, 0), 2);
    END IF;
  ELSIF v_payment_condition IS DISTINCT FROM 'cash' THEN
    RAISE EXCEPTION
      'Condição de pagamento inválida: %. Use cash ou installment.',
      v_payment_condition;
  END IF;

  -- Precheck de estoque
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

  -- Postagem de estoque (inalterada em relação à 029)
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

  v_first_entry_id := NULL;

  IF v_payment_condition = 'installment' THEN
    -- N títulos a partir do plano (sem título integral do total).
    FOR v_schedule IN
      SELECT *
      FROM public.sale_payment_schedules
      WHERE sale_id = v_sale.id
        AND company_id = v_sale.company_id
      ORDER BY installment_number
    LOOP
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
        source_id,
        installment_number,
        installment_count
      )
      VALUES (
        v_sale.company_id,
        v_sale.customer_id,
        'receivable',
        CONCAT(
          v_description,
          ' — Parcela ',
          v_schedule.installment_number,
          '/',
          v_schedule.installment_count
        ),
        'Vendas',
        COALESCE(v_customer.trade_name, v_customer.full_name),
        v_schedule.amount,
        v_sale.sale_date,
        v_schedule.due_date,
        'pending',
        COALESCE(v_schedule.payment_method, v_sale.payment_method),
        v_sale.document_number,
        v_sale.notes,
        FALSE,
        'sale',
        v_sale.id,
        v_schedule.installment_number,
        v_schedule.installment_count
      )
      RETURNING id INTO v_entry_id;

      IF v_schedule.installment_number = 1 THEN
        v_first_entry_id := v_entry_id;
      END IF;
    END LOOP;

    IF v_first_entry_id IS NULL THEN
      RAISE EXCEPTION
        'Falha ao materializar a parcela 1 da venda parcelada.';
    END IF;
  ELSE
    -- À vista / legado: exatamente 1 título; installment_* permanece NULL.
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
      source_id,
      installment_number,
      installment_count
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
      v_sale.id,
      NULL,
      NULL
    )
    RETURNING id INTO v_first_entry_id;
  END IF;

  UPDATE public.sales
  SET
    status = 'confirmed',
    stock_posted = TRUE,
    finance_posted = TRUE,
    financial_entry_id = v_first_entry_id,
    confirmed_at = NOW(),
    confirmed_by = auth.uid(),
    due_date = COALESCE(due_date, sale_date)
  WHERE id = v_sale.id
  RETURNING * INTO v_sale;

  RETURN v_sale;
END;
$$;

COMMENT ON FUNCTION public.confirm_sale(UUID) IS
  'Confirma venda: estoque + CR. cash=1 título; installment=N títulos a partir de sale_payment_schedules. Authz: sales.edit + plano.';

-- ============================================
-- cancel_sale — bloqueia se QUALQUER título paid/received
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
  v_item public.sale_items%ROWTYPE;
  v_settled_count INTEGER;
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

  -- Qualquer parcela/título já baixado bloqueia o cancelamento inteiro (sem efeito parcial).
  SELECT COUNT(*) INTO v_settled_count
  FROM public.financial_entries
  WHERE company_id = v_sale.company_id
    AND (
      id = v_sale.financial_entry_id
      OR (source_type = 'sale' AND source_id = v_sale.id)
    )
    AND status IN ('paid', 'received');

  IF v_settled_count > 0 THEN
    RAISE EXCEPTION
      'Não é possível cancelar esta venda porque um ou mais lançamentos financeiros relacionados já estão pagos ou recebidos. Desfaça ou estorne o recebimento no módulo Financeiro antes de cancelar a venda.';
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
  'Cancela venda: bloqueia se qualquer título paid/received; senão estorna estoque e soft-cancela todos os títulos da origem. Authz: sales.edit + plano.';

REVOKE ALL ON FUNCTION public.confirm_sale(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_sale(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_sale(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID, TEXT) TO authenticated;
