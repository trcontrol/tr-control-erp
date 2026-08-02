"use client";

import { cn } from "@/lib/utils";

type DashboardSectionCardProps = {
  title: string;
  description?: string;
  titleIcon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  style?: React.CSSProperties;
  elevation?: "primary" | "secondary";
};

export function DashboardSectionCard({
  title,
  description,
  titleIcon,
  action,
  children,
  className,
  contentClassName,
  headerClassName,
  titleClassName,
  style,
  elevation = "primary",
}: DashboardSectionCardProps) {
  return (
    <section
      style={style}
      className={cn(
        "flex h-full min-w-0 flex-col rounded-[18px] bg-card",
        elevation === "primary"
          ? "dash-surface-primary"
          : "dash-surface-secondary",
        "transition-shadow duration-300 ease-out hover:shadow-card-hover",
        className
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2 px-4 pb-2.5 pt-4 sm:gap-x-3 sm:px-6 sm:pb-3 sm:pt-6",
          headerClassName
        )}
      >
        <div className="min-w-0 flex-1 basis-[10rem] sm:basis-[12rem]">
          <div className="flex min-w-0 items-center gap-2">
            {titleIcon ? (
              <span className="inline-flex shrink-0 items-center justify-center">
                {titleIcon}
              </span>
            ) : null}
            <h2
              className={cn(
                "truncate text-left text-[14.5px] font-semibold tracking-tight text-[var(--brand-navy)] sm:text-[15px]",
                titleClassName
              )}
            >
              {title}
            </h2>
          </div>
          {description ? (
            <p className="mt-1 text-left text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end">
            {action}
          </div>
        ) : null}
      </header>
      <div
        className={cn(
          "min-w-0 flex-1 px-4 pb-4 sm:px-6 sm:pb-6",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
