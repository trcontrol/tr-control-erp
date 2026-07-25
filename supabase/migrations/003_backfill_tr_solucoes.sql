-- TR Control ERP — Backfill usuário existente → empresa + membership
-- Migration: 003_backfill_tr_solucoes
--
-- Idempotente: pode ser executado mais de uma vez sem duplicar registros.
-- Pré-requisito: migrations 001 e 002 já aplicadas.

DO $$
DECLARE
  target_email CONSTANT TEXT := 'trsolucoes.gestao@gmail.com';
  company_name CONSTANT TEXT := 'TR Soluções';
  company_slug CONSTANT TEXT := 'tr-solucoes';
  target_user_id UUID;
  target_company_id UUID;
  target_full_name TEXT;
BEGIN
  -- 1) Localizar usuário no Auth pelo e-mail
  SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
  INTO target_user_id, target_full_name
  FROM auth.users AS u
  WHERE lower(u.email) = lower(target_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION
      'Backfill abortado: usuário não encontrado em auth.users com e-mail %',
      target_email;
  END IF;

  -- 2) Garantir profile (company_members.user_id referencia profiles.id)
  INSERT INTO public.profiles (id, full_name)
  VALUES (target_user_id, target_full_name)
  ON CONFLICT (id) DO NOTHING;

  -- 3) Garantir empresa pelo slug único (não duplica se já existir)
  SELECT c.id
  INTO target_company_id
  FROM public.companies AS c
  WHERE c.slug = company_slug
  LIMIT 1;

  IF target_company_id IS NULL THEN
    INSERT INTO public.companies (name, slug, plan, country, email)
    VALUES (company_name, company_slug, 'free', 'Brasil', target_email)
    RETURNING id INTO target_company_id;
  END IF;

  -- 4) Garantir vínculo como owner (UNIQUE company_id + user_id)
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (target_company_id, target_user_id, 'owner')
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET role = EXCLUDED.role
  WHERE public.company_members.role IS DISTINCT FROM EXCLUDED.role;

  RAISE NOTICE
    'Backfill OK: user_id=%, company_id=%, slug=%, role=owner',
    target_user_id,
    target_company_id,
    company_slug;
END $$;
