"use client";

import { cn } from "@/lib/utils";

type DashboardSectionCardProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DashboardSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: DashboardSectionCardProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border border-[var(--brand-navy)]/10 bg-card shadow-sm",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--brand-navy)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn("flex-1 px-4 pb-4", contentClassName)}>{children}</div>
    </section>
  );
}
