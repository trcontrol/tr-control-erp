"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardListRowProps = {
  href: string;
  title: string;
  meta: string;
  amount: string;
  amountClassName?: string;
};

export function DashboardListRow({
  href,
  title,
  meta,
  amount,
  amountClassName,
}: DashboardListRowProps) {
  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--brand-navy)]/8 px-3 py-2.5 transition-colors hover:bg-[var(--brand-navy)]/[0.03]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--brand-navy)]">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
      </div>
      <p
        className={cn(
          "shrink-0 text-sm font-semibold text-[var(--brand-navy)]",
          amountClassName
        )}
      >
        {amount}
      </p>
    </Link>
  );
}
