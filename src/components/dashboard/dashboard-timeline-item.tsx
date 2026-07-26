"use client";

import Link from "next/link";
import { DashboardStatusBadge } from "@/components/dashboard/dashboard-status-badge";
import { cn } from "@/lib/utils";

type DashboardTimelineItemProps = {
  href: string;
  title: string;
  meta: string;
  amount: string;
  typeLabel: string;
  typeTone?: "positive" | "negative";
  originLabel?: string;
  isLast?: boolean;
};

export function DashboardTimelineItem({
  href,
  title,
  meta,
  amount,
  typeLabel,
  typeTone = "positive",
  originLabel,
  isLast = false,
}: DashboardTimelineItemProps) {
  return (
    <Link href={href} className="group relative flex gap-3 pb-4 last:pb-0">
      <div className="relative flex w-3 shrink-0 flex-col items-center">
        <span
          className={cn(
            "mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card",
            typeTone === "positive" ? "bg-emerald-600" : "bg-[var(--brand-coral)]"
          )}
        />
        {!isLast ? (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 rounded-lg border border-transparent px-1 py-0.5 transition-colors group-hover:border-[var(--brand-navy)]/10 group-hover:bg-[var(--brand-navy)]/[0.02]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <DashboardStatusBadge
                label={typeLabel}
                tone={typeTone === "positive" ? "positive" : "negative"}
              />
              {originLabel ? (
                <span className="text-[11px] text-muted-foreground">
                  {originLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm font-medium text-[var(--brand-navy)]">
              {title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
          </div>
          <p
            className={cn(
              "shrink-0 text-sm font-semibold",
              typeTone === "positive"
                ? "text-emerald-700"
                : "text-[var(--brand-coral)]"
            )}
          >
            {amount}
          </p>
        </div>
      </div>
    </Link>
  );
}
