import Link from "next/link";
import {
  OFFICIAL_INSTAGRAM_URL,
  OFFICIAL_THREADS_URL,
  SUPPORT_EMAIL,
} from "@/lib/constants";

export function SiteLegalLinks({
  tone = "onLight",
  className = "",
  includeSafety = true,
  align = "start",
}: {
  tone?: "onLight" | "onDark";
  className?: string;
  includeSafety?: boolean;
  align?: "start" | "center";
}) {
  const muted = tone === "onDark" ? "text-white/70" : "text-[var(--muted)]";
  const link =
    tone === "onDark"
      ? "text-white underline-offset-4 hover:underline"
      : "text-purple-700 underline-offset-4 hover:underline";
  const iconBtn =
    tone === "onDark"
      ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white hover:text-[#1a1040]"
      : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] transition-colors hover:border-purple-700 hover:text-purple-700";
  const centered = align === "center";

  return (
    <div className={`space-y-2 text-sm ${muted} ${centered ? "text-center" : ""} ${className}`}>
      <p
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${
          centered ? "justify-center" : ""
        }`}
      >
        <Link href="/terms" className={link}>
          使用條款
        </Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className={link}>
          隱私權政策
        </Link>
        {includeSafety ? (
          <>
            <span aria-hidden>·</span>
            <Link href="/safety" className={link}>
              安全建議
            </Link>
          </>
        ) : null}
      </p>
      <p>
        客服信箱：{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={link}>
          {SUPPORT_EMAIL}
        </a>
      </p>
      <p
        className={`flex flex-wrap items-center gap-2 ${centered ? "justify-center" : ""}`}
      >
        <a
          href={OFFICIAL_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram @ktv_plus_1"
          className={iconBtn}
        >
          <InstagramGlyph />
        </a>
        <a
          href={OFFICIAL_THREADS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Threads @ktv_plus_1"
          className={iconBtn}
        >
          <ThreadsGlyph />
        </a>
      </p>
    </div>
  );
}

function InstagramGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3Z" />
    </svg>
  );
}

function ThreadsGlyph() {
  // Threads 官方簡標為 @ 字樣
  return (
    <span className="text-[17px] font-semibold leading-none tracking-tight" aria-hidden>
      @
    </span>
  );
}
