-- TR Control ERP — 044_fix_invite_access_profile_cast
-- Pré-requisito: 024 (enum access_profile), 032 (claim_company_invite_membership).
-- Idempotente via CREATE OR REPLACE.
--
-- Problema:
--   claim_company_invite_membership recebe p_access_profile TEXT e grava em
--   company_members.access_profile (public.access_profile ENUM) sem cast explícito.
--   COALESCE(..., 'professional') produz TEXT → erro no INSERT/UPDATE.
--
-- Correção:
--   Cast explícito ::public.access_profile no INSERT e no UPDATE.
--   Assinatura, grants, search_path e demais regras inalterados.

CREATE OR REPLACE FUNCTION public.claim_company_invite_membership(
  p_invite_id UUID,
  p_company_id UUID,
  p_user_id UUID,
  p_role public.company_role,
  p_access_profile TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.company_invites%ROWTYPE;
  v_membership_id UUID;
  v_role public.company_role;
BEGIN
  IF p_invite_id IS NULL OR p_company_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'claim_invite_params_required';
  END IF;

  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role'
     AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'claim_invite_user_mismatch' USING ERRCODE = '42501';
  END IF;

  -- Serializa com outros consumes de seat nesta empresa
  PERFORM 1 FROM public.companies c WHERE c.id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_invite
  FROM public.company_invites
  WHERE id = p_invite_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotente: já aceito + membership existente
  IF v_invite.status = 'accepted' THEN
    SELECT id INTO v_membership_id
    FROM public.company_members
    WHERE company_id = p_company_id
      AND user_id = p_user_id;
    IF v_membership_id IS NULL THEN
      RAISE EXCEPTION 'invite_accepted_without_membership';
    END IF;
    RETURN v_membership_id;
  END IF;

  IF v_invite.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'invite_not_pending';
  END IF;

  IF v_invite.expires_at <= NOW() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  IF v_invite.is_initial_owner THEN
    v_role := 'owner'::public.company_role;
  ELSE
    v_role := COALESCE(p_role, 'member'::public.company_role);
    IF v_role = 'owner'::public.company_role THEN
      v_role := 'member'::public.company_role;
    END IF;
  END IF;

  -- Vaga: este pending já reserva; excluir do count ao converter
  PERFORM public.assert_company_seat_available(p_company_id, p_invite_id, NULL);

  -- Flag para o trigger de member não double-count este invite
  PERFORM set_config('app.seat_claim_invite_id', p_invite_id::text, true);

  SELECT id INTO v_membership_id
  FROM public.company_members
  WHERE company_id = p_company_id
    AND user_id = p_user_id;

  IF v_membership_id IS NULL THEN
    INSERT INTO public.company_members (
      company_id,
      user_id,
      role,
      status,
      access_profile
    )
    VALUES (
      p_company_id,
      p_user_id,
      v_role,
      'active'::public.member_status,
      COALESCE(NULLIF(btrim(p_access_profile), ''), 'professional')::public.access_profile
    )
    RETURNING id INTO v_membership_id;
  ELSE
    UPDATE public.company_members
    SET
      role = v_role,
      status = 'active'::public.member_status,
      access_profile = COALESCE(
        NULLIF(btrim(p_access_profile), '')::public.access_profile,
        access_profile
      )
    WHERE id = v_membership_id;
  END IF;

  UPDATE public.company_invites
  SET status = 'accepted'
  WHERE id = p_invite_id
    AND status = 'pending';

  PERFORM set_config('app.seat_claim_invite_id', '', true);

  RETURN v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_company_invite_membership(
  UUID, UUID, UUID, public.company_role, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_company_invite_membership(
  UUID, UUID, UUID, public.company_role, TEXT
) TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_company_invite_membership(
  UUID, UUID, UUID, public.company_role, TEXT
) TO authenticated;

COMMENT ON FUNCTION public.claim_company_invite_membership IS
  'Aceite atômico de convite: lock company, seat check, membership active, invite accepted.';
