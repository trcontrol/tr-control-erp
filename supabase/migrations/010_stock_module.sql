-- TR Control ERP — Módulo de Estoque
-- Migration: 010_stock_module
-- Idempotente: segura para executar mais de uma vez.
-- Nota: 009 já existe (product_type/unit); por isso este arquivo é 010.

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
-- Produtos: controlar estoque? (Sim/Não)
-- ============================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tracks_stock BOOLEAN;

UPDATE public.products
SET tracks_stock = TRUE
WHERE tracks_stock IS NULL;

ALTER TABLE public.products
  ALTER COLUMN tracks_stock SET DEFAULT TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'tracks_stock'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.products
      ALTER COLUMN tracks_stock SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_company_tracks_stock
  ON public.products (company_id, tracks_stock);

-- ============================================
-- Tabela stock_movements
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (
    movement_type IN ('entry', 'exit', 'adjustment', 'inventory')
  ),
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  quantity_delta NUMERIC(14, 3),
  previous_stock NUMERIC(14, 3),
  new_stock NUMERIC(14, 3),
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS movement_type TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS quantity_delta NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS previous_stock NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS new_stock NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS movement_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_movement_type_check'
  ) THEN
    ALTER TABLE public.stock_movements
      ADD CONSTRAINT stock_movements_movement_type_check
      CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'inventory'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_quantity_positive_check'
  ) THEN
    ALTER TABLE public.stock_movements
      ADD CONSTRAINT stock_movements_quantity_positive_check
      CHECK (quantity > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id
  ON public.stock_movements (company_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company_date
  ON public.stock_movements (company_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company_type
  ON public.stock_movements (company_id, movement_type);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id
  ON public.stock_movements (product_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company_created
  ON public.stock_movements (company_id, created_at DESC);

DROP TRIGGER IF EXISTS set_stock_movements_updated_at ON public.stock_movements;
CREATE TRIGGER set_stock_movements_updated_at
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Trigger: aplica movimentação no estoque do produto
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prod public.products%ROWTYPE;
  delta NUMERIC(14, 3);
  new_qty NUMERIC(14, 3);
BEGIN
  SELECT *
  INTO prod
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado.';
  END IF;

  IF prod.company_id <> NEW.company_id THEN
    RAISE EXCEPTION 'Produto não pertence à empresa informada.';
  END IF;

  IF COALESCE(prod.tracks_stock, FALSE) IS FALSE THEN
    RAISE EXCEPTION 'Este produto não controla estoque.';
  END IF;

  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  IF NEW.movement_type = 'entry' THEN
    delta := NEW.quantity;
  ELSIF NEW.movement_type = 'exit' THEN
    delta := -NEW.quantity;
  ELSIF NEW.movement_type = 'adjustment' THEN
    IF NEW.quantity_delta IS NULL OR NEW.quantity_delta = 0 THEN
      RAISE EXCEPTION 'Informe a variação do ajuste (positiva ou negativa).';
    END IF;
    delta := NEW.quantity_delta;
    NEW.quantity := ABS(delta);
  ELSIF NEW.movement_type = 'inventory' THEN
    delta := NEW.quantity - prod.current_stock;
  ELSE
    RAISE EXCEPTION 'Tipo de movimentação inválido.';
  END IF;

  new_qty := prod.current_stock + delta;

  IF new_qty < 0 THEN
    RAISE EXCEPTION 'Saldo de estoque não pode ficar negativo. Disponível: %', prod.current_stock;
  END IF;

  NEW.previous_stock := prod.current_stock;
  NEW.quantity_delta := delta;
  NEW.new_stock := new_qty;

  IF NEW.responsible_user_id IS NULL THEN
    NEW.responsible_user_id := auth.uid();
  END IF;

  IF NEW.movement_date IS NULL THEN
    NEW.movement_date := CURRENT_DATE;
  END IF;

  UPDATE public.products
  SET current_stock = new_qty
  WHERE id = prod.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_apply_stock_movement
  BEFORE INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_stock_movement();

-- Impede alteração de campos que afetam o saldo (histórico imutável)
CREATE OR REPLACE FUNCTION public.prevent_stock_movement_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF
    NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.product_id IS DISTINCT FROM OLD.product_id
    OR NEW.movement_type IS DISTINCT FROM OLD.movement_type
    OR NEW.quantity IS DISTINCT FROM OLD.quantity
    OR NEW.quantity_delta IS DISTINCT FROM OLD.quantity_delta
    OR NEW.previous_stock IS DISTINCT FROM OLD.previous_stock
    OR NEW.new_stock IS DISTINCT FROM OLD.new_stock
    OR NEW.movement_date IS DISTINCT FROM OLD.movement_date
    OR NEW.responsible_user_id IS DISTINCT FROM OLD.responsible_user_id
  THEN
    RAISE EXCEPTION 'Movimentações de estoque não podem ser alteradas. Crie um novo lançamento.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_stock_movement_mutation ON public.stock_movements;
CREATE TRIGGER trg_prevent_stock_movement_mutation
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_stock_movement_mutation();

-- Reverte o saldo ao excluir uma movimentação
CREATE OR REPLACE FUNCTION public.reverse_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prod public.products%ROWTYPE;
  restored NUMERIC(14, 3);
BEGIN
  SELECT *
  INTO prod
  FROM public.products
  WHERE id = OLD.product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN OLD;
  END IF;

  restored := prod.current_stock - COALESCE(OLD.quantity_delta, 0);

  IF restored < 0 THEN
    RAISE EXCEPTION 'Não é possível excluir: o estoque ficaria negativo.';
  END IF;

  UPDATE public.products
  SET current_stock = restored
  WHERE id = prod.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_reverse_stock_movement
  BEFORE DELETE ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_stock_movement();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Members can insert company stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Members can update company stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Members can delete company stock movements" ON public.stock_movements;

CREATE POLICY "Members can view company stock movements"
  ON public.stock_movements
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company stock movements"
  ON public.stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company stock movements"
  ON public.stock_movements
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company stock movements"
  ON public.stock_movements
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));
