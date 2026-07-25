-- TR Control ERP — Módulo de Clientes
-- Migration: 005_customers_module
-- Idempotente: segura para executar mais de uma vez.
-- Não altera dados existentes de outras tabelas.

-- ============================================
-- Função de membership (garante existência para RLS)
-- ============================================
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
-- Tabela customers
-- ============================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL CHECK (person_type IN ('individual', 'company')),
  full_name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  secondary_document TEXT,
  birth_date DATE,
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
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colunas (caso a tabela já exista sem algum campo)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS person_type TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS document TEXT,
  ADD COLUMN IF NOT EXISTS secondary_document TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
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
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Constraints (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_person_type_check'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_person_type_check
      CHECK (person_type IN ('individual', 'company'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_status_check'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_status_check
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_customers_company_id
  ON public.customers (company_id);

CREATE INDEX IF NOT EXISTS idx_customers_company_status
  ON public.customers (company_id, status);

CREATE INDEX IF NOT EXISTS idx_customers_company_person_type
  ON public.customers (company_id, person_type);

CREATE INDEX IF NOT EXISTS idx_customers_company_full_name
  ON public.customers (company_id, full_name);

CREATE INDEX IF NOT EXISTS idx_customers_company_document
  ON public.customers (company_id, document);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_company_document_unique
  ON public.customers (company_id, document)
  WHERE document IS NOT NULL AND btrim(document) <> '';

CREATE INDEX IF NOT EXISTS idx_customers_created_at
  ON public.customers (company_id, created_at DESC);

-- updated_at
DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS (sem SELECT recursivo em company_members)
-- ============================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company customers" ON public.customers;
DROP POLICY IF EXISTS "Members can insert company customers" ON public.customers;
DROP POLICY IF EXISTS "Members can update company customers" ON public.customers;
DROP POLICY IF EXISTS "Members can delete company customers" ON public.customers;

CREATE POLICY "Members can view company customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));
