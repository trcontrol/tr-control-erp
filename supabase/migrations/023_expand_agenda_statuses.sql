-- TR Control ERP — Expandir status de public.agenda_events
-- Migration: 023_expand_agenda_statuses
--
-- Seguro para produção:
--   - não altera RLS
--   - não altera outras tabelas
--   - não altera dados existentes
--   - remove e recria apenas agenda_events_status_check
--
-- Status aceitos:
--   scheduled, confirmed, in_progress, completed, canceled, rescheduled

ALTER TABLE public.agenda_events
  DROP CONSTRAINT IF EXISTS agenda_events_status_check;

ALTER TABLE public.agenda_events
  ADD CONSTRAINT agenda_events_status_check
  CHECK (
    status IN (
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'canceled',
      'rescheduled'
    )
  );
