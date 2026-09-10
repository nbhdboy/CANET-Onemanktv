"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { SiteLegalLinks } from "@/components/legal/SiteLegalLinks";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { useImageAccent } from "@/hooks/useImageAccent";
import { heroByAge, type HeroAge } from "@/lib/constants";
import { avatarPresetOrFallback, isPhotoAvatar } from "@/lib/avatar";
import { Stars } from "@/components/ui/Stars";
import type { ReactNode } from "react";

export function ProfileBoard({
  nickname,
  avatarUrl,
  ageBand,
  isAdmin,
  ratingAvg,
  ratingCount,
  matchCount,
  accountAge,
  unread,
  onTimePct,
  friendlyPct,
  singAgainPct,
  points,
}: {
  nickname: string;
  avatarUrl?: string | null;
  ageBand: HeroAge;
  isAdmin: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  matchCount: number;
  accountAge: string;
  unread: number;
  onTimePct: number;
  friendlyPct: number;
  singAgainPct: number;
  points: number;
}) {
  const hero = heroByAge(ageBand);
  const preset = avatarPresetOrFallback(avatarUrl);
  const photo = isPhotoAvatar(avatarUrl) ? avatarUrl : null;
  const accent = useImageAccent(photo, { from: preset.from, to: preset.to });
  const glowFrom = photo ? accent.from : preset.from;
  const displayName = nickname || "尚未設定暱稱";

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
        我的
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
            K歌 +1 · {hero.label}名片
          </p>
          <Link
            href="/"
            aria-label="回到找歌友"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 text-white transition-colors hover:bg-white hover:text-[#1a1040]"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </Link>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <aside className="compose-poster lg:sticky lg:top-24">
            <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-white/75">
              LIVE 名片
            </p>
            <div className="relative mx-auto flex h-[400px] max-w-[280px] items-center justify-center">
              <div
                aria-hidden
                className="absolute h-[72%] w-[72%] rounded-full transition-[background] duration-500"
                style={{
                  background: `radial-gradient(circle, ${glowFrom} 0%, transparent 70%)`,
                }}
              />
              <div className="deck-float relative">
                <article
                  className="relative flex h-[280px] w-[280px] flex-col items-center justify-center overflow-hidden rounded-full text-center text-white"
                  style={{
                    background: photo
                      ? "#12081f"
                      : `linear-gradient(165deg, ${preset.from} 0%, ${preset.to} 62%, #12081f 100%)`,
                    boxShadow: "0 22px 50px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.12)",
                  }}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  <div
                    className={`relative z-10 flex h-full w-full flex-col items-center justify-center ${
                      photo ? "bg-gradient-to-b from-black/35 via-black/15 to-black/55" : ""
                    }`}
                  >
                    <p className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/40 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-white/90">
                      {hero.label}
                    </p>
                    {!photo ? (
                      <span className="text-6xl" aria-hidden>
                        {preset.emoji}
                      </span>
                    ) : null}
                    <p className={`px-6 text-xl font-bold leading-tight ${photo ? "mt-16" : "mt-3"}`}>
                      {displayName}
                    </p>
                    <p className="mt-1 text-sm text-white/85">{accountAge}</p>
                  </div>
                </article>
              </div>
            </div>

            <div className="mx-auto mt-6 w-full max-w-[280px] border border-white/50 px-5 py-4 text-center">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-white/75">點數</p>
              <p
                className="mt-2 text-white"
                style={{
                  fontFamily: "Anton, sans-serif",
                  fontSize: 44,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                {points}
              </p>
              <p className="mt-2 text-sm text-white/85">1 點 = NT$1 服務費</p>
              <p className="mt-3 text-xs leading-relaxed text-white/70">
                已付款但對方逾時未付時，金額會轉成點數。下次可全額用點數支付（不可與刷卡／LINE Pay
                混用），異動會以通知告知。
              </p>
            </div>
          </aside>

          <div className="compose-panel space-y-8">
            <div>
              <h1
                className="uppercase text-white"
                style={{
                  fontFamily: "Anton, sans-serif",
                  fontSize: "clamp(40px, 7vw, 76px)",
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                }}
              >
                就是我
                <br />
                這位歌友
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/88">
                {ratingCount === 0 ? (
                  <>🌱 新歌友 · 還沒有評價</>
                ) : (
                  <>
                    <Stars value={ratingAvg} /> · 完成 {matchCount} 次媒合
                  </>
                )}
              </p>
            </div>

            <Track n="01" title="這張名片">
              {ratingCount > 0 ? (
                <p className="text-sm text-white/88">
                  {onTimePct}% 準時 · {friendlyPct}% 好相處 · {singAgainPct}% 願意再次一起唱
                </p>
              ) : (
                <p className="text-sm text-white/80">唱過幾場之後，準時和好相處會出現在這裡。</p>
              )}
              <p className="text-xs text-white/70">
                真實姓名與社群帳號不會出現在公開資料。
              </p>
            </Track>

            <Track n="02" title="帳號入口">
              <GhostRow href="/settings" label="聯絡方式與設定" cta="打開 →" />
              <GhostRow
                href="/notifications"
                label={`通知中心${unread ? `（${unread}）` : ""}`}
                cta="打開 →"
              />
              <GhostRow href="/safety" label="安全中心" cta="打開 →" />
              <GhostRow href="/matches" label="媒合與歷史" cta="打開 →" />
              {isAdmin ? <GhostRow href="/admin" label="Admin 後台" cta="打開 →" /> : null}
            </Track>

            <Track n="03" title="離席">
              <form action={logoutAction}>
                <LogoutButton />
              </form>
            </Track>

            <Track n="04" title="條款與客服">
              <SiteLegalLinks tone="onDark" />
            </Track>
          </div>
        </div>
      </div>
    </main>
  );
}

function Track({ n, title, children }: { n: string; title: string; children: ReactNode }) {
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

function GhostRow({ href, label, cta }: { href: string; label: string; cta: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-12 items-center justify-between gap-4 border border-white/50 px-5 py-4 text-white transition-colors hover:bg-white hover:text-[#1a1040]"
    >
      <span className="font-semibold">{label}</span>
      <span className="shrink-0 text-sm font-semibold tracking-wide">{cta}</span>
    </Link>
  );
}
