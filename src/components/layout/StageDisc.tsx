export type StageDiscGlyph = "music" | "shield";

export function StageDisc({
  emoji,
  badge,
  title,
  sub,
  from,
  to,
  glow,
  glowSoft,
  imageUrl,
  imageFit = "cover",
  glyph,
}: {
  emoji: string;
  badge: string;
  title: string;
  sub: string;
  from: string;
  to: string;
  /** 年齡局內側光暈；未傳時回退 from/to */
  glow?: string;
  glowSoft?: string;
  imageUrl?: string | null;
  imageFit?: "cover" | "contain";
  /** 玻璃質感白色圖示（通知／安全） */
  glyph?: StageDiscGlyph | null;
}) {
  const orb = glow ?? from;
  const orbSoft = glowSoft ?? to;
  const isCoverPhoto = Boolean(imageUrl) && imageFit === "cover" && !glyph;
  const isPropIcon = Boolean(glyph) || (Boolean(imageUrl) && imageFit === "contain");
  const bigStat = isPropIcon && /^\d+$/.test(title.trim());

  return (
    <div className="relative mx-auto flex h-[400px] max-w-[280px] items-center justify-center">
      <div className="deck-float relative">
        {/* 外側柔光：隨年齡局變色 */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
          style={{
            background: `radial-gradient(circle at 50% 58%, ${orb}55 0%, ${orbSoft}28 38%, transparent 68%)`,
          }}
        />

        <article className="glass-orb relative flex h-[280px] w-[280px] flex-col items-center justify-center overflow-hidden rounded-full text-center text-white">
          {/* 底部內側彩光 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 70% 55% at 72% 78%, ${orb}90 0%, ${orb}40 32%, transparent 62%),
                radial-gradient(ellipse 55% 45% at 28% 22%, rgba(255,255,255,0.55) 0%, transparent 55%),
                linear-gradient(155deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 42%, rgba(255,255,255,0.06) 100%)
              `,
            }}
          />

          {/* 內圈細線 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[14px] rounded-full border border-white/35"
          />

          {/* 高光弧 */}
          <div aria-hidden className="glass-orb-shine pointer-events-none absolute inset-0" />

          {/* 氣泡細節 */}
          <span aria-hidden className="glass-orb-bubble absolute left-[18%] top-[22%] h-3 w-3 rounded-full" />
          <span aria-hidden className="glass-orb-bubble absolute right-[22%] top-[30%] h-2 w-2 rounded-full opacity-60" />
          <span aria-hidden className="glass-orb-bubble absolute left-[30%] bottom-[28%] h-2.5 w-2.5 rounded-full opacity-50" />

          {isCoverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
          ) : null}

          {isCoverPhoto ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 70% 55% at 72% 78%, ${orb}55 0%, transparent 58%),
                  linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 28%, rgba(18,8,31,0.35) 100%)
                `,
              }}
            />
          ) : null}

          <div
            className={`relative z-10 flex h-full w-full flex-col items-center ${
              isPropIcon ? "justify-end pb-8" : "justify-center"
            }`}
          >
            <p className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/55 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-white/95 backdrop-blur-sm">
              {badge}
            </p>

            {glyph ? (
              <div
                className="absolute left-1/2 top-[26%] -translate-x-1/2"
                style={{ filter: `drop-shadow(0 10px 18px ${orb}66)` }}
              >
                <GlassGlyph kind={glyph} glow={orb} />
              </div>
            ) : imageUrl && imageFit === "contain" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="absolute left-1/2 top-[22%] h-[42%] w-[42%] -translate-x-1/2 object-contain"
                style={{
                  filter: `drop-shadow(0 12px 20px ${orb}55)`,
                }}
              />
            ) : !isCoverPhoto ? (
              <span
                className="text-6xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)]"
                aria-hidden
                style={{ filter: `drop-shadow(0 0 18px ${orb}88)` }}
              >
                {emoji}
              </span>
            ) : null}

            <p
              className={`px-6 font-bold leading-tight ${
                bigStat
                  ? "text-[42px] tracking-wide"
                  : isPropIcon
                    ? "text-xl"
                    : isCoverPhoto
                      ? "mt-16 text-xl"
                      : "mt-3 text-xl"
              }`}
              style={bigStat ? { fontFamily: "Anton, sans-serif", letterSpacing: "0.04em" } : undefined}
            >
              {title}
            </p>
            <p className={`mt-1 px-6 text-sm text-white/90 ${isPropIcon ? "font-medium" : ""}`}>{sub}</p>
          </div>
        </article>
      </div>
    </div>
  );
}

function GlassGlyph({ kind, glow }: { kind: StageDiscGlyph; glow: string }) {
  if (kind === "music") {
    return (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden>
        <defs>
          <linearGradient id="glass-music" x1="18" y1="8" x2="70" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity="0.98" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.82" />
            <stop offset="1" stopColor={glow} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path
          d="M58 12v38.2a14 14 0 1 1-8.5-12.9V26.5l-22 5.2V56a14 14 0 1 1-8.5-12.9V24.8c0-2.2 1.5-4.1 3.6-4.6L52.4 11c2.8-.7 5.6 1.4 5.6 4.3z"
          fill="url(#glass-music)"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="1.2"
        />
      </svg>
    );
  }

  return (
    <svg width="92" height="92" viewBox="0 0 92 92" fill="none" aria-hidden>
      <defs>
        <linearGradient id="glass-shield" x1="20" y1="10" x2="72" y2="82" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.98" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="1" stopColor={glow} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path
        d="M46 10c10.5 6.2 21.2 9 32 9v24.5c0 18.8-12.2 35.2-32 42.5-19.8-7.3-32-23.7-32-42.5V19c10.8 0 21.5-2.8 32-9z"
        fill="url(#glass-shield)"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.4"
      />
      <path
        d="M46 36.5c-2.4-4.2-8.2-5.4-11.8-2.2-3.4 3-3.5 8.1-.4 11.4L46 58.2l12.2-12.5c3.1-3.3 3-8.4-.4-11.4-3.6-3.2-9.4-2-11.8 2.2z"
        fill="rgba(255,255,255,0.55)"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.1"
      />
    </svg>
  );
}
