"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FunnelColumn } from "@/components/funnel/funnel-column";
import {
  FunnelFilters,
  type FunnelFiltersState,
} from "@/components/funnel/funnel-filters";
import {
  OPPORTUNITY_STAGE_OPTIONS,
  OPPORTUNITY_STATUS,
  ROUTES,
} from "@/lib/constants";
import {
  listOpportunities,
  summarizeOpportunitiesByStage,
  updateOpportunityStage,
  type OpportunityWithRelations,
} from "@/lib/funnel/actions";
import { formatOpportunityCurrency } from "@/lib/funnel/format";
import {
  listCompanyMemberOptions,
  type CompanyMemberOption,
} from "@/lib/tasks/actions";
import { useTenant } from "@/providers/tenant-provider";

const INITIAL_FILTERS: FunnelFiltersState = {
  search: "",
  stage: "all",
  assignedUserId: "all",
  status: OPPORTUNITY_STATUS.active,
  periodFrom: "",
  periodTo: "",
};

export function FunnelBoard() {
  const { company } = useTenant();
  const [opportunities, setOpportunities] = useState<
    OpportunityWithRelations[]
  >([]);
  const [filters, setFilters] = useState<FunnelFiltersState>(INITIAL_FILTERS);
  const [members, setMembers] = useState<CompanyMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageLoadingId, setStageLoadingId] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = useState<string>(
    OPPORTUNITY_STAGE_OPTIONS[0].value
  );

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      if (!company?.id) {
        setMembers([]);
        return;
      }

      const result = await listCompanyMemberOptions(company.id);
      if (!active) return;
      if (result.data) {
        setMembers(result.data);
      }
    }

    void loadMembers();

    return () => {
      active = false;
    };
  }, [company?.id]);

  const loadOpportunities = useCallback(async () => {
    if (!company?.id) {
      setOpportunities([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar o funil.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listOpportunities({
      companyId: company.id,
      search: filters.search,
      stage: filters.stage,
      assignedUserId: filters.assignedUserId,
      status: filters.status,
      periodFrom: filters.periodFrom || undefined,
      periodTo: filters.periodTo || undefined,
    });

    if (result.error) {
      setOpportunities([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setOpportunities(result.data);
    setLoading(false);
  }, [company?.id, filters]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadOpportunities();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadOpportunities]);

  useEffect(() => {
    if (
      filters.stage !== "all" &&
      OPPORTUNITY_STAGE_OPTIONS.some((item) => item.value === filters.stage)
    ) {
      setMobileStage(filters.stage);
    }
  }, [filters.stage]);

  const summaries = useMemo(
    () => summarizeOpportunitiesByStage(opportunities),
    [opportunities]
  );

  const summaryMap = useMemo(() => {
    return new Map(summaries.map((item) => [item.stage, item]));
  }, [summaries]);

  const totalCount = opportunities.length;
  const totalValue = opportunities.reduce(
    (sum, item) => sum + Number(item.estimated_value || 0),
    0
  );

  function updateFilter<K extends keyof FunnelFiltersState>(
    key: K,
    value: FunnelFiltersState[K]
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function handleStageChange(opportunityId: string, stage: string) {
    if (!company?.id) return;

    const current = opportunities.find((item) => item.id === opportunityId);
    if (!current || current.stage === stage) return;

    setStageLoadingId(opportunityId);
    setError(null);

    const previous = opportunities;
    setOpportunities((items) =>
      items.map((item) =>
        item.id === opportunityId ? { ...item, stage } : item
      )
    );

    const result = await updateOpportunityStage(
      company.id,
      opportunityId,
      stage
    );

    if (result.error || !result.data) {
      setOpportunities(previous);
      setError(result.error?.message ?? "Não foi possível alterar a etapa.");
      setStageLoadingId(null);
      return;
    }

    setOpportunities((items) =>
      items.map((item) => (item.id === opportunityId ? result.data! : item))
    );
    setStageLoadingId(null);
  }

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione uma empresa no topo da página para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={ROUTES.companies}>Ir para Empresas</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const visibleStages =
    filters.stage === "all"
      ? OPPORTUNITY_STAGE_OPTIONS
      : OPPORTUNITY_STAGE_OPTIONS.filter(
          (option) => option.value === filters.stage
        );

  const mobileOpportunities = opportunities.filter(
    (item) => item.stage === mobileStage
  );
  const mobileSummary = summaryMap.get(mobileStage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-navy)]/8 px-3 py-1 font-medium text-[var(--brand-navy)]">
            <Filter className="h-3.5 w-3.5" />
            {totalCount} oportunidade{totalCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-gold)]/15 px-3 py-1 font-medium text-[var(--brand-navy)]">
            {formatOpportunityCurrency(totalValue)}
          </span>
        </div>
        <Button asChild>
          <Link href={ROUTES.funnelNew}>
            <Plus className="h-4 w-4" />
            Nova oportunidade
          </Link>
        </Button>
      </div>

      <FunnelFilters
        filters={filters}
        members={members}
        onChange={updateFilter}
      />

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando funil...
        </div>
      ) : opportunities.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-[var(--brand-coral)]" />
              Nenhuma oportunidade encontrada
            </CardTitle>
            <CardDescription>
              Ajuste os filtros ou cadastre uma nova oportunidade para a empresa
              ativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={ROUTES.funnelNew}>
                <Plus className="h-4 w-4" />
                Nova oportunidade
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleStages.map((option) => {
                const summary = summaryMap.get(option.value);
                const active = mobileStage === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMobileStage(option.value)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-[var(--brand-navy)] text-white"
                        : "bg-white text-[var(--brand-navy)] ring-1 ring-[var(--brand-navy)]/10"
                    }`}
                  >
                    {option.label}
                    <span className="ml-1 opacity-80">
                      ({summary?.count ?? 0})
                    </span>
                  </button>
                );
              })}
            </div>

            <FunnelColumn
              stage={mobileStage}
              opportunities={mobileOpportunities}
              totalValue={mobileSummary?.totalValue ?? 0}
              onStageChange={handleStageChange}
              stageLoadingId={stageLoadingId}
            />
          </div>

          <div className="hidden gap-3 overflow-x-auto pb-2 lg:flex lg:items-stretch">
            {visibleStages.map((option) => {
              const stageItems = opportunities.filter(
                (item) => item.stage === option.value
              );
              const summary = summaryMap.get(option.value);
              return (
                <FunnelColumn
                  key={option.value}
                  stage={option.value}
                  opportunities={stageItems}
                  totalValue={summary?.totalValue ?? 0}
                  onStageChange={handleStageChange}
                  stageLoadingId={stageLoadingId}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
