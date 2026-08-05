"use client";

import {
  userRoleLabel,
  userStatusLabel,
  type UserStatus,
} from "@/lib/users/format";
import { cn } from "@/lib/utils";

export function UserRoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset",
        role === "owner" &&
          "bg-[var(--brand-navy)]/12 text-[var(--brand-navy)] ring-[var(--brand-navy)]/15",
        role === "admin" &&
          "bg-[var(--brand-coral)]/14 text-[var(--brand-coral)] ring-[var(--brand-coral)]/20",
        role === "member" &&
          "bg-[var(--brand-gold)]/15 text-[var(--brand-navy)] ring-[var(--brand-gold)]/30",
        role !== "owner" &&
          role !== "admin" &&
          role !== "member" &&
          "bg-slate-200/70 text-slate-600 ring-slate-300/60"
      )}
    >
      {userRoleLabel(role)}
    </span>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset",
        status === "active" &&
          "bg-emerald-100/80 text-emerald-700 ring-emerald-600/15",
        status === "pending" &&
          "bg-amber-100/80 text-amber-800 ring-amber-600/15",
        status === "inactive" &&
          "bg-rose-100/70 text-rose-700 ring-rose-500/15"
      )}
    >
      {userStatusLabel(status)}
    </span>
  );
}
