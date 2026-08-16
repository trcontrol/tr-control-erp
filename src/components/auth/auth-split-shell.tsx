import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type AuthShellHighlight = {
  icon: LucideIcon;
  label: string;
};

type AuthSplitShellProps = {
  /** Navy panel headline (first line; may include JSX for gold spans) */
  panelTitle: React.ReactNode;
  panelDescription: string;
  highlights: readonly AuthShellHighlight[];
  /** Top-left link on the form column */
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Visual-only split layout shared by Auth screens (Login pattern).
 * Does not contain Auth handlers or Supabase calls.
 */
export function AuthSplitShell({
  panelTitle,
  panelDescription,
  highlights,
  backHref,
  backLabel,
  children,
  className,
}: AuthSplitShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen overflow-x-hidden bg-[#f7f8fb]",
        className
      )}
    >
      <aside className="relative hidden w-[48%] flex-col justify-start overflow-hidden bg-[var(--brand-navy-deep)] px-10 py-10 text-white lg:flex xl:w-[52%] xl:px-14">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[var(--brand-gold)]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[var(--brand-coral)]/[0.07] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10">
          <Link
            href={ROUTES.home}
            className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-deep)]"
          >
            <Image
              src="/brand/logo-tr-control-erp-dark-bg.png"
              alt="TR Control ERP — Gestão que impulsiona."
              width={1024}
              height={341}
              priority
              className="h-auto w-[330px] max-w-full object-contain object-left xl:w-[360px]"
            />
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-6 pt-14">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            {panelTitle}
          </h1>
          <p className="text-base leading-relaxed text-white/70">
            {panelDescription}
          </p>
          <ul className="flex flex-col gap-3 pt-2">
            {highlights.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/10">
                  <item.icon
                    className="h-4 w-4 text-[var(--brand-gold-soft)]"
                    aria-hidden
                  />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="relative flex w-full flex-1 flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-6 lg:mb-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-navy-mid)]/70 transition-colors hover:text-[var(--brand-navy-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link
              href={ROUTES.home}
              className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
            >
              <Image
                src="/brand/logo-tr-control-erp-display.png"
                alt="TR Control ERP — Gestão que impulsiona."
                width={922}
                height={339}
                priority
                className="h-14 w-auto object-contain sm:h-16"
              />
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

type AuthFormCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthFormCard({
  title,
  description,
  children,
  footer,
}: AuthFormCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--brand-navy)]/8 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--brand-navy-deep)]">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--brand-navy-mid)]/75">
          {description}
        </p>
      </div>
      {children}
      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}

export const authInputClassName =
  "h-11 border-[var(--brand-navy)]/12 bg-[#f7f8fb] focus-visible:ring-[var(--brand-gold)]";

export const authPrimaryButtonClassName = cn(
  "h-11 w-full bg-[var(--brand-navy-deep)] text-white shadow-sm",
  "hover:bg-[var(--brand-navy-mid)]",
  "focus-visible:ring-[var(--brand-gold)]",
  "disabled:opacity-60"
);

export function AuthAlert({
  variant = "error",
  children,
}: {
  variant?: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-3.5 py-3 text-sm",
        variant === "error"
          ? "border-destructive/20 bg-destructive/8 text-destructive"
          : "border-[var(--brand-navy)]/10 bg-[var(--brand-navy)]/[0.04] text-[var(--brand-navy-deep)]"
      )}
    >
      {children}
    </div>
  );
}
