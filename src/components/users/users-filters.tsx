"use client";

import { Select } from "@/components/ui/select";
import { UsersSearchField } from "@/components/users/users-search-field";
import type { CompanyRole } from "@/lib/constants";
import {
  USER_ROLE_FILTER_OPTIONS,
  USER_SORT_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
  type UserSortOption,
  type UserStatus,
} from "@/lib/users/format";

type UsersFiltersProps = {
  search: string;
  role: CompanyRole | "all";
  status: UserStatus | "all";
  sort: UserSortOption;
  totalFiltered: number;
  totalUsers: number;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: CompanyRole | "all") => void;
  onStatusChange: (value: UserStatus | "all") => void;
  onSortChange: (value: UserSortOption) => void;
};

export function UsersFilters({
  search,
  role,
  status,
  sort,
  totalFiltered,
  totalUsers,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onSortChange,
}: UsersFiltersProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--brand-navy)]/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <UsersSearchField value={search} onChange={onSearchChange} />

        <p className="text-sm text-muted-foreground lg:text-right">
          Exibindo{" "}
          <span className="font-semibold text-[var(--brand-navy)]">
            {totalFiltered}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-[var(--brand-navy)]">
            {totalUsers}
          </span>{" "}
          {totalUsers === 1 ? "usuário" : "usuários"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Select
          value={role}
          onChange={(event) =>
            onRoleChange(event.target.value as CompanyRole | "all")
          }
          aria-label="Filtrar por cargo"
        >
          {USER_ROLE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as UserStatus | "all")
          }
          aria-label="Filtrar por status"
        >
          {USER_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div className="sm:col-span-2 xl:col-span-1">
          <Select
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as UserSortOption)
            }
            aria-label="Ordenar usuários"
          >
            {USER_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
