-- TR Control ERP — Módulo Fluxo de Caixa (visão consolidada)
-- Migration: 016_cash_flow_module
-- Idempotente. Não cria ledger paralelo: lê financial_entries.
-- Preparado para futuras contas bancárias / conciliação.

-- ---------------------------------------------------------------------------
-- 1) Colunas reservadas (contas bancárias / conciliação — sem FK nesta versão)
-- ---------------------------------------------------------------------------
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS bank_account_id UUID,
  ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.financial_entries.bank_account_id IS
  'Reserva para futuras contas bancárias. FK será adicionada com bank_accounts.';
COMMENT ON COLUMN public.financial_entries.is_reconciled IS
  'Reserva para conciliação bancária futura.';
COMMENT ON COLUMN public.financial_entries.reconciled_at IS
  'Data/hora da conciliação bancária (futuro).';

-- ---------------------------------------------------------------------------
-- 2) Índices para fluxo realizado / projetado
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_financial_entries_company_payment_date
  ON public.financial_entries (company_id, payment_date)
  WHERE status IN ('paid', 'received');

CREATE INDEX IF NOT EXISTS idx_financial_entries_company_due_open
  ON public.financial_entries (company_id, due_date)
  WHERE status IN ('pending', 'overdue');

CREATE INDEX IF NOT EXISTS idx_financial_entries_company_category
  ON public.financial_entries (company_id, category);

