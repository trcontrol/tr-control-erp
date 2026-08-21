-- TR Control ERP — 036_sale_installments_schema
-- Fase 1: schema para vendas parceladas + metadados de parcela no ledger.
-- Idempotente. NÃO altera confirm_sale / cancel_sale / UI.
--
-- Decisões:
--   - sale_payment_schedules = plano de pagamento somente no draft (NÃO é ledger).
--   - financial_entries continua como única fonte do Financeiro / Fluxo de Caixa.
--   - payment_condition em sales: cash | installment (sem installment_count redundante).
--   - Legado: payment_condition default cash; installment_* NULL nos títulos existentes.
--   - financial_entry_id permanece (compatibilidade); não removido.

-- ============================================
-- 1) sales.payment_condition
-- ============================================
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_condition TEXT;

UPDATE public.sales
SET payment_condition = 'cash'
WHERE payment_condition IS NULL;

ALTER TABLE public.sales
  ALTER COLUMN payment_condition SET DEFAULT 'cash';

ALTER TABLE public.sales
  ALTER COLUMN payment_condition SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_payment_condition_check'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_payment_condition_check
      CHECK (payment_condition IN ('cash', 'installment'));
  END IF;
END $$;

COMMENT ON COLUMN public.sales.payment_condition IS
  'Condição de pagamento: cash (à vista) | installment (parcelado). Independente de payment_method.';

-- ============================================
-- 2) financial_entries — metadados de parcela
-- ============================================
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS installment_number INTEGER,
  ADD COLUMN IF NOT EXISTS installment_count INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'financial_entries_installment_pair_check'
  ) THEN
    ALTER TABLE public.financial_entries
      ADD CONSTRAINT financial_entries_installment_pair_check
      CHECK (
        (installment_number IS NULL AND installment_count IS NULL)
        OR (
          installment_number IS NOT NULL
          AND installment_count IS NOT NULL
          AND installment_number >= 1
          AND installment_count >= 1
          AND installment_number <= installment_count
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.financial_entries.installment_number IS
  'Número da parcela (1-based). NULL = título único legado / sem parcelamento.';
COMMENT ON COLUMN public.financial_entries.installment_count IS
  'Total de parcelas do título. NULL = título único legado / sem parcelamento.';

-- Impede duas parcelas com o mesmo número para a mesma venda no ledger.
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_entries_sale_installment_unique
  ON public.financial_entries (company_id, source_id, installment_number)
  WHERE source_type = 'sale'
    AND source_id IS NOT NULL
    AND installment_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_sale_source_installments
  ON public.financial_entries (company_id, source_type, source_id)
  WHERE source_type = 'sale';

-- ============================================
-- 3) sale_payment_schedules — plano draft (não ledger)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sale_payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  installment_count INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sale_payment_schedules_installment_number_check
    CHECK (installment_number >= 1),
  CONSTRAINT sale_payment_schedules_installment_count_check
    CHECK (installment_count >= 1),
  CONSTRAINT sale_payment_schedules_installment_range_check
    CHECK (installment_number <= installment_count),
  CONSTRAINT sale_payment_schedules_amount_check
    CHECK (amount >= 0)
);

-- Colunas para ambientes onde a tabela já existia parcialmente
ALTER TABLE public.sale_payment_schedules
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS installment_number INTEGER,
  ADD COLUMN IF NOT EXISTS installment_count INTEGER,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sale_payment_schedules_installment_number_check'
  ) THEN
    ALTER TABLE public.sale_payment_schedules
      ADD CONSTRAINT sale_payment_schedules_installment_number_check
      CHECK (installment_number >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sale_payment_schedules_installment_count_check'
  ) THEN
    ALTER TABLE public.sale_payment_schedules
      ADD CONSTRAINT sale_payment_schedules_installment_count_check
      CHECK (installment_count >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sale_payment_schedules_installment_range_check'
  ) THEN
    ALTER TABLE public.sale_payment_schedules
      ADD CONSTRAINT sale_payment_schedules_installment_range_check
      CHECK (installment_number <= installment_count);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sale_payment_schedules_amount_check'
  ) THEN
    ALTER TABLE public.sale_payment_schedules
      ADD CONSTRAINT sale_payment_schedules_amount_check
      CHECK (amount >= 0);
  END IF;
