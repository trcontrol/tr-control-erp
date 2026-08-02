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
        "group relative flex min-w-0 gap-2.5 rounded-xl px-1 py-3 sm:gap-4 sm:px-2.5 sm:py-3.5",
        "transition-all duration-300 ease-out",
        "hover:bg-[var(--brand-surface)]/90",
        "hover:shadow-[0_4px_14px_rgb(11_31_58/0.05)]"
      )}
    >
      <div
        className={cn(
          "relative flex w-8 shrink-0 flex-col items-center sm:w-10",
          !isLast && "pb-2"
        )}
      >
        <span
          className={cn(
            "relative z-[1] flex h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10",
            "ring-[3px] ring-card shadow-[0_1px_3px_rgb(11_31_58/0.06)]",
            "transition-transform duration-300 ease-out group-hover:scale-[1.04]",
            typeTone === "positive"
              ? "bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]"
              : "bg-[var(--brand-coral)]/15 text-[var(--brand-coral)]"
          )}
        >
          <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
        </span>
        {!isLast ? (
          <span
            className="mt-2 w-px flex-1 min-h-[24px] bg-[var(--brand-navy)]/[0.1] sm:mt-2.5 sm:min-h-[28px]"
            aria-hidden
          />
        ) : null}
      </div>

      <div className={cn("min-w-0 flex-1 pt-1 sm:pt-1.5", !isLast && "pb-3 sm:pb-4")}>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-2.5 gap-y-1 sm:gap-x-3 sm:gap-y-1.5">
          <div className="min-w-0 flex-1 basis-[8.5rem] space-y-1.5 sm:space-y-2">
            <p className="truncate text-left text-[13px] font-bold leading-snug tracking-tight text-[var(--brand-navy)] sm:text-[14px]">
              {title}
            </p>
            <p className="truncate text-left text-[11px] leading-relaxed text-[var(--brand-navy)]/40 sm:text-[12px]">
              {typeLabel}
              {originLabel ? ` · ${originLabel}` : ""}
              {" · "}
              {meta}
            </p>
          </div>
          <p
            className={cn(
              "max-w-full shrink-0 break-words pt-0.5 text-right text-[12.5px] font-extrabold tabular-nums leading-none tracking-tight sm:text-[14px]",
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
