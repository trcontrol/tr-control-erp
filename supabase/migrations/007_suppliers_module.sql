-- TR Control ERP — Módulo de Fornecedores + vínculo no Financeiro
-- Migration: 007_suppliers_module
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
-- Tabela suppliers
-- ============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL CHECK (person_type IN ('individual', 'company')),
  full_name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  secondary_document TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  zip_code TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  contact_name TEXT,
  category TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS person_type TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS document TEXT,
  ADD COLUMN IF NOT EXISTS secondary_document TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_person_type_check'
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_person_type_check
      CHECK (person_type IN ('individual', 'company'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_status_check'
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_status_check
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_company_id
  ON public.suppliers (company_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_company_status
  ON public.suppliers (company_id, status);

CREATE INDEX IF NOT EXISTS idx_suppliers_company_person_type
  ON public.suppliers (company_id, person_type);

CREATE INDEX IF NOT EXISTS idx_suppliers_company_full_name
  ON public.suppliers (company_id, full_name);

CREATE INDEX IF NOT EXISTS idx_suppliers_company_document
  ON public.suppliers (company_id, document);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_company_document_unique
  ON public.suppliers (company_id, document)
  WHERE document IS NOT NULL AND btrim(document) <> '';

DROP TRIGGER IF EXISTS set_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Members can insert company suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Members can update company suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Members can delete company suppliers" ON public.suppliers;

CREATE POLICY "Members can view company suppliers"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company suppliers"
  ON public.suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company suppliers"
  ON public.suppliers
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company suppliers"
  ON public.suppliers
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));

-- ============================================
-- Financeiro: supplier_id opcional
-- ============================================
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_supplier_id
  ON public.financial_entries (supplier_id);
