-- TR Control ERP — Módulo de Vendas
-- Migration: 015_sales_module
-- Idempotente: segura para executar mais de uma vez.
-- Não executa automaticamente pelo app.
--
-- Fluxo: Cliente → Venda → Itens → Saída estoque → Conta a receber
-- Baixa de estoque somente se product_type = 'product' AND tracks_stock = true.
-- Não altera products.sale_price nem products.cost_price.

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

REVOKE ALL ON FUNCTION public.is_company_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(UUID) TO authenticated;

-- source_* já existem (012); garantir presença
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID;

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID;

-- ============================================
-- sales
-- ============================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_method TEXT,
  document_number TEXT,
  notes TEXT,
  freight_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (freight_amount >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  items_subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (items_subtotal >= 0),
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  payment_terms TEXT,
  quote_id UUID,
  stock_posted BOOLEAN NOT NULL DEFAULT FALSE,
  finance_posted BOOLEAN NOT NULL DEFAULT FALSE,
  financial_entry_id UUID REFERENCES public.financial_entries(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sale_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_subtotal NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS quote_id UUID,
  ADD COLUMN IF NOT EXISTS stock_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS financial_entry_id UUID REFERENCES public.financial_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_status_check'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_status_check
      CHECK (status IN ('draft', 'confirmed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_company_id ON public.sales (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_status ON public.sales (company_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_company_date ON public.sales (company_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id);

DROP TRIGGER IF EXISTS set_sales_updated_at ON public.sales;
CREATE TRIGGER set_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- sale_items
-- ============================================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  tracks_stock_snapshot BOOLEAN,
  stock_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracks_stock_snapshot BOOLEAN,
  ADD COLUMN IF NOT EXISTS stock_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_quantity_positive_check'
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_quantity_positive_check
      CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_unit_price_check'
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_unit_price_check
      CHECK (unit_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_discount_check'
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_discount_check
      CHECK (discount_amount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_company_id ON public.sale_items (company_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items (product_id);

DROP TRIGGER IF EXISTS set_sale_items_updated_at ON public.sale_items;
CREATE TRIGGER set_sale_items_updated_at
  BEFORE UPDATE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Totais (sem recursão: não UPDATE sale_items aqui)
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
BEGIN
  IF NULLIF(current_setting('app.sales_recalculating', true), '') = '1' THEN
    RETURN;
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

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sale_items_recalc_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(current_setting('app.sales_recalculating', true), '') = '1' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.quantity IS NOT DISTINCT FROM OLD.quantity
    AND NEW.unit_price IS NOT DISTINCT FROM OLD.unit_price
    AND NEW.discount_amount IS NOT DISTINCT FROM OLD.discount_amount
    AND NEW.product_id IS NOT DISTINCT FROM OLD.product_id
    AND NEW.sale_id IS NOT DISTINCT FROM OLD.sale_id
  THEN
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_sale_totals(COALESCE(NEW.sale_id, OLD.sale_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_items_validate ON public.sale_items;
CREATE TRIGGER trg_sale_items_validate
  BEFORE INSERT OR UPDATE OR DELETE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sale_items_validate();

DROP TRIGGER IF EXISTS trg_sale_items_recalc_after ON public.sale_items;
CREATE TRIGGER trg_sale_items_recalc_after
  AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sale_items_recalc_after();

CREATE OR REPLACE FUNCTION public.trg_sales_recalc_on_header()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(current_setting('app.sales_recalculating', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      NEW.freight_amount IS DISTINCT FROM OLD.freight_amount
      OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    )
  THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'Frete e desconto só podem ser alterados em vendas em rascunho.';
    END IF;
    PERFORM public.recalculate_sale_totals(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_recalc_on_header ON public.sales;
CREATE TRIGGER trg_sales_recalc_on_header
  AFTER UPDATE OF freight_amount, discount_amount ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sales_recalc_on_header();

-- ============================================
-- Helper: deve baixar estoque?
-- ============================================
CREATE OR REPLACE FUNCTION public.sale_item_should_track_stock(
  p_product_type TEXT,
  p_tracks_stock BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_product_type, '') = 'product'
    AND COALESCE(p_tracks_stock, FALSE) = TRUE;
$$;

-- ============================================
-- RPC: confirmar venda
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

  IF NOT public.is_company_member(v_sale.company_id) THEN
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

  -- Pré-validação de estoque (falha total antes de qualquer saída)
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

  -- Aplicar saídas + snapshots
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

-- ============================================
-- RPC: cancelar venda
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

  IF NOT public.is_company_member(v_sale.company_id) THEN
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

COMMENT ON FUNCTION public.confirm_sale(UUID) IS
  'Confirma venda: saídas (product+tracks_stock) + conta a receber. Idempotente. Rollback total se estoque insuficiente.';

COMMENT ON FUNCTION public.cancel_sale(UUID, TEXT) IS
  'Cancela venda: estorna estoque e cancela financeiro. Bloqueia se received/paid.';

REVOKE ALL ON FUNCTION public.recalculate_sale_totals(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_sale(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_sale(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sale_item_should_track_stock(TEXT, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recalculate_sale_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sale(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sale_item_should_track_stock(TEXT, BOOLEAN) TO authenticated;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company sales" ON public.sales;
DROP POLICY IF EXISTS "Members can insert company sales" ON public.sales;
DROP POLICY IF EXISTS "Members can update company sales" ON public.sales;
DROP POLICY IF EXISTS "Members can delete company sales" ON public.sales;

CREATE POLICY "Members can view company sales"
  ON public.sales FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company sales"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company sales"
  ON public.sales FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company sales"
  ON public.sales FOR DELETE TO authenticated
  USING (public.is_company_member(company_id) AND status = 'draft');

DROP POLICY IF EXISTS "Members can view company sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Members can insert company sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Members can update company sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Members can delete company sale items" ON public.sale_items;

CREATE POLICY "Members can view company sale items"
  ON public.sale_items FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company sale items"
  ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company sale items"
  ON public.sale_items FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company sale items"
  ON public.sale_items FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));
