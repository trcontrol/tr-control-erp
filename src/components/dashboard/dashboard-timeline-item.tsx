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
      className="group relative flex gap-4 rounded-xl px-1.5 py-3 transition-colors duration-200 hover:bg-[var(--brand-navy)]/[0.025]"
    >
      <div
        className={cn(
          "relative flex w-9 shrink-0 flex-col items-center",
          !isLast && "pb-2"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full ring-[3px] ring-card transition-transform duration-200 group-hover:scale-105",
            typeTone === "positive"
              ? "bg-emerald-600/12 text-emerald-700"
              : "bg-[var(--brand-coral)]/15 text-[var(--brand-coral)]"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
        {!isLast ? (
          <span
            className="mt-2.5 w-px flex-1 min-h-[22px] bg-[var(--brand-navy)]/[0.08]"
            aria-hidden
          />
        ) : null}
      </div>

      <div className={cn("min-w-0 flex-1 pt-1", !isLast && "pb-3.5")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <p className="truncate text-[13.5px] font-semibold leading-snug text-[var(--brand-navy)]">
              {title}
            </p>
            <p className="truncate text-[12px] leading-relaxed text-muted-foreground">
              {typeLabel}
              {originLabel ? ` · ${originLabel}` : ""}
              {" · "}
              {meta}
            </p>
          </div>
          <p
            className={cn(
              "shrink-0 pt-0.5 text-[13.5px] font-bold tabular-nums leading-none",
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
