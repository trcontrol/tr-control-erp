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
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 py-3 transition-colors duration-200 hover:bg-[var(--brand-navy)]/[0.02]"
    >
      <p className="truncate text-sm font-semibold text-[var(--brand-navy)]">
        {title}
      </p>
      <p
        className={cn(
          "row-span-2 self-center text-right text-sm font-bold tabular-nums text-[var(--brand-navy)]",
          amountClassName
        )}
      >
        {amount}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
    </Link>
  );
}
