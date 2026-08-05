-- TR Control ERP — Fundação de status, convites e permissões de usuários
-- Migration: 024_users_permissions_foundation
-- Idempotente: segura para executar mais de uma vez no SQL Editor.
--
-- NÃO altera:
--   - auth.users / fluxos de login / recuperação de senha
--   - estrutura de profiles / companies (somente FKs de leitura)
--   - tabelas do módulo Agenda
--   - dados de negócio existentes (apenasas, agenda, financeiro, etc.)
--
-- Altera apenas:
--   - ADD COLUMN em company_members (status, access_profile) com defaults
--   - backfill de access_profile a partir do role atual
--   - novas tabelas: company_invites, member_permissions
--   - funções/triggers de proteção de owner/admin
--   - RLS das tabelas novas
--
-- NÃO executada automaticamente — aplicar manualmente no SQL Editor após autorização.

-- ============================================
-- Enums
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE public.member_status AS ENUM ('active', 'inactive', 'pending');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_profile') THEN
    CREATE TYPE public.access_profile AS ENUM (
      'administrator',
      'manager',
      'professional',
      'attendant',
      'custom'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_scope') THEN
    CREATE TYPE public.permission_scope AS ENUM (
      'all',
      'own',
      'own_agenda',
      'team'
    );
  END IF;
END $$;

-- ============================================
-- company_members: colunas aditivas (não destrutivas)
-- ============================================
ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS status public.member_status NOT NULL DEFAULT 'active';

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS access_profile public.access_profile NOT NULL DEFAULT 'professional';

-- Backfill compatível com roles atuais (multi-tenant, por linha)
UPDATE public.company_members
SET access_profile = CASE
  WHEN role IN ('owner', 'admin') THEN 'administrator'::public.access_profile
  ELSE 'professional'::public.access_profile
END
WHERE access_profile IS DISTINCT FROM CASE
  WHEN role IN ('owner', 'admin') THEN 'administrator'::public.access_profile
  ELSE 'professional'::public.access_profile
END;

CREATE INDEX IF NOT EXISTS idx_company_members_company_status
  ON public.company_members(company_id, status);

CREATE INDEX IF NOT EXISTS idx_company_members_company_access_profile
  ON public.company_members(company_id, access_profile);

-- ============================================
-- Proteções: último owner e último administrador
-- (owner | admin). Não afeta auth nem Agenda.
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_company_member_protections()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company_id UUID;
  remaining_owners INTEGER;
  remaining_admins INTEGER;
  old_role public.company_role;
  new_role public.company_role;
  old_status public.member_status;
  new_status public.member_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_company_id := OLD.company_id;
    old_role := OLD.role;
    old_status := COALESCE(OLD.status, 'active'::public.member_status);

    IF old_role = 'owner' THEN
      SELECT COUNT(*)::INTEGER INTO remaining_owners
      FROM public.company_members
      WHERE company_id = target_company_id
        AND id <> OLD.id
        AND role = 'owner'
        AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

      IF remaining_owners = 0 THEN
        RAISE EXCEPTION
          'Não é permitido remover o proprietário principal (último owner) da empresa.';
      END IF;
    END IF;

    IF old_role IN ('owner', 'admin')
       AND COALESCE(old_status, 'active'::public.member_status) <> 'inactive' THEN
      SELECT COUNT(*)::INTEGER INTO remaining_admins
      FROM public.company_members
      WHERE company_id = target_company_id
        AND id <> OLD.id
        AND role IN ('owner', 'admin')
        AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

      IF remaining_admins = 0 THEN
        RAISE EXCEPTION
          'Não é permitido remover o último administrador da empresa.';
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  -- UPDATE
  target_company_id := NEW.company_id;
  old_role := OLD.role;
  new_role := NEW.role;
  old_status := COALESCE(OLD.status, 'active'::public.member_status);
  new_status := COALESCE(NEW.status, 'active'::public.member_status);

  -- Impede rebaixar o último owner
  IF old_role = 'owner' AND new_role IS DISTINCT FROM 'owner' THEN
    SELECT COUNT(*)::INTEGER INTO remaining_owners
    FROM public.company_members
    WHERE company_id = target_company_id
      AND id <> OLD.id
      AND role = 'owner'
      AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

    IF remaining_owners = 0 THEN
      RAISE EXCEPTION
        'Não é permitido rebaixar o proprietário principal (último owner) da empresa.';
    END IF;
  END IF;

  -- Impede inativar o último owner
  IF old_role = 'owner'
     AND old_status <> 'inactive'
     AND new_status = 'inactive' THEN
    SELECT COUNT(*)::INTEGER INTO remaining_owners
    FROM public.company_members
    WHERE company_id = target_company_id
      AND id <> OLD.id
      AND role = 'owner'
      AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

    IF remaining_owners = 0 THEN
      RAISE EXCEPTION
        'Não é permitido inativar o proprietário principal (último owner) da empresa.';
    END IF;
  END IF;

  -- Impede perder o último administrador (owner|admin ativo)
  IF (
        (old_role IN ('owner', 'admin') AND new_role NOT IN ('owner', 'admin'))
        OR
        (old_role IN ('owner', 'admin')
          AND old_status <> 'inactive'
          AND new_status = 'inactive')
      ) THEN
    SELECT COUNT(*)::INTEGER INTO remaining_admins
    FROM public.company_members
    WHERE company_id = target_company_id
      AND id <> OLD.id
      AND role IN ('owner', 'admin')
      AND COALESCE(status, 'active'::public.member_status) <> 'inactive';

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION
        'Não é permitido remover ou inativar o último administrador da empresa.';
    END IF;
  END IF;

  -- Não permitir trocar company_id (protege isolamento multi-tenant)
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Não é permitido mover membership entre empresas.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_company_member_protections
  ON public.company_members;

CREATE TRIGGER trg_enforce_company_member_protections
  BEFORE UPDATE OR DELETE ON public.company_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_member_protections();

-- ============================================
-- company_invites
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.company_role NOT NULL DEFAULT 'member',
  access_profile public.access_profile NOT NULL DEFAULT 'professional',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_invites_role_not_owner CHECK (role <> 'owner'),
  CONSTRAINT company_invites_company_email_unique UNIQUE (company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_company_invites_company_id
  ON public.company_invites(company_id);

CREATE INDEX IF NOT EXISTS idx_company_invites_email
  ON public.company_invites(lower(email));

CREATE INDEX IF NOT EXISTS idx_company_invites_status
  ON public.company_invites(company_id, status);

DROP TRIGGER IF EXISTS set_company_invites_updated_at ON public.company_invites;
CREATE TRIGGER set_company_invites_updated_at
  BEFORE UPDATE ON public.company_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company invites" ON public.company_invites;
CREATE POLICY "Members can view company invites"
  ON public.company_invites
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

DROP POLICY IF EXISTS "Managers can insert company invites" ON public.company_invites;
CREATE POLICY "Managers can insert company invites"
  ON public.company_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS "Managers can update company invites" ON public.company_invites;
CREATE POLICY "Managers can update company invites"
  ON public.company_invites
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS "Managers can delete company invites" ON public.company_invites;
CREATE POLICY "Managers can delete company invites"
  ON public.company_invites
  FOR DELETE
  TO authenticated
  USING (public.can_manage_company(company_id));

-- ============================================
-- member_permissions (boolean columns)
-- ============================================
CREATE TABLE IF NOT EXISTS public.member_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.company_members(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  scope public.permission_scope NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_permissions_membership_module_unique UNIQUE (membership_id, module),
  CONSTRAINT member_permissions_module_not_blank CHECK (length(btrim(module)) > 0),
  CONSTRAINT member_permissions_view_dependency CHECK (
    can_view
    OR (
      can_create = false
      AND can_edit = false
      AND can_delete = false
      AND can_export = false
    )
  )
);

-- Garante tenant consistente + owner não perde view em users/settings
CREATE OR REPLACE FUNCTION public.enforce_member_permissions_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_company_id UUID;
BEGIN
  SELECT company_id INTO membership_company_id
  FROM public.company_members
  WHERE id = NEW.membership_id;

  IF membership_company_id IS NULL THEN
    RAISE EXCEPTION 'Membership inválido para permissões.';
  END IF;

  IF NEW.company_id IS DISTINCT FROM membership_company_id THEN
    RAISE EXCEPTION 'company_id da permissão deve coincidir com o da membership (multi-tenant).';
  END IF;

  -- Dono principal: não pode ficar sem view em users/settings
  IF EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.id = NEW.membership_id
      AND cm.role = 'owner'
  ) AND NEW.module IN ('users', 'settings') AND NEW.can_view = false THEN
    RAISE EXCEPTION
      'O proprietário principal não pode perder Visualizar em Usuários ou Configurações.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_member_permissions_tenant
  ON public.member_permissions;

CREATE TRIGGER trg_enforce_member_permissions_tenant
  BEFORE INSERT OR UPDATE ON public.member_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_permissions_tenant();

CREATE INDEX IF NOT EXISTS idx_member_permissions_company_id
  ON public.member_permissions(company_id);

CREATE INDEX IF NOT EXISTS idx_member_permissions_membership_id
  ON public.member_permissions(membership_id);

CREATE INDEX IF NOT EXISTS idx_member_permissions_company_module
  ON public.member_permissions(company_id, module);

DROP TRIGGER IF EXISTS set_member_permissions_updated_at ON public.member_permissions;
CREATE TRIGGER set_member_permissions_updated_at
  BEFORE UPDATE ON public.member_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view member permissions" ON public.member_permissions;
CREATE POLICY "Members can view member permissions"
  ON public.member_permissions
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

DROP POLICY IF EXISTS "Managers can insert member permissions" ON public.member_permissions;
CREATE POLICY "Managers can insert member permissions"
  ON public.member_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS "Managers can update member permissions" ON public.member_permissions;
CREATE POLICY "Managers can update member permissions"
  ON public.member_permissions
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

DROP POLICY IF EXISTS "Managers can delete member permissions" ON public.member_permissions;
CREATE POLICY "Managers can delete member permissions"
  ON public.member_permissions
  FOR DELETE
  TO authenticated
  USING (
    public.can_manage_company(company_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.id = member_permissions.membership_id
        AND cm.role = 'owner'
        AND member_permissions.module IN ('users', 'settings')
    )
  );

-- ============================================
-- ROLLBACK MANUAL (não executar junto com o UP)
-- ============================================
-- DROP TRIGGER IF EXISTS trg_enforce_member_permissions_tenant ON public.member_permissions;
-- DROP TRIGGER IF EXISTS set_member_permissions_updated_at ON public.member_permissions;
-- DROP TABLE IF EXISTS public.member_permissions;
-- DROP TRIGGER IF EXISTS set_company_invites_updated_at ON public.company_invites;
-- DROP TABLE IF EXISTS public.company_invites;
-- DROP TRIGGER IF EXISTS trg_enforce_company_member_protections ON public.company_members;
-- DROP FUNCTION IF EXISTS public.enforce_member_permissions_tenant();
-- DROP FUNCTION IF EXISTS public.enforce_company_member_protections();
-- ALTER TABLE public.company_members DROP COLUMN IF EXISTS access_profile;
-- ALTER TABLE public.company_members DROP COLUMN IF EXISTS status;
-- DROP TYPE IF EXISTS public.permission_scope;
-- DROP TYPE IF EXISTS public.access_profile;
-- DROP TYPE IF EXISTS public.member_status;
