import Link from "next/link";
import { Mic2 } from "lucide-react";

export function EmptyFeed({
  ageLabel,
  age,
  onColor = false,
  ctaFrom,
  ctaMid,
  ctaTo,
  accent,
  accentSoft,
}: {
  ageLabel?: string;
  age?: number;
  onColor?: boolean;
  ctaFrom?: string;
  ctaMid?: string;
  ctaTo?: string;
  accent?: string;
  accentSoft?: string;
}) {
  const useAgeGradient = Boolean(ctaFrom && ctaMid && ctaTo);
  const glow = accent || ctaMid || "#F472B6";
  const glowSoft = accentSoft || ctaTo || glow;

  if (!onColor) {
    return (
      <div className="card-float space-y-4 rounded-3xl bg-white p-10 text-center">
        <p className="text-4xl" aria-hidden>
          🎤
        </p>
        <h2 className="text-xl font-bold">
          {ageLabel ? `現在好像還沒有 ${ageLabel} 的歌局……` : "現在好像有點安靜……"}
        </h2>
        <p className="text-[var(--muted)]">不如你來當第一個開唱的人？</p>
        <Link
          href={age ? `/requests/new?age=${age}` : "/requests/new"}
          className={`inline-flex min-h-12 items-center justify-center rounded-2xl px-6 font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] ${
            useAgeGradient ? "" : "neon-gradient"
          }`}
          style={
            useAgeGradient
              ? {
                  background: `linear-gradient(135deg, ${ctaFrom} 0%, ${ctaMid} 48%, ${ctaTo} 100%)`,
                }
              : undefined
          }
        >
          發起唱歌需求
        </Link>
      </div>
    );
  }

  return (
    <div className="compose-glass relative overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-55 blur-xl"
        style={{ background: `radial-gradient(circle, ${glow}99 0%, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full border border-white/25 opacity-35"
      />
      <div className="relative space-y-4">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/45 bg-white/15 text-white"
          aria-hidden
        >
          <Mic2 size={24} />
        </span>
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          {ageLabel ? `現在好像還沒有 ${ageLabel} 的歌局……` : "現在好像有點安靜……"}
        </h2>
        <p className="text-sm text-white/85">不如你來當第一個開唱的人？</p>
        <Link
          href={age ? `/requests/new?age=${age}` : "/requests/new"}
          className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold tracking-[0.12em] text-white transition-transform hover:scale-[1.01]"
          style={{
            background: useAgeGradient
              ? `linear-gradient(110deg, ${ctaTo} 0%, ${glow} 48%, ${ctaFrom} 100%)`
              : `linear-gradient(110deg, ${glowSoft} 0%, ${glow} 100%)`,
            boxShadow: `0 14px 36px ${glow}66`,
          }}
        >
          發起唱歌需求
        </Link>
      </div>
    </div>
  );
}
