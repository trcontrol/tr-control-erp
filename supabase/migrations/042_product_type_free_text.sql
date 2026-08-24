-- TR Control ERP — product_type como texto livre + estoque só via tracks_stock
-- Migration: 042_product_type_free_text
-- Idempotente: segura para executar mais de uma vez.
-- NÃO converte dados existentes. NÃO faz UPDATE em massa.

-- ============================================
-- 1) Remover CHECK que limita a product/service
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_product_type_check'
  ) THEN
    ALTER TABLE public.products
      DROP CONSTRAINT products_product_type_check;
  END IF;
END $$;

-- Mantém: TEXT NOT NULL + DEFAULT 'product' (compatibilidade)
-- Mantém índice idx_products_company_product_type (company_id, product_type)

COMMENT ON COLUMN public.products.product_type IS
  'Tipo livre do item (ex.: product, service, Suplemento). Controle de estoque depende apenas de tracks_stock.';

-- ============================================
-- 2) Baixa de estoque na venda: só tracks_stock
-- Assinatura preservada (p_product_type ignorado).
-- ============================================
CREATE OR REPLACE FUNCTION public.sale_item_should_track_stock(
  p_product_type TEXT,
  p_tracks_stock BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  -- p_product_type mantido por compatibilidade com callers existentes;
  -- a decisão de estoque depende somente de tracks_stock.
  SELECT COALESCE(p_tracks_stock, FALSE);
$$;

COMMENT ON FUNCTION public.sale_item_should_track_stock(TEXT, BOOLEAN) IS
  'Retorna true se o item deve baixar estoque na confirmação da venda. Depende somente de tracks_stock; product_type é ignorado.';
