"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OPPORTUNITY_STAGE_OPTIONS } from "@/lib/constants";
import type { CompanyMemberOption } from "@/lib/tasks/actions";

export type FunnelFiltersState = {
  search: string;
  stage: string;
  assignedUserId: string;
  status: string;
  periodFrom: string;
  periodTo: string;
};

type FunnelFiltersProps = {
  filters: FunnelFiltersState;
  members: CompanyMemberOption[];
  onChange: <K extends keyof FunnelFiltersState>(
    key: K,
    value: FunnelFiltersState[K]
  ) => void;
};

export function FunnelFilters({
  filters,
  members,
  onChange,
}: FunnelFiltersProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--brand-navy)]/8 bg-white p-4 shadow-[var(--shadow-soft)] md:grid-cols-2 xl:grid-cols-6">
      <div className="space-y-1.5 xl:col-span-2">
        <Label htmlFor="funnel-search">Buscar</Label>
        <Input
          id="funnel-search"
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder="Título ou observações"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="funnel-assigned">Responsável</Label>
        <Select
          id="funnel-assigned"
          value={filters.assignedUserId}
          onChange={(event) => onChange("assignedUserId", event.target.value)}
        >
          <option value="all">Todos</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.full_name || "Usuário sem nome"}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="funnel-stage">Etapa</Label>
        <Select
          id="funnel-stage"
          value={filters.stage}
          onChange={(event) => onChange("stage", event.target.value)}
        >
          <option value="all">Todas</option>
          {OPPORTUNITY_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="funnel-period-from">Próx. ação de</Label>
        <Input
          id="funnel-period-from"
          type="date"
          value={filters.periodFrom}
          onChange={(event) => onChange("periodFrom", event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="funnel-period-to">Próx. ação até</Label>
        <Input
          id="funnel-period-to"
          type="date"
          value={filters.periodTo}
          onChange={(event) => onChange("periodTo", event.target.value)}
        />
      </div>

      <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
        <Label htmlFor="funnel-status">Status</Label>
        <Select
          id="funnel-status"
          value={filters.status}
          onChange={(event) => onChange("status", event.target.value)}
        >
          <option value="active">Somente ativos</option>
          <option value="inactive">Somente inativos</option>
          <option value="all">Todos</option>
        </Select>
      </div>
    </div>
  );
}
