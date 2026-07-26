-- TR Control ERP — Dashboard Executivo (campos aditivos)
-- Migration: 018_executive_dashboard_activities
-- Idempotente. Não altera cálculos/campos existentes da RPC 017.
-- Acrescenta:
--   kpis.tracked_products_count
--   recent_financial_activities

CREATE OR REPLACE FUNCTION public.get_executive_dashboard(
  p_company_id UUID,
  p_period_from DATE,
  p_period_to DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_sales_month_from DATE;
  v_current_balance NUMERIC(14, 2) := 0;
  v_month_inflows NUMERIC(14, 2) := 0;
  v_month_outflows NUMERIC(14, 2) := 0;
  v_open_receivables NUMERIC(14, 2) := 0;
  v_open_payables NUMERIC(14, 2) := 0;
  v_overdue_receivables NUMERIC(14, 2) := 0;
  v_overdue_payables NUMERIC(14, 2) := 0;
  v_confirmed_sales_total NUMERIC(14, 2) := 0;
  v_confirmed_sales_count INTEGER := 0;
  v_confirmed_purchases_total NUMERIC(14, 2) := 0;
  v_confirmed_purchases_count INTEGER := 0;
  v_average_ticket NUMERIC(14, 2) := 0;
  v_stock_value NUMERIC(14, 2) := 0;
  v_low_stock_count INTEGER := 0;
  v_tracked_products_count INTEGER := 0;
  v_cash_flow_series JSONB := '[]'::JSONB;
  v_sales_series JSONB := '[]'::JSONB;
  v_recent_sales JSONB := '[]'::JSONB;
  v_recent_purchases JSONB := '[]'::JSONB;
  v_upcoming_payables JSONB := '[]'::JSONB;
  v_upcoming_receivables JSONB := '[]'::JSONB;
  v_low_stock_products JSONB := '[]'::JSONB;
  v_recent_financial_activities JSONB := '[]'::JSONB;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa é obrigatória.';
  END IF;

  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'Sem permissão para a empresa informada.';
  END IF;

  IF p_period_from IS NULL OR p_period_to IS NULL THEN
    RAISE EXCEPTION 'Período (início e fim) é obrigatório.';
  END IF;

  IF p_period_to < p_period_from THEN
    RAISE EXCEPTION 'Data final do período não pode ser anterior à inicial.';
  END IF;

  v_sales_month_from := (date_trunc('month', p_period_to) - INTERVAL '5 months')::DATE;

  -- 1) Saldo atual: realizado até hoje
  SELECT COALESCE(SUM(cfe.signed_amount), 0)
  INTO v_current_balance
  FROM public.cash_flow_entries cfe
  WHERE cfe.company_id = p_company_id
    AND cfe.flow_mode = 'realized'
    AND cfe.flow_date <= v_today;

  -- 2–4) Entradas / saídas / resultado do período (realizado)
  SELECT
    COALESCE(SUM(cfe.inflow_amount), 0),
    COALESCE(SUM(cfe.outflow_amount), 0)
  INTO v_month_inflows, v_month_outflows
  FROM public.cash_flow_entries cfe
  WHERE cfe.company_id = p_company_id
    AND cfe.flow_mode = 'realized'
    AND cfe.flow_date BETWEEN p_period_from AND p_period_to;

  -- 5–6) Contas em aberto (saldo global, independente do mês)
  SELECT
    COALESCE(SUM(CASE WHEN cfe.entry_type = 'receivable' THEN cfe.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cfe.entry_type = 'payable' THEN cfe.amount ELSE 0 END), 0)
  INTO v_open_receivables, v_open_payables
  FROM public.cash_flow_entries cfe
  WHERE cfe.company_id = p_company_id
    AND cfe.flow_mode = 'projected';

  -- 7) Valores vencidos (globais; display_status = overdue)
  SELECT
    COALESCE(SUM(CASE WHEN cfe.entry_type = 'receivable' THEN cfe.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cfe.entry_type = 'payable' THEN cfe.amount ELSE 0 END), 0)
  INTO v_overdue_receivables, v_overdue_payables
  FROM public.cash_flow_entries cfe
  WHERE cfe.company_id = p_company_id
    AND cfe.flow_mode = 'projected'
    AND public.cash_flow_display_status(
      cfe.status, cfe.due_date, cfe.entry_type, v_today
    ) = 'overdue';

  -- 8–10) Vendas confirmadas no período + ticket médio
  SELECT
    COALESCE(SUM(s.total_amount), 0),
    COALESCE(COUNT(*)::INTEGER, 0)
  INTO v_confirmed_sales_total, v_confirmed_sales_count
  FROM public.sales s
  WHERE s.company_id = p_company_id
    AND s.status = 'confirmed'
    AND s.sale_date BETWEEN p_period_from AND p_period_to;

  IF v_confirmed_sales_count > 0 THEN
    v_average_ticket := ROUND(v_confirmed_sales_total / v_confirmed_sales_count, 2);
  ELSE
    v_average_ticket := 0;
  END IF;

  -- 9) Compras confirmadas no período
  SELECT
    COALESCE(SUM(p.total_amount), 0),
    COALESCE(COUNT(*)::INTEGER, 0)
  INTO v_confirmed_purchases_total, v_confirmed_purchases_count
  FROM public.purchases p
  WHERE p.company_id = p_company_id
    AND p.status = 'confirmed'
    AND p.purchase_date BETWEEN p_period_from AND p_period_to;

  -- 11) Valor total do estoque (itens com controle)
  SELECT COALESCE(SUM(pr.current_stock * pr.cost_price), 0)
  INTO v_stock_value
  FROM public.products pr
  WHERE pr.company_id = p_company_id
    AND pr.tracks_stock = TRUE;

  -- 12) Abaixo do mínimo (somente ativos com controle)
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  INTO v_low_stock_count
  FROM public.products pr
  WHERE pr.company_id = p_company_id
    AND pr.tracks_stock = TRUE
    AND pr.status = 'active'
    AND pr.current_stock < pr.min_stock;

  -- 12b) Produtos ativos com controle de estoque (aditivo)
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  INTO v_tracked_products_count
  FROM public.products pr
  WHERE pr.company_id = p_company_id
    AND pr.tracks_stock = TRUE
    AND pr.status = 'active';

  -- 17) Série diária de entradas/saídas realizadas no período
  WITH bounds AS (
    SELECT p_period_from AS d_from, p_period_to AS d_to
  ),
  days AS (
    SELECT gs.day::DATE AS bucket_date
    FROM bounds b
    CROSS JOIN LATERAL generate_series(b.d_from, b.d_to, INTERVAL '1 day') AS gs(day)
  ),
  realized AS (
    SELECT
      cfe.flow_date AS bucket_date,
      COALESCE(SUM(cfe.inflow_amount), 0) AS inflows,
      COALESCE(SUM(cfe.outflow_amount), 0) AS outflows
    FROM public.cash_flow_entries cfe
    WHERE cfe.company_id = p_company_id
      AND cfe.flow_mode = 'realized'
      AND cfe.flow_date BETWEEN p_period_from AND p_period_to
    GROUP BY cfe.flow_date
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'bucket', to_char(d.bucket_date, 'YYYY-MM-DD'),
        'inflows', COALESCE(r.inflows, 0),
        'outflows', COALESCE(r.outflows, 0)
      )
      ORDER BY d.bucket_date
    ),
    '[]'::JSONB
  )
  INTO v_cash_flow_series
  FROM days d
  LEFT JOIN realized r ON r.bucket_date = d.bucket_date;

  -- 18) Evolução mensal de vendas (últimos 6 meses até o mês de p_period_to)
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', v_sales_month_from::TIMESTAMP),
      date_trunc('month', p_period_to::TIMESTAMP),
      INTERVAL '1 month'
    )::DATE AS bucket_date
  ),
  sales_by_month AS (
    SELECT
      date_trunc('month', s.sale_date)::DATE AS bucket_date,
      COALESCE(SUM(s.total_amount), 0) AS total,
      COUNT(*)::INTEGER AS sale_count
    FROM public.sales s
    WHERE s.company_id = p_company_id
      AND s.status = 'confirmed'
      AND s.sale_date >= v_sales_month_from
      AND s.sale_date <= p_period_to
    GROUP BY 1
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'bucket', to_char(m.bucket_date, 'YYYY-MM-DD'),
        'total', COALESCE(s.total, 0),
        'count', COALESCE(s.sale_count, 0)
      )
      ORDER BY m.bucket_date
    ),
    '[]'::JSONB
  )
  INTO v_sales_series
  FROM months m
  LEFT JOIN sales_by_month s ON s.bucket_date = m.bucket_date;

  -- 13) Últimas vendas confirmadas
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sort_sale_date DESC, sort_created_at DESC),
    '[]'::JSONB
  )
  INTO v_recent_sales
  FROM (
    SELECT
      jsonb_build_object(
        'id', s.id,
        'sale_date', to_char(s.sale_date, 'YYYY-MM-DD'),
        'total_amount', s.total_amount,
        'document_number', s.document_number,
        'party_name', COALESCE(
          NULLIF(TRIM(c.trade_name), ''),
          NULLIF(TRIM(c.full_name), ''),
          'Cliente'
        )
      ) AS row_data,
      s.sale_date AS sort_sale_date,
      s.created_at AS sort_created_at
    FROM public.sales s
    LEFT JOIN public.customers c ON c.id = s.customer_id
    WHERE s.company_id = p_company_id
      AND s.status = 'confirmed'
    ORDER BY s.sale_date DESC, s.created_at DESC
    LIMIT 5
  ) recent_sales;

  -- 14) Últimas compras confirmadas
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sort_purchase_date DESC, sort_created_at DESC),
    '[]'::JSONB
  )
  INTO v_recent_purchases
  FROM (
    SELECT
      jsonb_build_object(
        'id', p.id,
        'purchase_date', to_char(p.purchase_date, 'YYYY-MM-DD'),
        'total_amount', p.total_amount,
        'document_number', p.document_number,
        'party_name', COALESCE(
          NULLIF(TRIM(sup.trade_name), ''),
          NULLIF(TRIM(sup.full_name), ''),
          'Fornecedor'
        )
      ) AS row_data,
      p.purchase_date AS sort_purchase_date,
      p.created_at AS sort_created_at
    FROM public.purchases p
    LEFT JOIN public.suppliers sup ON sup.id = p.supplier_id
    WHERE p.company_id = p_company_id
      AND p.status = 'confirmed'
    ORDER BY p.purchase_date DESC, p.created_at DESC
    LIMIT 5
  ) recent_purchases;

  -- 15) Próximas contas a pagar (somente vencimentos futuros)
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sort_due_date ASC, sort_created_at ASC),
    '[]'::JSONB
  )
  INTO v_upcoming_payables
  FROM (
    SELECT
      jsonb_build_object(
        'id', cfe.id,
        'due_date', to_char(cfe.due_date, 'YYYY-MM-DD'),
        'amount', cfe.amount,
        'description', cfe.description,
        'party_name', cfe.party_name,
        'status', public.cash_flow_display_status(
          cfe.status, cfe.due_date, cfe.entry_type, v_today
        )
      ) AS row_data,
      cfe.due_date AS sort_due_date,
      cfe.created_at AS sort_created_at
    FROM public.cash_flow_entries cfe
    WHERE cfe.company_id = p_company_id
      AND cfe.flow_mode = 'projected'
      AND cfe.entry_type = 'payable'
      AND cfe.due_date >= v_today
    ORDER BY cfe.due_date ASC, cfe.created_at ASC
    LIMIT 5
  ) upcoming_payables;

  -- 16) Próximas contas a receber (somente vencimentos futuros)
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sort_due_date ASC, sort_created_at ASC),
    '[]'::JSONB
  )
  INTO v_upcoming_receivables
  FROM (
    SELECT
      jsonb_build_object(
        'id', cfe.id,
        'due_date', to_char(cfe.due_date, 'YYYY-MM-DD'),
        'amount', cfe.amount,
        'description', cfe.description,
        'party_name', cfe.party_name,
        'status', public.cash_flow_display_status(
          cfe.status, cfe.due_date, cfe.entry_type, v_today
        )
      ) AS row_data,
      cfe.due_date AS sort_due_date,
      cfe.created_at AS sort_created_at
    FROM public.cash_flow_entries cfe
    WHERE cfe.company_id = p_company_id
      AND cfe.flow_mode = 'projected'
      AND cfe.entry_type = 'receivable'
      AND cfe.due_date >= v_today
    ORDER BY cfe.due_date ASC, cfe.created_at ASC
    LIMIT 5
  ) upcoming_receivables;

  -- Lista de produtos abaixo do mínimo
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sort_gap DESC, sort_name ASC),
    '[]'::JSONB
  )
  INTO v_low_stock_products
  FROM (
    SELECT
      jsonb_build_object(
        'id', pr.id,
        'name', pr.name,
        'sku', pr.sku,
        'unit', pr.unit,
        'current_stock', pr.current_stock,
        'min_stock', pr.min_stock
      ) AS row_data,
      (pr.min_stock - pr.current_stock) AS sort_gap,
      pr.name AS sort_name
    FROM public.products pr
    WHERE pr.company_id = p_company_id
      AND pr.tracks_stock = TRUE
      AND pr.status = 'active'
      AND pr.current_stock < pr.min_stock
    ORDER BY (pr.min_stock - pr.current_stock) DESC, pr.name ASC
    LIMIT 8
  ) low_stock;

  -- 19) Movimentações financeiras recentes da empresa (aditivo)
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sort_date DESC, sort_created_at DESC),
    '[]'::JSONB
  )
  INTO v_recent_financial_activities
  FROM (
    SELECT
      jsonb_build_object(
        'id', cfe.id,
        'type', CASE
          WHEN cfe.entry_type = 'receivable' THEN 'entrada'
          ELSE 'saida'
        END,
        'description', cfe.description,
        'amount', cfe.amount,
        'status', public.cash_flow_display_status(
          cfe.status, cfe.due_date, cfe.entry_type, v_today
        ),
        'date', to_char(cfe.flow_date, 'YYYY-MM-DD'),
        'origin', cfe.origin_key
      ) AS row_data,
      cfe.flow_date AS sort_date,
      cfe.created_at AS sort_created_at
    FROM public.cash_flow_entries cfe
    WHERE cfe.company_id = p_company_id
      AND cfe.flow_mode IN ('realized', 'projected')
      AND cfe.flow_date IS NOT NULL
    ORDER BY cfe.flow_date DESC, cfe.created_at DESC
    LIMIT 8
  ) recent_activities;

  RETURN jsonb_build_object(
    'as_of', to_char(v_today, 'YYYY-MM-DD'),
    'period_from', to_char(p_period_from, 'YYYY-MM-DD'),
    'period_to', to_char(p_period_to, 'YYYY-MM-DD'),
    'kpis', jsonb_build_object(
      'current_balance', v_current_balance,
      'month_inflows', v_month_inflows,
      'month_outflows', v_month_outflows,
      'month_result', v_month_inflows - v_month_outflows,
      'open_receivables', v_open_receivables,
      'open_payables', v_open_payables,
      'overdue_total', v_overdue_receivables + v_overdue_payables,
      'overdue_receivables', v_overdue_receivables,
      'overdue_payables', v_overdue_payables,
      'confirmed_sales_total', v_confirmed_sales_total,
      'confirmed_sales_count', v_confirmed_sales_count,
      'confirmed_purchases_total', v_confirmed_purchases_total,
      'confirmed_purchases_count', v_confirmed_purchases_count,
      'average_ticket', v_average_ticket,
      'stock_value', v_stock_value,
      'low_stock_count', v_low_stock_count,
      'tracked_products_count', v_tracked_products_count
    ),
    'cash_flow_series', v_cash_flow_series,
    'sales_series', v_sales_series,
    'recent_sales', v_recent_sales,
    'recent_purchases', v_recent_purchases,
    'upcoming_payables', v_upcoming_payables,
    'upcoming_receivables', v_upcoming_receivables,
    'low_stock_products', v_low_stock_products,
    'recent_financial_activities', v_recent_financial_activities
  );
END;
$$;

COMMENT ON FUNCTION public.get_executive_dashboard(UUID, DATE, DATE) IS
  'Dashboard Executivo: KPIs, séries, listas, atividades financeiras e alertas da empresa ativa.';

REVOKE ALL ON FUNCTION public.get_executive_dashboard(UUID, DATE, DATE) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_executive_dashboard(UUID, DATE, DATE) TO authenticated;
