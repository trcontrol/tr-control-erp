-- TR Control ERP — Módulo de Produtos + Storage de imagens
-- Migration: 008_products_module
-- Idempotente: segura para executar mais de uma vez.

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
-- Tabela products
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  internal_code TEXT,
  sku TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  brand TEXT,
  unit TEXT NOT NULL DEFAULT 'UN',
  ncm TEXT,
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sale_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  max_stock NUMERIC(14, 3),
  stock_location TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS internal_code TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS ncm TEXT,
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC(14, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock NUMERIC(14, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS stock_location TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_status_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_status_check
      CHECK (status IN ('active', 'inactive'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_cost_price_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_cost_price_check
      CHECK (cost_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_sale_price_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_sale_price_check
      CHECK (sale_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_min_stock_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_min_stock_check
      CHECK (min_stock >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_company_id
  ON public.products (company_id);

CREATE INDEX IF NOT EXISTS idx_products_company_status
  ON public.products (company_id, status);

CREATE INDEX IF NOT EXISTS idx_products_company_category
  ON public.products (company_id, category);

CREATE INDEX IF NOT EXISTS idx_products_company_brand
  ON public.products (company_id, brand);

CREATE INDEX IF NOT EXISTS idx_products_company_name
  ON public.products (company_id, name);

CREATE INDEX IF NOT EXISTS idx_products_company_sku
  ON public.products (company_id, sku);

CREATE INDEX IF NOT EXISTS idx_products_company_barcode
  ON public.products (company_id, barcode);

CREATE INDEX IF NOT EXISTS idx_products_company_internal_code
  ON public.products (company_id, internal_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_company_sku_unique
  ON public.products (company_id, sku)
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_company_barcode_unique
  ON public.products (company_id, barcode)
  WHERE barcode IS NOT NULL AND btrim(barcode) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_company_internal_code_unique
  ON public.products (company_id, internal_code)
  WHERE internal_code IS NOT NULL AND btrim(internal_code) <> '';

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company products" ON public.products;
DROP POLICY IF EXISTS "Members can insert company products" ON public.products;
DROP POLICY IF EXISTS "Members can update company products" ON public.products;
DROP POLICY IF EXISTS "Members can delete company products" ON public.products;

CREATE POLICY "Members can view company products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));

-- ============================================
-- Storage: imagens de produtos
-- Path: {company_id}/...
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Product images are publicly readable" ON storage.objects;
CREATE POLICY "Product images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Members can upload product images" ON storage.objects;
CREATE POLICY "Members can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Members can update product images" ON storage.objects;
CREATE POLICY "Members can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Members can delete product images" ON storage.objects;
CREATE POLICY "Members can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  );
