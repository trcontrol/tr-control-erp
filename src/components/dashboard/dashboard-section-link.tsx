"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardSectionLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function DashboardSectionLink({
  href,
  children,
  className,
}: DashboardSectionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-coral)]",
        "transition-colors duration-200 hover:text-[var(--brand-navy)]",
        className
      )}
    >
      {children}
    </Link>
  );
}
