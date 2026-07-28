"use client";

import { cn } from "@/lib/utils";

type DashboardSectionCardProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
  elevation?: "primary" | "secondary";
};

export function DashboardSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  style,
  elevation = "primary",
}: DashboardSectionCardProps) {
  return (
    <section
      style={style}
      className={cn(
        "flex h-full flex-col rounded-[18px] bg-card",
        elevation === "primary"
          ? "dash-surface-primary"
          : "dash-surface-secondary",
        "transition-shadow duration-300 ease-out hover:shadow-card-hover",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--brand-navy)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn("flex-1 px-5 pb-5 sm:px-6 sm:pb-6", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
