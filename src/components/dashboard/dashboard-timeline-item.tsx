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
      className={cn(
        "group relative flex gap-4 rounded-xl px-2.5 py-3.5",
        "transition-all duration-300 ease-out",
        "hover:bg-[var(--brand-surface)]/90",
        "hover:shadow-[0_4px_14px_rgb(11_31_58/0.05)]"
      )}
    >
      <div
        className={cn(
          "relative flex w-10 shrink-0 flex-col items-center",
          !isLast && "pb-2"
        )}
      >
        <span
          className={cn(
            "relative z-[1] flex h-10 w-10 items-center justify-center rounded-full",
            "ring-[3px] ring-card shadow-[0_1px_3px_rgb(11_31_58/0.06)]",
            "transition-transform duration-300 ease-out group-hover:scale-[1.04]",
            typeTone === "positive"
              ? "bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]"
              : "bg-[var(--brand-coral)]/15 text-[var(--brand-coral)]"
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        {!isLast ? (
          <span
            className="mt-2.5 w-px flex-1 min-h-[28px] bg-[var(--brand-navy)]/[0.1]"
            aria-hidden
          />
        ) : null}
      </div>

      <div className={cn("min-w-0 flex-1 pt-1.5", !isLast && "pb-4")}>
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 space-y-2">
            <p className="truncate text-[14px] font-bold leading-snug tracking-tight text-[var(--brand-navy)]">
              {title}
            </p>
            <p className="truncate text-[12px] leading-relaxed text-[var(--brand-navy)]/40">
              {typeLabel}
              {originLabel ? ` · ${originLabel}` : ""}
              {" · "}
              {meta}
            </p>
          </div>
          <p
            className={cn(
              "shrink-0 pt-0.5 text-[14px] font-extrabold tabular-nums leading-none tracking-tight",
              typeTone === "positive"
                ? "text-[var(--brand-gold)]"
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
