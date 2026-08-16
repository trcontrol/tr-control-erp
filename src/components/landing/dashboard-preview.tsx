import Image from "next/image";

/** Cache-busting filename — filled commercial Dashboard mock (Olá, Maicon!). */
export const DASHBOARD_HERO_PREVIEW_SRC =
  "/brand/dashboard-hero-preview.png" as const;

/** Intrinsic size of public/brand/dashboard-hero-preview.png */
const PREVIEW_WIDTH = 1024;
const PREVIEW_HEIGHT = 682;

/**
 * Commercial Dashboard preview for the Landing Hero.
 * Asset already includes browser chrome — do not wrap in a second frame.
 */
export function DashboardPreview() {
  return (
    <div
      className="relative w-full min-w-0 lg:justify-self-stretch"
      aria-label="Pré-visualização do Dashboard do TR Control ERP"
    >
      <div
        className="pointer-events-none absolute -inset-2 rounded-2xl bg-[var(--brand-gold)]/12 blur-2xl sm:-inset-3"
        aria-hidden
      />
      {/*
        Intrinsic width/height avoids letterboxing from object-contain+fill.
        Image fills the right Hero column edge-to-edge.
      */}
      <Image
        src={DASHBOARD_HERO_PREVIEW_SRC}
        alt="Demonstração visual do Dashboard do TR Control ERP"
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        priority
        sizes="(max-width: 1024px) 100vw, 52vw"
        className="relative h-auto w-full max-w-none rounded-md shadow-[0_20px_50px_rgb(0_0_0/40%)] ring-1 ring-white/10"
      />
    </div>
  );
}