END $$;

COMMENT ON TABLE public.sale_payment_schedules IS
  'Plano de pagamento da venda em draft. NÃO é ledger financeiro; não entra no Fluxo de Caixa.';
COMMENT ON COLUMN public.sale_payment_schedules.payment_method IS
  'Forma de pagamento desta parcela (pode diferir da forma principal da venda).';
COMMENT ON COLUMN public.sale_payment_schedules.amount IS
  'Valor planejado da parcela. Soma vs total da venda é validada na confirmação (Fase 2).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sale_payment_schedules_sale_number_unique
  ON public.sale_payment_schedules (sale_id, installment_number);

CREATE INDEX IF NOT EXISTS idx_sale_payment_schedules_company_id
  ON public.sale_payment_schedules (company_id);

CREATE INDEX IF NOT EXISTS idx_sale_payment_schedules_company_sale
  ON public.sale_payment_schedules (company_id, sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_payment_schedules_due_date
  ON public.sale_payment_schedules (company_id, due_date);

DROP TRIGGER IF EXISTS set_sale_payment_schedules_updated_at
  ON public.sale_payment_schedules;
CREATE TRIGGER set_sale_payment_schedules_updated_at
  BEFORE UPDATE ON public.sale_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 4) Validação: schedules só em draft + company alinhada à venda
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_sale_payment_schedules_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
  v_status TEXT;
  v_company_id UUID;
BEGIN
  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

  SELECT status, company_id
  INTO v_status, v_company_id
  FROM public.sales
  WHERE id = v_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada para o plano de pagamento.';
  END IF;

  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION
      'O plano de pagamento só pode ser incluído, alterado ou removido em vendas em rascunho.';
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.company_id IS DISTINCT FROM v_company_id THEN
      RAISE EXCEPTION
        'company_id do plano de pagamento deve coincidir com a empresa da venda.';
    END IF;

    IF NEW.installment_number IS NULL OR NEW.installment_number < 1 THEN
      RAISE EXCEPTION 'O número da parcela deve ser maior ou igual a 1.';
    END IF;

    IF NEW.installment_count IS NULL OR NEW.installment_count < 1 THEN
      RAISE EXCEPTION 'O total de parcelas deve ser maior ou igual a 1.';
    END IF;

    IF NEW.installment_number > NEW.installment_count THEN
      RAISE EXCEPTION 'O número da parcela não pode exceder o total de parcelas.';
    END IF;

    IF NEW.amount IS NULL OR NEW.amount < 0 THEN
      RAISE EXCEPTION 'O valor da parcela não pode ser negativo.';
    END IF;

    IF NEW.due_date IS NULL THEN
      RAISE EXCEPTION 'A data de vencimento da parcela é obrigatória.';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.trg_sale_payment_schedules_validate() IS
  'Garante plano de pagamento apenas em draft e company_id alinhado à venda.';

DROP TRIGGER IF EXISTS trg_sale_payment_schedules_validate
  ON public.sale_payment_schedules;
CREATE TRIGGER trg_sale_payment_schedules_validate
  BEFORE INSERT OR UPDATE OR DELETE ON public.sale_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sale_payment_schedules_validate();

-- ============================================
-- 5) RLS — isolamento por tenant (mesmo padrão de sale_items)
-- ============================================
ALTER TABLE public.sale_payment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company sale payment schedules"
  ON public.sale_payment_schedules;
DROP POLICY IF EXISTS "Members can insert company sale payment schedules"
  ON public.sale_payment_schedules;
DROP POLICY IF EXISTS "Members can update company sale payment schedules"
  ON public.sale_payment_schedules;
DROP POLICY IF EXISTS "Members can delete company sale payment schedules"
  ON public.sale_payment_schedules;

CREATE POLICY "Members can view company sale payment schedules"
  ON public.sale_payment_schedules FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Members can insert company sale payment schedules"
  ON public.sale_payment_schedules FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can update company sale payment schedules"
  ON public.sale_payment_schedules FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Members can delete company sale payment schedules"
  ON public.sale_payment_schedules FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));
