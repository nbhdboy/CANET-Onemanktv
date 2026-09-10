import type { ReactNode } from "react";
import { heroByAge, type HeroAge } from "@/lib/constants";

/** 共用玻璃表單欄位 class */
export const glassFieldClass =
  "compose-glass-field w-full rounded-2xl border-0 px-4 h-12 text-[#1a1040] outline-none placeholder:text-[#6b6280]";

export const glassTextareaClass =
  "compose-glass-field w-full rounded-2xl border-0 p-4 text-[#1a1040] outline-none placeholder:text-[#6b6280]";

export function glassCtaStyle(accent: string, accentSoft: string, ctaFrom?: string) {
  const from = ctaFrom || accent;
  return {
    background: `linear-gradient(110deg, ${accentSoft} 0%, ${accent} 48%, ${from} 100%)`,
    boxShadow: `0 14px 36px ${accent}66`,
  } as const;
}

export function GlassFormShell({
  ageBand,
  watermark,
  kicker,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-md",
}: {
  ageBand: HeroAge;
  watermark?: string;
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
}) {
  const hero = heroByAge(ageBand);
  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-12 text-white"
      style={{ backgroundColor: hero.bg }}
    >
      <div className="grain pointer-events-none absolute inset-0 opacity-35" />
      {watermark ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-4 right-0 select-none uppercase opacity-[0.12]"
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: "clamp(80px, 18vw, 180px)",
            letterSpacing: "-0.06em",
            lineHeight: 0.8,
          }}
        >
          {watermark}
        </div>
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-20 h-56 w-56 rounded-full opacity-50 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${hero.glassGlow}aa 0%, transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-8 left-[12%] h-40 w-40 rounded-full opacity-40 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${hero.glassGlowSoft}88 0%, transparent 70%)`,
        }}
      />

      <div className={`relative mx-auto w-full ${maxWidthClass}`}>
        <div className="compose-glass relative overflow-hidden rounded-[28px] p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-55 blur-xl"
            style={{
              background: `radial-gradient(circle, ${hero.glassGlow}99 0%, transparent 68%)`,
            }}
          />
          <div className="relative">
            {kicker ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                {kicker}
              </p>
            ) : null}
            <h1
              className="mt-2 text-white"
              style={{
                fontFamily: "Anton, sans-serif",
                fontSize: "clamp(32px, 7vw, 44px)",
                letterSpacing: "-0.03em",
                lineHeight: 0.95,
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 mb-6 text-sm leading-relaxed text-white/88">{subtitle}</p>
            ) : (
              <div className="mb-6" />
            )}
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

export function GlassPanel({
  accent,
  children,
  className = "",
}: {
  accent: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`compose-glass relative overflow-hidden rounded-[24px] p-5 sm:p-6 ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-50 blur-xl"
        style={{ background: `radial-gradient(circle, ${accent}88 0%, transparent 70%)` }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
