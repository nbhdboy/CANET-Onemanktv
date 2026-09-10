import Link from "next/link";

export function EmptyFeed({
  ageLabel,
  age,
  onColor = false,
  ctaFrom,
  ctaMid,
  ctaTo,
}: {
  ageLabel?: string;
  age?: number;
  onColor?: boolean;
  ctaFrom?: string;
  ctaMid?: string;
  ctaTo?: string;
}) {
  const useAgeGradient = Boolean(ctaFrom && ctaMid && ctaTo);
  return (
    <div
      className={`rounded-3xl p-10 text-center space-y-4 ${
        onColor ? "bg-white/90 shadow-[0_18px_50px_rgba(0,0,0,0.12)]" : "bg-white card-float"
      }`}
    >
      <p className="text-4xl" aria-hidden>
        🎤
      </p>
      <h2 className="text-xl font-bold">
        {ageLabel ? `現在好像還沒有 ${ageLabel} 的歌局……` : "現在好像有點安靜……"}
      </h2>
      <p className="text-[var(--muted)]">不如你來當第一個開唱的人？</p>
      <Link
        href={age ? `/requests/new?age=${age}` : "/requests/new"}
        className={`inline-flex min-h-12 items-center justify-center rounded-2xl text-white px-6 font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.12)] ${
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
