"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const MIN_POINTS = 2;

type DashboardSparklineProps = {
  values: number[];
  className?: string;
  stroke?: string;
  fillOpacity?: number;
};

export function DashboardSparkline({
  values,
  className,
  stroke = "var(--brand-navy)",
  fillOpacity = 0.12,
}: DashboardSparklineProps) {
  const gradientId = useId().replace(/:/g, "");
  const usable = values.filter((value) => Number.isFinite(value));

  if (usable.length < MIN_POINTS) {
    return (
      <div className={cn("flex h-9 w-full items-end", className)} aria-hidden>
        <div className="h-px w-full bg-[var(--brand-navy)]/10" />
      </div>
    );
  }

  const width = 120;
  const height = 32;
  const padding = 2;
  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const span = max - min || 1;

  const coords = usable.map((value, index) => {
    const x =
      padding + (index / (usable.length - 1)) * (width - padding * 2);
    const y =
      height - padding - ((value - min) / span) * (height - padding * 2);
    return { x, y };
  });

  const points = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = [
    `${coords[0].x},${height}`,
    ...coords.map(({ x, y }) => `${x},${y}`),
    `${coords[coords.length - 1].x},${height}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-9 w-full", className)}
      preserveAspectRatio="none"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
