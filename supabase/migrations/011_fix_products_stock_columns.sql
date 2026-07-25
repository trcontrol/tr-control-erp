-- TR Control ERP — Garante colunas de estoque em products
-- Migration: 011_fix_products_stock_columns
-- Idempotente: segura para executar mais de uma vez.
-- Não apaga nem altera dados existentes além do backfill de tracks_stock nulo.
--
-- Colunas:
--   tracks_stock  (boolean)  — Controlar estoque? Sim/Não
--   current_stock (numeric)  — Estoque atual
--   min_stock     (numeric)  — Estoque mínimo (minimum_stock no domínio do app)
--   max_stock     (numeric)  — Estoque máximo (opcional)
--   stock_location (text)    — Localização

-- tracks_stock
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

-- current_stock
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC(14, 3);

UPDATE public.products
SET current_stock = 0
WHERE current_stock IS NULL;

ALTER TABLE public.products
  ALTER COLUMN current_stock SET DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'current_stock'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.products
      ALTER COLUMN current_stock SET NOT NULL;
  END IF;
END $$;

-- min_stock (estoque mínimo)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_stock NUMERIC(14, 3);

UPDATE public.products
SET min_stock = 0
WHERE min_stock IS NULL;

ALTER TABLE public.products
  ALTER COLUMN min_stock SET DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'min_stock'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.products
      ALTER COLUMN min_stock SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_min_stock_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_min_stock_check
      CHECK (min_stock >= 0);
  END IF;
END $$;

-- max_stock / stock_location (complementares ao módulo)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS max_stock NUMERIC(14, 3);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_location TEXT;

CREATE INDEX IF NOT EXISTS idx_products_company_tracks_stock
  ON public.products (company_id, tracks_stock);
