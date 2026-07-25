-- TR Control ERP — Tipo Produto/Serviço + Unidade opcional
-- Migration: 009_products_type_and_optional_unit
-- Idempotente: segura para executar mais de uma vez.
-- Compatível com produtos já cadastrados.

-- Tipo do item (produto físico ou serviço)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Backfill: registros existentes passam a ser "product"
UPDATE public.products
SET product_type = 'product'
WHERE product_type IS NULL OR btrim(product_type) = '';

ALTER TABLE public.products
  ALTER COLUMN product_type SET DEFAULT 'product';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'product_type'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.products
      ALTER COLUMN product_type SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_product_type_check
      CHECK (product_type IN ('product', 'service'));
  END IF;
END $$;

-- Unidade deixa de ser obrigatória (serviços podem ficar sem unidade)
ALTER TABLE public.products
  ALTER COLUMN unit DROP NOT NULL;

ALTER TABLE public.products
  ALTER COLUMN unit DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_products_company_product_type
  ON public.products (company_id, product_type);
