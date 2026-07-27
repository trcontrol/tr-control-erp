"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
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
  const Icon = typeTone === "positive" ? ArrowUpRight : ArrowDownLeft;

  return (
    <Link
      href={href}
      className="group relative flex gap-3 rounded-xl py-1.5 pl-0.5 pr-1 transition-colors duration-200 last:pb-0 hover:bg-[var(--brand-navy)]/[0.02]"
    >
      <div
        className={cn(
          "relative flex w-8 shrink-0 flex-col items-center",
          !isLast && "pb-3.5"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-[3px] ring-card transition-transform duration-200 group-hover:scale-105",
            typeTone === "positive"
              ? "bg-emerald-600 text-white"
              : "bg-[var(--brand-coral)] text-white"
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.1} />
        </span>
        {!isLast ? (
          <span
            className="mt-1 w-px flex-1 bg-[var(--brand-navy)]/10"
            aria-hidden
          />
        ) : null}
      </div>

      <div className={cn("min-w-0 flex-1 py-0.5", !isLast && "pb-3.5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--brand-navy)]">
              {title}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {typeLabel}
              {originLabel ? ` · ${originLabel}` : ""}
              {" · "}
              {meta}
            </p>
          </div>
          <p
            className={cn(
              "shrink-0 pt-0.5 text-sm font-bold tabular-nums",
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
