"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardListRowProps = {
  href: string;
  title: string;
  meta: string;
  amount: string;
  amountClassName?: string;
  /** When provided, renders a circular initials avatar (Últimas vendas). */
  initials?: string;
  avatarClassName?: string;
};

export function DashboardListRow({
  href,
  title,
  meta,
  amount,
  amountClassName,
  initials,
  avatarClassName,
}: DashboardListRowProps) {
  const withAvatar = Boolean(initials);

  return (
    <Link
      href={href}
      className={cn(
        "group grid min-w-0 items-center gap-x-3 rounded-xl px-2 transition-colors duration-200",
        withAvatar
          ? "grid-cols-[auto_minmax(0,1fr)_auto] gap-y-0.5 py-3 hover:bg-[#11203b]/[0.03]"
          : "grid-cols-[minmax(0,1fr)_auto] gap-y-1 py-3.5 hover:bg-[var(--brand-navy)]/[0.025]"
      )}
    >
      {withAvatar ? (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full text-[11px] font-bold tracking-wide",
            avatarClassName
          )}
          aria-hidden
        >
          {initials}
        </span>
      ) : null}

      <p
        className={cn(
          "min-w-0 truncate font-semibold text-[#11203b]",
          withAvatar ? "text-[13px]" : "text-[13.5px] text-[var(--brand-navy)]"
        )}
        title={title}
      >
        {title}
      </p>

      <p
        className={cn(
          "self-center whitespace-nowrap text-right font-bold tabular-nums tracking-tight",
          withAvatar
            ? "row-span-2 text-[13px] text-[#11203b] sm:text-[13.5px]"
            : "row-span-2 text-[13.5px] text-[var(--brand-navy)]",
          amountClassName
        )}
      >
        {amount}
      </p>

      <p
        className={cn(
          "min-w-0 truncate text-[12px]",
          withAvatar
            ? "col-start-2 text-[#11203b]/45"
            : "text-muted-foreground"
        )}
      >
        {meta}
      </p>
    </Link>
  );
}
