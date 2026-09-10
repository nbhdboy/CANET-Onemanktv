import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { heroByAge, type HeroAge } from "@/lib/constants";
import type { ReactNode } from "react";

export function StagePage({
  ageBand,
  watermark,
  kicker,
  liveLabel,
  backHref = "/profile",
  backLabel = "回到我的",
  aside,
  children,
}: {
  ageBand: HeroAge;
  watermark: string;
  kicker: string;
  liveLabel: string;
  backHref?: string;
  backLabel?: string;
  aside: ReactNode;
  children: ReactNode;
}) {
  const hero = heroByAge(ageBand);
  return (
    <main className="relative min-h-screen text-white" style={{ backgroundColor: hero.bg }}>
      <div className="grain pointer-events-none absolute inset-0 opacity-35" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-4 right-0 select-none uppercase opacity-[0.12]"
        style={{
          fontFamily: "Anton, sans-serif",
          fontSize: "clamp(80px, 18vw, 200px)",
          letterSpacing: "-0.06em",
          lineHeight: 0.8,
        }}
      >
        {watermark}
      </div>
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">{kicker}</p>
          <Link
            href={backHref}
            aria-label={backLabel}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 text-white transition-colors hover:bg-white hover:text-[#1a1040]"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </Link>
        </div>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <aside className="compose-poster lg:sticky lg:top-24">
            <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-white/75">
              {liveLabel}
            </p>
            {aside}
          </aside>
          <div className="compose-panel space-y-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

export function StageTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      className="uppercase text-white"
      style={{
        fontFamily: "Anton, sans-serif",
        fontSize: "clamp(40px, 7vw, 76px)",
        letterSpacing: "-0.03em",
        lineHeight: 0.9,
      }}
    >
      {children}
    </h1>
  );
}

export function StageTrack({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/25 pt-5">
      <p
        className="mb-3 text-white/55"
        style={{ fontFamily: "Anton, sans-serif", fontSize: 28, letterSpacing: "0.06em", lineHeight: 1 }}
      >
        {n} <span className="ml-2 text-base font-semibold tracking-wide text-white">{title}</span>
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function StageDisc({
  emoji,
  badge,
  title,
  sub,
  from,
  to,
  imageUrl,
  imageFit = "cover",
}: {
  emoji: string;
  badge: string;
  title: string;
  sub: string;
  from: string;
  to: string;
  imageUrl?: string | null;
  imageFit?: "cover" | "contain";
}) {
  return (
    <div className="relative mx-auto flex h-[400px] max-w-[280px] items-center justify-center">
      <div
        aria-hidden
        className="absolute h-[72%] w-[72%] rounded-full"
        style={{ background: `radial-gradient(circle, ${from} 0%, transparent 70%)` }}
      />
      <div className="deck-float relative">
        <article
          className="relative flex h-[280px] w-[280px] flex-col items-center justify-center overflow-hidden rounded-full text-center text-white"
          style={{
            background: imageUrl
              ? "#12081f"
              : `linear-gradient(165deg, ${from} 0%, ${to} 62%, #12081f 100%)`,
            boxShadow: "0 22px 50px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.12)",
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className={`absolute inset-0 h-full w-full ${
                imageFit === "contain" ? "object-contain p-6" : "object-cover"
              }`}
            />
          ) : null}
          <div
            className={`relative z-10 flex h-full w-full flex-col items-center ${
              imageUrl && imageFit === "contain"
                ? "justify-end bg-gradient-to-b from-transparent via-transparent to-black/70 pb-7"
                : imageUrl
                  ? "justify-center bg-gradient-to-b from-black/35 via-black/20 to-black/55"
                  : "justify-center"
            }`}
          >
            <p className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/40 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-white/90">
              {badge}
            </p>
            {!imageUrl ? (
              <span className="text-6xl" aria-hidden>
                {emoji}
              </span>
            ) : null}
            <p
              className={`px-6 text-xl font-bold leading-tight ${
                imageUrl ? (imageFit === "contain" ? "" : "mt-16") : "mt-3"
              }`}
            >
              {title}
            </p>
            <p className="mt-1 px-6 text-sm text-white/85">{sub}</p>
          </div>
        </article>
      </div>
    </div>
  );
}

export const ghostBtn =
  "flex min-h-12 w-full max-w-xs items-center justify-center border border-white text-sm font-semibold tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-[#1a1040] disabled:opacity-60";
