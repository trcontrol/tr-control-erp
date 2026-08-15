-- TR Control ERP — Permissões no convite de usuários
-- Migration: 025_company_invites_permissions
-- Idempotente: segura para executar mais de uma vez no SQL Editor.
--
-- Pré-requisito: 024_users_permissions_foundation aplicada.
--
-- NÃO altera:
--   - auth.users / login / recuperação de senha
--   - company_members / member_permissions (estrutura)
--   - Agenda / demais módulos
--   - políticas RLS existentes (a coluna herda as policies de company_invites)
--
-- Altera apenas:
--   - ADD COLUMN permissions (jsonb) em public.company_invites
--   - CHECK garantindo que permissions é um array JSON
--   - índice parcial para busca de convites pending por e-mail
--
-- NÃO executada automaticamente — aplicar manualmente no SQL Editor após autorização.

-- ============================================
-- company_invites: pacote de permissões do convite
-- ============================================
ALTER TABLE public.company_invites
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.company_invites
  DROP CONSTRAINT IF EXISTS company_invites_permissions_is_array;

ALTER TABLE public.company_invites
  ADD CONSTRAINT company_invites_permissions_is_array
  CHECK (jsonb_typeof(permissions) = 'array');

CREATE INDEX IF NOT EXISTS idx_company_invites_company_email_pending
  ON public.company_invites (company_id, lower(email))
  WHERE status = 'pending';

-- ============================================
-- Políticas RLS
-- ============================================
-- Nenhuma política nova nesta migration.
-- A coluna permissions herda as policies existentes de public.company_invites
-- criadas na migration 024:
--   - "Members can view company invites"   (SELECT  → is_company_member)
--   - "Managers can insert company invites" (INSERT  → can_manage_company)
--   - "Managers can update company invites" (UPDATE  → can_manage_company)
--   - "Managers can delete company invites" (DELETE  → can_manage_company)

-- ============================================
-- Funções
-- ============================================
-- Nenhuma função criada ou alterada nesta migration.

-- ============================================
-- ROLLBACK MANUAL (não executar junto com o UP)
-- ============================================
-- DROP INDEX IF EXISTS public.idx_company_invites_company_email_pending;
-- ALTER TABLE public.company_invites
--   DROP CONSTRAINT IF EXISTS company_invites_permissions_is_array;
-- ALTER TABLE public.company_invites
--   DROP COLUMN IF EXISTS permissions;
