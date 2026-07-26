-- TR Control ERP — Módulo de Compras
-- Migration: 012_purchases_module
-- Idempotente: segura para executar mais de uma vez.
-- Não atualiza products.cost_price na confirmação (decisão v1).

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

-- ============================================
-- Vínculos de origem (estoque / financeiro)
-- ============================================
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID;

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE INDEX IF NOT EXISTS idx_stock_movements_source
  ON public.stock_movements (company_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_source
  ON public.financial_entries (company_id, source_type, source_id);

-- ============================================
-- purchases
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_method TEXT,
  document_number TEXT,
  notes TEXT,
  freight_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (freight_amount >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  items_subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (items_subtotal >= 0),
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  payment_terms TEXT,
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

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_subtotal NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
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
    SELECT 1 FROM pg_constraint WHERE conname = 'purchases_status_check'
  ) THEN
    ALTER TABLE public.purchases
      ADD CONSTRAINT purchases_status_check
      CHECK (status IN ('draft', 'confirmed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchases_company_id
  ON public.purchases (company_id);

CREATE INDEX IF NOT EXISTS idx_purchases_company_status
  ON public.purchases (company_id, status);

CREATE INDEX IF NOT EXISTS idx_purchases_company_date
  ON public.purchases (company_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id
  ON public.purchases (supplier_id);

DROP TRIGGER IF EXISTS set_purchases_updated_at ON public.purchases;
CREATE TRIGGER set_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- purchase_items
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14, 2) NOT NULL CHECK (unit_cost >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  tracks_stock_snapshot BOOLEAN,
  stock_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(14, 2),
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
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_quantity_positive_check'
  ) THEN
    ALTER TABLE public.purchase_items
      ADD CONSTRAINT purchase_items_quantity_positive_check
      CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_unit_cost_check'
  ) THEN
    ALTER TABLE public.purchase_items
      ADD CONSTRAINT purchase_items_unit_cost_check
      CHECK (unit_cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_discount_check'
  ) THEN
    ALTER TABLE public.purchase_items
      ADD CONSTRAINT purchase_items_discount_check
      CHECK (discount_amount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id
  ON public.purchase_items (purchase_id);

CREATE INDEX IF NOT EXISTS idx_purchase_items_company_id
  ON public.purchase_items (company_id);

CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id
  ON public.purchase_items (product_id);

DROP TRIGGER IF EXISTS set_purchase_items_updated_at ON public.purchase_items;
CREATE TRIGGER set_purchase_items_updated_at
  BEFORE UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Recalcula totais no banco (não confia na UI)
-- ============================================
-- Nota: line_total é calculado no BEFORE trigger de purchase_items.
-- Esta função NÃO deve UPDATE purchase_items (causaria recursão com o AFTER trigger).
-- Correção completa também em 013_fix_purchases_trigger_recursion.sql.
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
BEGIN
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
    RETURN;
  END IF;

  v_total := ROUND(v_items_subtotal - COALESCE(v_discount, 0) + COALESCE(v_freight, 0), 2);
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  UPDATE public.purchases
  SET
    items_subtotal = v_items_subtotal,
    total_amount = v_total
  WHERE id = p_purchase_id;
END;
$$;

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

  -- Em compras não-rascunho, só permite atualizar vínculos de estoque/snapshot
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

DROP TRIGGER IF EXISTS trg_purchase_items_validate ON public.purchase_items;
CREATE TRIGGER trg_purchase_items_validate
  BEFORE INSERT OR UPDATE OR DELETE ON public.purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchase_items_recalc();

CREATE OR REPLACE FUNCTION public.trg_purchase_items_recalc_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_purchase_totals(COALESCE(NEW.purchase_id, OLD.purchase_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_items_recalc_after ON public.purchase_items;
CREATE TRIGGER trg_purchase_items_recalc_after
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchase_items_recalc_after();

CREATE OR REPLACE FUNCTION public.trg_purchases_recalc_on_header()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- ============================================
-- RPC: confirmar compra (transação única)
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
    OR v_purchase.financial_entry_id IS NOT NULL
  THEN
    RAISE EXCEPTION 'Esta compra já possui integração de estoque ou financeiro. Evitando duplicidade.';
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

      UPDATE public.purchase_items
      SET stock_movement_id = v_movement_id
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
    financial_entry_id = v_entry_id,
    confirmed_at = NOW(),
    confirmed_by = auth.uid(),
    due_date = COALESCE(due_date, purchase_date)
  WHERE id = v_purchase.id
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
END;
$$;

-- ============================================
-- RPC: cancelar compra confirmada
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

  IF NOT public.is_company_member(v_purchase.company_id) THEN
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

  -- Estorna estoque excluindo as movimentações (trigger reverte saldo)
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

  -- Cancela lançamento financeiro (preserva histórico)
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

REVOKE ALL ON FUNCTION public.recalculate_purchase_totals(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_purchase(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_purchase(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recalculate_purchase_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_purchase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_purchase(UUID, TEXT) TO authenticated;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company purchases" ON public.purchases;
DROP POLICY IF EXISTS "Members can insert company purchases" ON public.purchases;
DROP POLICY IF EXISTS "Members can update company purchases" ON public.purchases;
DROP POLICY IF EXISTS "Members can delete company purchases" ON public.purchases;

CREATE POLICY "Members can view company purchases"
  ON public.purchases FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company purchases"
  ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company purchases"
  ON public.purchases FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company purchases"
  ON public.purchases FOR DELETE TO authenticated
  USING (public.is_company_member(company_id) AND status = 'draft');

DROP POLICY IF EXISTS "Members can view company purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Members can insert company purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Members can update company purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Members can delete company purchase items" ON public.purchase_items;

CREATE POLICY "Members can view company purchase items"
  ON public.purchase_items FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company purchase items"
  ON public.purchase_items FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company purchase items"
  ON public.purchase_items FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company purchase items"
  ON public.purchase_items FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));
