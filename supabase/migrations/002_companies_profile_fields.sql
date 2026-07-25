-- TR Control ERP — Campos cadastrais da empresa + RLS + storage
-- Migration: 002_companies_profile_fields

-- ============================================
-- Garantir tabela companies
-- ============================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Campos cadastrais
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS state_registration TEXT,
  ADD COLUMN IF NOT EXISTS municipal_registration TEXT,
  ADD COLUMN IF NOT EXISTS tax_regime TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS responsible_name TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_cnpj_unique
  ON public.companies (cnpj)
  WHERE cnpj IS NOT NULL AND btrim(cnpj) <> '';

-- ============================================
-- Helper: membro da empresa
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

CREATE OR REPLACE FUNCTION public.can_manage_company(target_company_id UUID)
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
      AND company_members.role IN ('owner', 'admin')
  );
$$;

-- ============================================
-- RLS: visualizar e editar apenas a própria empresa
-- ============================================
DROP POLICY IF EXISTS "Members can view their companies" ON public.companies;
CREATE POLICY "Members can view their companies"
  ON public.companies FOR SELECT
  USING (public.is_company_member(id));

DROP POLICY IF EXISTS "Owners and admins can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Members can update their companies" ON public.companies;
CREATE POLICY "Members can update their companies"
  ON public.companies FOR UPDATE
  USING (public.is_company_member(id))
  WITH CHECK (public.is_company_member(id));

-- ============================================
-- Storage: logos da empresa
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Company logos are publicly readable" ON storage.objects;
CREATE POLICY "Company logos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Members can upload company logos" ON storage.objects;
CREATE POLICY "Members can upload company logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Members can update company logos" ON storage.objects;
CREATE POLICY "Members can update company logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-logos'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Members can delete company logos" ON storage.objects;
CREATE POLICY "Members can delete company logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-logos'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  );
