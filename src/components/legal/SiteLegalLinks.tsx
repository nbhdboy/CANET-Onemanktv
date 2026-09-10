import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/constants";

export function SiteLegalLinks({
  tone = "onLight",
  className = "",
  includeSafety = true,
}: {
  tone?: "onLight" | "onDark";
  className?: string;
  includeSafety?: boolean;
}) {
  const muted = tone === "onDark" ? "text-white/70" : "text-[var(--muted)]";
  const link =
    tone === "onDark"
      ? "text-white underline-offset-4 hover:underline"
      : "text-purple-700 underline-offset-4 hover:underline";

  return (
    <div className={`space-y-2 text-sm ${muted} ${className}`}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
    </div>
  );
}
