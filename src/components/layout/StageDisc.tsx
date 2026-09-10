"use client";

import { useImageAccent } from "@/hooks/useImageAccent";

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
  const accent = useImageAccent(imageUrl, { from, to });
  const glowFrom = imageUrl ? accent.from : from;

  return (
    <div className="relative mx-auto flex h-[400px] max-w-[280px] items-center justify-center">
      <div
        aria-hidden
        className="absolute h-[72%] w-[72%] rounded-full transition-[background] duration-500"
        style={{ background: `radial-gradient(circle, ${glowFrom} 0%, transparent 70%)` }}
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
              crossOrigin="anonymous"
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
