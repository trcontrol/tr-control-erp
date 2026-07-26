"use client";

import { cn } from "@/lib/utils";

const MIN_POINTS = 2;

type DashboardSparklineProps = {
  values: number[];
  className?: string;
  stroke?: string;
};

export function DashboardSparkline({
  values,
  className,
  stroke = "var(--brand-navy)",
}: DashboardSparklineProps) {
  const usable = values.filter((value) => Number.isFinite(value));

  if (usable.length < MIN_POINTS) {
    return (
      <div
        className={cn(
          "flex h-8 w-full items-end",
          className
        )}
        aria-hidden
      >
        <div className="h-px w-full bg-border" />
      </div>
    );
  }

  const width = 96;
  const height = 28;
  const padding = 2;
  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const span = max - min || 1;

  const points = usable
    .map((value, index) => {
      const x =
        padding +
        (index / (usable.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((value - min) / span) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-8 w-full", className)}
      preserveAspectRatio="none"
      role="img"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