CREATE INDEX IF NOT EXISTS idx_financial_entries_company_payment_method
  ON public.financial_entries (company_id, payment_method);

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cash_flow_origin_key(p_source_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_source_type = 'sale' THEN 'sale'
    WHEN p_source_type = 'purchase' THEN 'purchase'
    WHEN p_source_type IS NULL OR p_source_type = '' OR p_source_type = 'manual'
      THEN 'manual'
    ELSE 'other'
  END;
$$;

CREATE OR REPLACE FUNCTION public.cash_flow_is_realized(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('paid', 'received');
$$;

CREATE OR REPLACE FUNCTION public.cash_flow_is_projected(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('pending', 'overdue');
$$;

CREATE OR REPLACE FUNCTION public.cash_flow_realized_date(
  p_payment_date DATE,
  p_due_date DATE,
  p_issue_date DATE
)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_payment_date, p_due_date, p_issue_date);
$$;

CREATE OR REPLACE FUNCTION public.cash_flow_signed_amount(
  p_entry_type TEXT,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_entry_type = 'receivable' THEN COALESCE(p_amount, 0)
    WHEN p_entry_type = 'payable' THEN -COALESCE(p_amount, 0)
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.cash_flow_display_status(
  p_status TEXT,
  p_due_date DATE,
  p_entry_type TEXT,
  p_today DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_status = 'cancelled' THEN 'cancelled'
    WHEN public.cash_flow_is_realized(p_status) THEN
      CASE
        WHEN p_entry_type = 'receivable' THEN 'received'
        WHEN p_entry_type = 'payable' THEN 'paid'
        ELSE p_status
      END
    WHEN p_status IN ('pending', 'overdue') THEN
      CASE
        WHEN p_due_date < p_today THEN 'overdue'
        ELSE 'pending'
      END
    ELSE p_status
  END;
$$;

-- ---------------------------------------------------------------------------
-- 4) View base (security_invoker = RLS da tabela)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.cash_flow_entries
WITH (security_invoker = true)
AS
SELECT
  fe.id,
  fe.company_id,
  fe.customer_id,
  fe.supplier_id,
  fe.entry_type,
  fe.description,
  fe.category,
  fe.party_name,
  fe.amount,
  fe.issue_date,
  fe.due_date,
  fe.payment_date,
  fe.status,
  fe.payment_method,
  fe.document_number,
  fe.notes,
  fe.source_type,
  fe.source_id,
  fe.bank_account_id,
  fe.is_reconciled,
  fe.reconciled_at,
  fe.created_at,
  fe.updated_at,
  CASE
    WHEN public.cash_flow_is_realized(fe.status) THEN 'realized'
    WHEN public.cash_flow_is_projected(fe.status) THEN 'projected'
    ELSE 'excluded'
  END AS flow_mode,
  CASE
    WHEN public.cash_flow_is_realized(fe.status) THEN
      public.cash_flow_realized_date(fe.payment_date, fe.due_date, fe.issue_date)
    WHEN public.cash_flow_is_projected(fe.status) THEN fe.due_date
    ELSE NULL
  END AS flow_date,
  CASE
    WHEN public.cash_flow_is_realized(fe.status) AND fe.payment_date IS NULL
      THEN TRUE
    ELSE FALSE
  END AS date_is_estimated,
  CASE
    WHEN fe.entry_type = 'receivable' THEN fe.amount
    ELSE 0::NUMERIC
  END AS inflow_amount,
  CASE
    WHEN fe.entry_type = 'payable' THEN fe.amount
    ELSE 0::NUMERIC
  END AS outflow_amount,
  public.cash_flow_signed_amount(fe.entry_type, fe.amount) AS signed_amount,
  public.cash_flow_origin_key(fe.source_type) AS origin_key
FROM public.financial_entries fe
WHERE fe.status IS DISTINCT FROM 'cancelled';

COMMENT ON VIEW public.cash_flow_entries IS
  'Base do Fluxo de Caixa. Cancelados excluídos. Uma linha = um financial_entry (sem duplicar venda/compra).';

GRANT SELECT ON public.cash_flow_entries TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) RPC consolidada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cash_flow_dashboard(
  p_company_id UUID,
  p_period_from DATE,
  p_period_to DATE,
  p_mode TEXT DEFAULT 'realized',
  p_direction TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_grain TEXT DEFAULT 'day'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_mode TEXT := LOWER(COALESCE(NULLIF(TRIM(p_mode), ''), 'realized'));
  v_grain TEXT := LOWER(COALESCE(NULLIF(TRIM(p_grain), ''), 'day'));
  v_direction TEXT := LOWER(NULLIF(TRIM(p_direction), ''));
  v_status TEXT := LOWER(NULLIF(TRIM(p_status), ''));
  v_origin TEXT := LOWER(NULLIF(TRIM(p_origin), ''));
  v_category TEXT := NULLIF(TRIM(p_category), '');
  v_payment_method TEXT := NULLIF(TRIM(p_payment_method), '');
  v_current_balance NUMERIC(14, 2) := 0;
  v_realized_inflows NUMERIC(14, 2) := 0;
  v_realized_outflows NUMERIC(14, 2) := 0;
  v_open_receivables NUMERIC(14, 2) := 0;
  v_open_payables NUMERIC(14, 2) := 0;
  v_realized_opening NUMERIC(14, 2) := 0;
  v_projected_opening NUMERIC(14, 2) := 0;
  v_series JSONB := '[]'::JSONB;
  v_movements JSONB := '[]'::JSONB;
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

  IF v_mode NOT IN ('realized', 'projected') THEN
    RAISE EXCEPTION 'Modo inválido. Use realized ou projected.';
  END IF;

  IF v_grain NOT IN ('day', 'week', 'month') THEN
    RAISE EXCEPTION 'Granularidade inválida. Use day, week ou month.';
  END IF;

  IF v_direction IS NOT NULL AND v_direction NOT IN ('inflow', 'outflow', 'all') THEN
    RAISE EXCEPTION 'Direção inválida.';
  END IF;

  IF v_direction = 'all' THEN
    v_direction := NULL;
  END IF;

  IF v_origin IS NOT NULL AND v_origin NOT IN ('sale', 'purchase', 'manual', 'other', 'all') THEN
    RAISE EXCEPTION 'Origem inválida.';
  END IF;

  IF v_origin = 'all' THEN
    v_origin := NULL;
  END IF;

  IF v_status = 'all' THEN
    v_status := NULL;
  END IF;

  -- Saldo atual: global realizado até hoje (sem filtros de período/lista)
  SELECT COALESCE(SUM(cfe.signed_amount), 0)
  INTO v_current_balance
  FROM public.cash_flow_entries cfe
  WHERE cfe.company_id = p_company_id
    AND cfe.flow_mode = 'realized'
    AND cfe.flow_date <= v_today;

  v_projected_opening := v_current_balance;

  -- Abertura do realizado no período (saldo antes do período, com filtros auxiliares)
  SELECT COALESCE(SUM(cfe.signed_amount), 0)
  INTO v_realized_opening
  FROM public.cash_flow_entries cfe
  WHERE cfe.company_id = p_company_id
    AND cfe.flow_mode = 'realized'
    AND cfe.flow_date < p_period_from
    AND (v_direction IS NULL
      OR (v_direction = 'inflow' AND cfe.entry_type = 'receivable')
      OR (v_direction = 'outflow' AND cfe.entry_type = 'payable'))
    AND (v_category IS NULL OR cfe.category = v_category)
    AND (v_payment_method IS NULL OR cfe.payment_method = v_payment_method)
    AND (v_origin IS NULL OR cfe.origin_key = v_origin)
    AND (
      v_status IS NULL
      OR public.cash_flow_display_status(
        cfe.status, cfe.due_date, cfe.entry_type, v_today
      ) = v_status
    );

  -- KPIs do período (realizado)
  SELECT
    COALESCE(SUM(cfe.inflow_amount), 0),
    COALESCE(SUM(cfe.outflow_amount), 0)
  INTO v_realized_inflows, v_realized_outflows
  FROM public.cash_flow_entries cfe
  WHERE cfe.company_id = p_company_id
    AND cfe.flow_mode = 'realized'
    AND cfe.flow_date BETWEEN p_period_from AND p_period_to
    AND (v_direction IS NULL
      OR (v_direction = 'inflow' AND cfe.entry_type = 'receivable')
      OR (v_direction = 'outflow' AND cfe.entry_type = 'payable'))
    AND (v_category IS NULL OR cfe.category = v_category)
    AND (v_payment_method IS NULL OR cfe.payment_method = v_payment_method)
    AND (v_origin IS NULL OR cfe.origin_key = v_origin)
    AND (
      v_status IS NULL
      OR public.cash_flow_display_status(
        cfe.status, cfe.due_date, cfe.entry_type, v_today
      ) = v_status
    );

  -- Contas em aberto no período (por vencimento)
  SELECT
    COALESCE(SUM(CASE WHEN cfe.entry_type = 'receivable' THEN cfe.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cfe.entry_type = 'payable' THEN cfe.amount ELSE 0 END), 0)
  INTO v_open_receivables, v_open_payables
  FROM public.cash_flow_entries cfe
  WHERE cfe.company_id = p_company_id
    AND cfe.flow_mode = 'projected'
    AND cfe.flow_date BETWEEN p_period_from AND p_period_to
    AND (v_direction IS NULL
      OR (v_direction = 'inflow' AND cfe.entry_type = 'receivable')
      OR (v_direction = 'outflow' AND cfe.entry_type = 'payable'))
    AND (v_category IS NULL OR cfe.category = v_category)
    AND (v_payment_method IS NULL OR cfe.payment_method = v_payment_method)
    AND (v_origin IS NULL OR cfe.origin_key = v_origin)
    AND (
      v_status IS NULL
      OR public.cash_flow_display_status(
        cfe.status, cfe.due_date, cfe.entry_type, v_today
      ) = v_status
    );

  -- Série temporal (realizado + projetado no mesmo período)
  WITH bounds AS (
    SELECT p_period_from AS d_from, p_period_to AS d_to
  ),
  buckets AS (
    SELECT
      CASE v_grain
        WHEN 'week' THEN date_trunc('week', gs.day)::DATE
        WHEN 'month' THEN date_trunc('month', gs.day)::DATE
        ELSE gs.day
      END AS bucket_date
    FROM bounds b
    CROSS JOIN LATERAL generate_series(b.d_from, b.d_to, INTERVAL '1 day') AS gs(day)
    GROUP BY 1
  ),
  realized_by_bucket AS (
    SELECT
      CASE v_grain
        WHEN 'week' THEN date_trunc('week', cfe.flow_date)::DATE
        WHEN 'month' THEN date_trunc('month', cfe.flow_date)::DATE
        ELSE cfe.flow_date
      END AS bucket_date,
      COALESCE(SUM(cfe.inflow_amount), 0) AS inflows,
      COALESCE(SUM(cfe.outflow_amount), 0) AS outflows,
      COALESCE(SUM(cfe.signed_amount), 0) AS net_amount
    FROM public.cash_flow_entries cfe
    WHERE cfe.company_id = p_company_id
      AND cfe.flow_mode = 'realized'
      AND cfe.flow_date BETWEEN p_period_from AND p_period_to
      AND (v_direction IS NULL
        OR (v_direction = 'inflow' AND cfe.entry_type = 'receivable')
        OR (v_direction = 'outflow' AND cfe.entry_type = 'payable'))
      AND (v_category IS NULL OR cfe.category = v_category)
      AND (v_payment_method IS NULL OR cfe.payment_method = v_payment_method)
      AND (v_origin IS NULL OR cfe.origin_key = v_origin)
      AND (
        v_status IS NULL
        OR public.cash_flow_display_status(
          cfe.status, cfe.due_date, cfe.entry_type, v_today
        ) = v_status
      )
    GROUP BY 1
  ),
  projected_by_bucket AS (
    SELECT
      CASE v_grain
        WHEN 'week' THEN date_trunc('week', cfe.flow_date)::DATE
        WHEN 'month' THEN date_trunc('month', cfe.flow_date)::DATE
        ELSE cfe.flow_date
      END AS bucket_date,
      COALESCE(SUM(cfe.inflow_amount), 0) AS inflows,
      COALESCE(SUM(cfe.outflow_amount), 0) AS outflows,
      COALESCE(SUM(cfe.signed_amount), 0) AS net_amount
    FROM public.cash_flow_entries cfe
    WHERE cfe.company_id = p_company_id
      AND cfe.flow_mode = 'projected'
      AND cfe.flow_date BETWEEN p_period_from AND p_period_to
      AND (v_direction IS NULL
        OR (v_direction = 'inflow' AND cfe.entry_type = 'receivable')
        OR (v_direction = 'outflow' AND cfe.entry_type = 'payable'))
      AND (v_category IS NULL OR cfe.category = v_category)
      AND (v_payment_method IS NULL OR cfe.payment_method = v_payment_method)
      AND (v_origin IS NULL OR cfe.origin_key = v_origin)
      AND (
        v_status IS NULL
        OR public.cash_flow_display_status(
          cfe.status, cfe.due_date, cfe.entry_type, v_today
        ) = v_status
      )
    GROUP BY 1
  ),
  joined AS (
    SELECT
      b.bucket_date,
      COALESCE(r.inflows, 0) AS realized_inflows,
      COALESCE(r.outflows, 0) AS realized_outflows,
      COALESCE(r.net_amount, 0) AS realized_net,
      COALESCE(p.inflows, 0) AS projected_inflows,
      COALESCE(p.outflows, 0) AS projected_outflows,
      COALESCE(p.net_amount, 0) AS projected_net
    FROM buckets b
    LEFT JOIN realized_by_bucket r ON r.bucket_date = b.bucket_date
    LEFT JOIN projected_by_bucket p ON p.bucket_date = b.bucket_date
  ),
  cumulative AS (
    SELECT
      j.*,
      v_realized_opening
        + SUM(j.realized_net) OVER (
          ORDER BY j.bucket_date
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS realized_balance,
      v_projected_opening
        + SUM(j.projected_net) OVER (
          ORDER BY j.bucket_date
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS projected_balance
    FROM joined j
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'bucket', to_char(c.bucket_date, 'YYYY-MM-DD'),
        'realized_inflows', c.realized_inflows,
        'realized_outflows', c.realized_outflows,
        'realized_net', c.realized_net,
        'projected_inflows', c.projected_inflows,
        'projected_outflows', c.projected_outflows,
        'projected_net', c.projected_net,
        'realized_balance', c.realized_balance,
        'projected_balance', c.projected_balance
      )
      ORDER BY c.bucket_date
    ),
    '[]'::JSONB
  )
  INTO v_series
  FROM cumulative c;

  -- Movimentos da aba ativa + saldo acumulado
  IF v_mode = 'realized' THEN
    WITH filtered AS (
      SELECT
        cfe.*,
        public.cash_flow_display_status(
          cfe.status, cfe.due_date, cfe.entry_type, v_today
        ) AS display_status
      FROM public.cash_flow_entries cfe
      WHERE cfe.company_id = p_company_id
        AND cfe.flow_mode = 'realized'
        AND cfe.flow_date BETWEEN p_period_from AND p_period_to
        AND (v_direction IS NULL
          OR (v_direction = 'inflow' AND cfe.entry_type = 'receivable')
          OR (v_direction = 'outflow' AND cfe.entry_type = 'payable'))
        AND (v_category IS NULL OR cfe.category = v_category)
        AND (v_payment_method IS NULL OR cfe.payment_method = v_payment_method)
        AND (v_origin IS NULL OR cfe.origin_key = v_origin)
        AND (
          v_status IS NULL
          OR public.cash_flow_display_status(
            cfe.status, cfe.due_date, cfe.entry_type, v_today
          ) = v_status
        )
    ),
    ordered AS (
      SELECT
        f.*,
        v_realized_opening
          + SUM(f.signed_amount) OVER (
            ORDER BY f.flow_date ASC, f.created_at ASC, f.id ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS running_balance
      FROM filtered f
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'flow_date', to_char(o.flow_date, 'YYYY-MM-DD'),
          'date_is_estimated', o.date_is_estimated,
          'description', o.description,
          'category', o.category,
          'origin', o.origin_key,
          'payment_method', o.payment_method,
          'inflow', o.inflow_amount,
          'outflow', o.outflow_amount,
          'running_balance', o.running_balance,
          'status', o.display_status,
          'entry_type', o.entry_type,
          'party_name', o.party_name,
          'source_id', o.source_id
        )
        ORDER BY o.flow_date ASC, o.created_at ASC, o.id ASC
      ),
      '[]'::JSONB
    )
    INTO v_movements
    FROM ordered o;
  ELSE
    WITH filtered AS (
      SELECT
        cfe.*,
        public.cash_flow_display_status(
          cfe.status, cfe.due_date, cfe.entry_type, v_today
        ) AS display_status
      FROM public.cash_flow_entries cfe
      WHERE cfe.company_id = p_company_id
        AND cfe.flow_mode = 'projected'
        AND cfe.flow_date BETWEEN p_period_from AND p_period_to
        AND (v_direction IS NULL
          OR (v_direction = 'inflow' AND cfe.entry_type = 'receivable')
          OR (v_direction = 'outflow' AND cfe.entry_type = 'payable'))
        AND (v_category IS NULL OR cfe.category = v_category)
        AND (v_payment_method IS NULL OR cfe.payment_method = v_payment_method)
        AND (v_origin IS NULL OR cfe.origin_key = v_origin)
        AND (
          v_status IS NULL
          OR public.cash_flow_display_status(
            cfe.status, cfe.due_date, cfe.entry_type, v_today
          ) = v_status
        )
    ),
    ordered AS (
      SELECT
        f.*,
        v_projected_opening
          + SUM(f.signed_amount) OVER (
            ORDER BY f.flow_date ASC, f.created_at ASC, f.id ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS running_balance
      FROM filtered f
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'flow_date', to_char(o.flow_date, 'YYYY-MM-DD'),
          'date_is_estimated', o.date_is_estimated,
          'description', o.description,
          'category', o.category,
          'origin', o.origin_key,
          'payment_method', o.payment_method,
          'inflow', o.inflow_amount,
          'outflow', o.outflow_amount,
          'running_balance', o.running_balance,
          'status', o.display_status,
          'entry_type', o.entry_type,
          'party_name', o.party_name,
          'source_id', o.source_id
        )
        ORDER BY o.flow_date ASC, o.created_at ASC, o.id ASC
      ),
      '[]'::JSONB
    )
    INTO v_movements
    FROM ordered o;
  END IF;

  RETURN jsonb_build_object(
    'as_of', to_char(v_today, 'YYYY-MM-DD'),
    'mode', v_mode,
    'grain', v_grain,
    'period_from', to_char(p_period_from, 'YYYY-MM-DD'),
    'period_to', to_char(p_period_to, 'YYYY-MM-DD'),
    'kpis', jsonb_build_object(
      'current_balance', v_current_balance,
      'realized_inflows', v_realized_inflows,
      'realized_outflows', v_realized_outflows,
      'period_balance', v_realized_inflows - v_realized_outflows,
      'open_receivables', v_open_receivables,
      'open_payables', v_open_payables,
      'realized_opening_balance', v_realized_opening,
      'projected_opening_balance', v_projected_opening
    ),
    'series', v_series,
    'movements', v_movements
  );
END;
$$;

COMMENT ON FUNCTION public.get_cash_flow_dashboard(
  UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) IS
  'Dashboard do Fluxo de Caixa: KPIs, série realizado/projetado e lista com saldo acumulado.';

REVOKE ALL ON FUNCTION public.get_cash_flow_dashboard(
  UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_cash_flow_dashboard(
  UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

COMMENT ON FUNCTION public.cash_flow_origin_key(TEXT) IS
  'Normaliza origem: sale | purchase | manual | other.';
COMMENT ON FUNCTION public.cash_flow_realized_date(DATE, DATE, DATE) IS
  'Data realizada: payment_date → due_date → issue_date.';
