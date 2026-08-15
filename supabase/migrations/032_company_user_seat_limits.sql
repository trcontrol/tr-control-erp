-- ============================================
-- Migration: 032_company_user_seat_limits
-- Limites de usuários por plano + proteção transacional.
--
-- Essential = 1 | Professional = 3 | Premium = 7
-- used_seats = active members + pending invites não expirados
--
-- NÃO aplicar automaticamente — SQL Editor manual.
-- Não altera dados comerciais existentes.
-- ============================================

-- 1) Limite por plano
CREATE OR REPLACE FUNCTION public.plan_max_users(p_plan public.company_plan)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'essential'::public.company_plan THEN 1
    WHEN 'professional'::public.company_plan THEN 3
    WHEN 'premium'::public.company_plan THEN 7
    ELSE 1
  END;
$$;

COMMENT ON FUNCTION public.plan_max_users(public.company_plan) IS
  'Teto de seats (ativos + convites pending válidos) por plano V1.';

-- 2) Contagem de seats (opcionalmente excluindo invite/membership)
CREATE OR REPLACE FUNCTION public.company_used_seats(
  p_company_id UUID,
  p_exclude_invite_id UUID DEFAULT NULL,
  p_exclude_membership_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_active INTEGER;
  v_pending INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_active
  FROM public.company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.status = 'active'::public.member_status
    AND (p_exclude_membership_id IS NULL OR cm.id <> p_exclude_membership_id);

  SELECT COUNT(*)::INTEGER
  INTO v_pending
  FROM public.company_invites ci
  WHERE ci.company_id = p_company_id
    AND ci.status = 'pending'
    AND ci.expires_at > NOW()
    AND (p_exclude_invite_id IS NULL OR ci.id <> p_exclude_invite_id);

  RETURN COALESCE(v_active, 0) + COALESCE(v_pending, 0);
END;
$$;

COMMENT ON FUNCTION public.company_used_seats(UUID, UUID, UUID) IS
  'Seats em uso: members active + invites pending não expirados.';

-- 3) Assert com lock da company (serializa races)
CREATE OR REPLACE FUNCTION public.assert_company_seat_available(
  p_company_id UUID,
  p_exclude_invite_id UUID DEFAULT NULL,
  p_exclude_membership_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_plan public.company_plan;
  v_max INTEGER;
  v_used INTEGER;
BEGIN
  SELECT c.plan
  INTO v_plan
  FROM public.companies c
  WHERE c.id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_max := public.plan_max_users(v_plan);
  v_used := public.company_used_seats(
    p_company_id,
    p_exclude_invite_id,
    p_exclude_membership_id
  );

  IF v_used >= v_max THEN
    RAISE EXCEPTION
      'company_seat_limit_exceeded: Limite de usuários do plano atingido (% / %).',
      v_used,
      v_max
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- 4) Trigger: company_members → active consome seat
CREATE OR REPLACE FUNCTION public.enforce_company_member_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_exclude_invite UUID;
  v_claim_raw TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'active'::public.member_status THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM 'active'::public.member_status THEN
      RETURN NEW;
    END IF;
    -- Já ativo: sem novo consumo
    IF OLD.status IS NOT DISTINCT FROM 'active'::public.member_status THEN
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  v_claim_raw := NULLIF(current_setting('app.seat_claim_invite_id', true), '');
  IF v_claim_raw IS NOT NULL THEN
    BEGIN
      v_exclude_invite := v_claim_raw::UUID;
    EXCEPTION WHEN others THEN
      v_exclude_invite := NULL;
    END;
  END IF;

  PERFORM public.assert_company_seat_available(
    NEW.company_id,
    v_exclude_invite,
    CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_company_member_seats ON public.company_members;
CREATE TRIGGER trg_enforce_company_member_seats
  BEFORE INSERT OR UPDATE OF status ON public.company_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_member_seats();

-- 5) Trigger: convite pending válido reserva seat
CREATE OR REPLACE FUNCTION public.enforce_company_invite_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_was_reserving BOOLEAN := FALSE;
  v_will_reserve BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_will_reserve :=
      NEW.status = 'pending'
      AND NEW.expires_at > NOW();
  ELSIF TG_OP = 'UPDATE' THEN
    v_was_reserving :=
      OLD.status = 'pending'
      AND OLD.expires_at > NOW();
    v_will_reserve :=
      NEW.status = 'pending'
      AND NEW.expires_at > NOW();
  END IF;

  -- Já reservava e continua reservando (ex.: reenvio válido) → sem novo seat
  IF v_will_reserve AND NOT v_was_reserving THEN
    PERFORM public.assert_company_seat_available(
      NEW.company_id,
      CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_company_invite_seats ON public.company_invites;
CREATE TRIGGER trg_enforce_company_invite_seats
  BEFORE INSERT OR UPDATE OF status, expires_at ON public.company_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_invite_seats();

-- 6) Claim atômico do aceite (lock + membership + accept)
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
      COALESCE(NULLIF(btrim(p_access_profile), ''), 'professional')
    )
    RETURNING id INTO v_membership_id;
  ELSE
    UPDATE public.company_members
    SET
      role = v_role,
      status = 'active'::public.member_status,
      access_profile = COALESCE(NULLIF(btrim(p_access_profile), ''), access_profile)
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

-- 7) Downgrade bloqueado se used_seats > max do plano destino
CREATE OR REPLACE FUNCTION public.update_company_plan_status(
  p_company_id UUID,
  p_plan public.company_plan,
  p_status public.company_status
)
RETURNS TABLE (
  company_id UUID,
  plan public.company_plan,
  status public.company_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_plan public.company_plan;
  v_old_rank INTEGER;
  v_new_rank INTEGER;
  v_used INTEGER;
  v_max INTEGER;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_platform_admin' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id_required';
  END IF;

  IF p_plan IS NULL THEN
    RAISE EXCEPTION 'company_plan_required';
  END IF;

  IF p_status IS NULL THEN
    RAISE EXCEPTION 'company_status_required';
  END IF;

  SELECT c.plan INTO v_old_plan
  FROM public.companies c
  WHERE c.id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_old_rank := CASE v_old_plan
    WHEN 'essential'::public.company_plan THEN 1
    WHEN 'professional'::public.company_plan THEN 2
    WHEN 'premium'::public.company_plan THEN 3
    ELSE 1
  END;
  v_new_rank := CASE p_plan
    WHEN 'essential'::public.company_plan THEN 1
    WHEN 'professional'::public.company_plan THEN 2
    WHEN 'premium'::public.company_plan THEN 3
    ELSE 1
  END;

  IF v_new_rank < v_old_rank THEN
    v_used := public.company_used_seats(p_company_id, NULL, NULL);
    v_max := public.plan_max_users(p_plan);
    IF v_used > v_max THEN
      RAISE EXCEPTION
        'company_plan_downgrade_seat_limit: Não é possível concluir o downgrade. O plano destino permite até % usuários e a empresa possui % acessos em uso (ativos + convites pendentes).',
        v_max,
        v_used
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN QUERY
  UPDATE public.companies AS c
  SET
    plan = p_plan,
    status = p_status,
    updated_at = NOW()
  WHERE c.id = p_company_id
  RETURNING c.id, c.plan, c.status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_company_plan_status(
  UUID,
  public.company_plan,
  public.company_status
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_company_plan_status(
  UUID,
  public.company_plan,
  public.company_status
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_company_plan_status(
  UUID,
  public.company_plan,
  public.company_status
) TO service_role;

COMMENT ON FUNCTION public.update_company_plan_status IS
  'Super Admin: atualiza plan/status. Bloqueia downgrade se used_seats > max do destino.';
