-- ============================================================
-- TR Control — Funil Comercial: nova sequência de etapas (v2)
-- ============================================================
-- NÃO apaga dados. Remapeia stages legados e preserva "lost".
-- Aplicar somente após autorização explícita.
-- ============================================================

-- 1) Remover CHECK antigo para permitir o remapeamento
ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_stage_check;

-- 2) Remapear valores legados → novos (sem DELETE)
--    new_contact      → new_lead
--    negotiating      → negotiation
--    proposal_sent    → proposal_sent (inalterado)
--    won              → contract_closed
--    lost             → lost (preservado, fora da sequência principal)
UPDATE public.opportunities
SET
  stage = CASE stage
    WHEN 'new_contact' THEN 'new_lead'
    WHEN 'negotiating' THEN 'negotiation'
    WHEN 'proposal_sent' THEN 'proposal_sent'
    WHEN 'won' THEN 'contract_closed'
    WHEN 'lost' THEN 'lost'
    ELSE stage
  END,
  updated_at = NOW()
WHERE stage IN (
  'new_contact',
  'negotiating',
  'proposal_sent',
  'won',
  'lost'
);

-- 3) Default da coluna alinhado à 1ª etapa oficial
ALTER TABLE public.opportunities
  ALTER COLUMN stage SET DEFAULT 'new_lead';

-- 4) Novo CHECK: 8 etapas oficiais + lost preservado
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_stage_check
  CHECK (stage IN (
    'new_lead',
    'contact_made',
    'briefing_sent',
    'proposal_sent',
    'negotiation',
    'contract_closed',
    'project_in_progress',
    'completed',
    'lost'
  ));
