-- TR Control ERP — Módulo Financeiro (Contas a pagar / receber)
-- Migration: 006_financial_entries
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

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('payable', 'receivable')),
  description TEXT NOT NULL,
  category TEXT,
  party_name TEXT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'received', 'overdue', 'cancelled')),
  payment_method TEXT,
  document_number TEXT,
  notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entry_type TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS party_name TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS issue_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_entries_entry_type_check'
  ) THEN
    ALTER TABLE public.financial_entries
      ADD CONSTRAINT financial_entries_entry_type_check
      CHECK (entry_type IN ('payable', 'receivable'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_entries_status_check'
  ) THEN
    ALTER TABLE public.financial_entries
      ADD CONSTRAINT financial_entries_status_check
      CHECK (status IN ('pending', 'paid', 'received', 'overdue', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_entries_amount_check'
  ) THEN
    ALTER TABLE public.financial_entries
      ADD CONSTRAINT financial_entries_amount_check
      CHECK (amount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financial_entries_company_id
  ON public.financial_entries (company_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_company_type
  ON public.financial_entries (company_id, entry_type);

CREATE INDEX IF NOT EXISTS idx_financial_entries_company_status
  ON public.financial_entries (company_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_entries_company_due_date
  ON public.financial_entries (company_id, due_date);

CREATE INDEX IF NOT EXISTS idx_financial_entries_customer_id
  ON public.financial_entries (customer_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_created_at
  ON public.financial_entries (company_id, created_at DESC);

DROP TRIGGER IF EXISTS set_financial_entries_updated_at ON public.financial_entries;
CREATE TRIGGER set_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Members can insert company financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Members can update company financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Members can delete company financial entries" ON public.financial_entries;

CREATE POLICY "Members can view company financial entries"
  ON public.financial_entries
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company financial entries"
  ON public.financial_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company financial entries"
  ON public.financial_entries
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company financial entries"
  ON public.financial_entries
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));
