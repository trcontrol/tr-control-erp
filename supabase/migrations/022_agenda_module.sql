-- TR Control ERP — Módulo de Agenda
-- Migration: 022_agenda_module
-- Idempotente: segura para executar mais de uma vez no SQL Editor.
-- Não altera dados, funções, políticas nem permissões de outros módulos.
--
-- Reutiliza (sem recriar):
--   - public.is_company_member(UUID)  — membership / RLS multiempresa
--   - public.handle_updated_at()      — trigger updated_at
--   - uuid_generate_v4()              — PK (extensão uuid-ossp)

-- ============================================
-- Tabela agenda_events
-- ============================================
CREATE TABLE IF NOT EXISTS public.agenda_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE NOT NULL,
  end_time TIME,
  all_day BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  location TEXT,
  assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agenda_events_date_range_check CHECK (end_date >= start_date)
);

-- Colunas (caso a tabela já exista sem algum campo)
ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Constraints (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agenda_events_status_check'
  ) THEN
    ALTER TABLE public.agenda_events
      ADD CONSTRAINT agenda_events_status_check
      CHECK (status IN ('scheduled', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agenda_events_date_range_check'
  ) THEN
    ALTER TABLE public.agenda_events
      ADD CONSTRAINT agenda_events_date_range_check
      CHECK (end_date >= start_date);
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_agenda_events_company_id
  ON public.agenda_events (company_id);

CREATE INDEX IF NOT EXISTS idx_agenda_events_start_date
  ON public.agenda_events (company_id, start_date);

CREATE INDEX IF NOT EXISTS idx_agenda_events_end_date
  ON public.agenda_events (company_id, end_date);

CREATE INDEX IF NOT EXISTS idx_agenda_events_status
  ON public.agenda_events (company_id, status);

CREATE INDEX IF NOT EXISTS idx_agenda_events_assigned_user_id
  ON public.agenda_events (company_id, assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_agenda_events_related_customer_id
  ON public.agenda_events (company_id, related_customer_id);

CREATE INDEX IF NOT EXISTS idx_agenda_events_company_range
  ON public.agenda_events (company_id, start_date, end_date);

-- updated_at (reutiliza public.handle_updated_at)
DROP TRIGGER IF EXISTS set_agenda_events_updated_at ON public.agenda_events;
CREATE TRIGGER set_agenda_events_updated_at
  BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS — exclusivamente agenda_events
-- ============================================
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company agenda_events" ON public.agenda_events;
DROP POLICY IF EXISTS "Members can insert company agenda_events" ON public.agenda_events;
DROP POLICY IF EXISTS "Members can update company agenda_events" ON public.agenda_events;
DROP POLICY IF EXISTS "Members can delete company agenda_events" ON public.agenda_events;

CREATE POLICY "Members can view company agenda_events"
  ON public.agenda_events
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company agenda_events"
  ON public.agenda_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company agenda_events"
  ON public.agenda_events
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company agenda_events"
  ON public.agenda_events
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));
