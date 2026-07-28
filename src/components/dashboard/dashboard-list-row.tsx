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
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-xl px-2 py-3.5 transition-colors duration-200 hover:bg-[var(--brand-navy)]/[0.025]"
    >
      <p className="truncate text-[13.5px] font-semibold text-[var(--brand-navy)]">
        {title}
      </p>
      <p
        className={cn(
          "row-span-2 self-center text-right text-[13.5px] font-bold tabular-nums text-[var(--brand-navy)]",
          amountClassName
        )}
      >
        {amount}
      </p>
      <p className="truncate text-[12px] text-muted-foreground">{meta}</p>
    </Link>
  );
}
