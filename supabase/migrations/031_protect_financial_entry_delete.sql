-- ============================================
-- Migration: 031_protect_financial_entry_delete
-- Impede hard-delete indevido em financial_entries.
--
-- Regras V1 (equivalentes à app em src/lib/finance/delete-guard.ts):
-- 1) source_type IN ('purchase','sale') → NUNCA DELETE via Financeiro
-- 2) status IN ('paid','received') → NUNCA DELETE
-- 3) manual (ou sem origem operacional) pending/overdue/cancelled → DELETE ok
--
-- Não altera confirm/cancel purchase|sale, ON DELETE SET NULL, RLS, Cash Flow.
-- ============================================

CREATE OR REPLACE FUNCTION public.protect_financial_entry_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_source TEXT;
BEGIN
  v_source := lower(btrim(COALESCE(OLD.source_type, '')));

  IF v_source IN ('purchase', 'sale') THEN
    RAISE EXCEPTION
      'Não é possível excluir lançamentos originados de compra ou venda. Gerencie o ciclo de vida pela operação de origem.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status IN ('paid', 'received') THEN
    RAISE EXCEPTION
      'Não é possível excluir um lançamento já pago ou recebido.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.protect_financial_entry_delete() IS
  'BEFORE DELETE: bloqueia hard-delete de títulos paid/received ou originados de purchase/sale.';

DROP TRIGGER IF EXISTS trg_protect_financial_entry_delete
  ON public.financial_entries;

CREATE TRIGGER trg_protect_financial_entry_delete
  BEFORE DELETE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_financial_entry_delete();
