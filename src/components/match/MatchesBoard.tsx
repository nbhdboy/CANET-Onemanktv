"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EqualizerLoader } from "@/components/ui/EqualizerLoader";
import { avatarPresetOrFallback, isPhotoAvatar } from "@/lib/avatar";
import { heroByAge, type HeroAge } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";

type Row = Record<string, unknown>;

export function MatchesBoard({
  nickname,
  avatarUrl,
  ageBand,
  pendingRequests,
  waitingReply,
  waitingPay,
  matched,
  ended,
}: {
  nickname: string;
  avatarUrl?: string | null;
  ageBand: HeroAge;
  pendingRequests: Row[];
  waitingReply: Row[];
  waitingPay: Row[];
  matched: Row[];
  ended: Array<Row & { reviewable: boolean }>;
}) {
  const [navLoading, setNavLoading] = useState(false);
  const router = useRouter();
  const hero = heroByAge(ageBand);
  const preset = avatarPresetOrFallback(avatarUrl);
  const photo = isPhotoAvatar(avatarUrl) ? avatarUrl : null;
  const live = pendingRequests.length + waitingReply.length + waitingPay.length + matched.length;
  const badge =
    waitingPay.length > 0
      ? "待付款"
      : pendingRequests.length > 0
        ? "有人想唱"
        : matched.length > 0
          ? "已配對"
          : live > 0
            ? "進行中"
            : "歌單";

  function go(href: string) {
    if (navLoading) return;
    setNavLoading(true);
    router.push(href);
  }

  if (navLoading) {
    return <EqualizerLoader />;
  }

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
        媒合
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
            K歌 +1 · {hero.label}歌單
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
              LIVE 歌單
            </p>
            <div className="relative mx-auto" style={{ maxWidth: 280, height: 400 }}>
              <div
                aria-hidden
                className="absolute inset-x-6 top-10 h-[78%] rounded-[28px] border border-dashed border-white/35"
              />
              <div className="deck-float relative h-full">
                <article
                  className="relative flex h-full flex-col overflow-hidden text-white"
                  style={{
                    borderRadius: 36,
                    background: photo
                      ? "#12081f"
                      : `linear-gradient(165deg, ${preset.from} 0%, ${preset.to} 58%, #1a1040 100%)`,
                    boxShadow: "0 28px 70px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.12)",
                  }}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-55"
                    />
                  ) : null}
                  <p className="absolute left-4 top-4 z-10 rounded-full border border-white/40 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-white/90">
                    {badge}
                  </p>
                  <div className="relative z-10 flex flex-1 flex-col justify-center px-7 pt-10">
                    <Stat n={pendingRequests.length} label="收到的申請" />
                    <Stat n={waitingPay.length} label="等待付款" />
                    <Stat n={matched.length} label="已媒合" />
                  </div>
                  <div
                    className="relative z-10 px-5 pb-6 pt-8"
                    style={{
                      background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(16,10,28,0.84) 72%)",
                    }}
                  >
                    <p className="text-[22px] font-bold leading-tight">{nickname}</p>
                    <p className="mt-1 text-sm text-white/88">
                      {live} 場進行中 · {ended.length} 場已結束
                    </p>
                    <p className="mt-3 text-sm font-semibold tracking-wide">打開歌單 →</p>
                  </div>
                </article>
              </div>
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
                對上了
                <br />
                剛剛好
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/88">
                申請、付款、已配對的歌局都在這裡。點進卡片就能繼續下一步。
              </p>
            </div>

            <Track n="01" title="收到的申請">
              {pendingRequests.length === 0 ? (
                <Empty>目前沒有待處理申請。</Empty>
              ) : (
                pendingRequests.map((r) => (
                  <MatchRow
                    key={String(r.id)}
                    href={`/requests/${r.id}/applicants`}
                    title={`${String(r.brand_name)} ${String(r.venue_name)}`}
                    sub={`${Number(r.pending_count)} 個人想一起唱 · ${formatDateTime(String(r.sing_at))}`}
                    cta="查看申請者 →"
                    onNavigate={go}
                  />
                ))
              )}
            </Track>

            <Track n="02" title="等待回覆">
              {waitingReply.length === 0 ? (
                <Empty>你還沒有提出申請。</Empty>
              ) : (
                waitingReply.map((a) => (
                  <MatchRow
                    key={String(a.id)}
                    href={`/requests/${a.request_id}`}
                    title={`${String(a.brand_name)} ${String(a.venue_name)}`}
                    sub={`${formatDateTime(String(a.sing_at))} · 等待發起人回覆`}
                    cta="查看歌局 →"
                    onNavigate={go}
                  />
                ))
              )}
            </Track>

            <Track n="03" title="等待付款">
              {waitingPay.length === 0 ? (
                <Empty>沒有待付款的媒合。</Empty>
              ) : (
                waitingPay.map((m) => (
                  <MatchRow
                    key={String(m.id)}
                    href={`/matches/${m.id}`}
                    title={`${String(m.brand_name)} ${String(m.venue_name)}`}
                    sub="再一步就可以交換聯絡方式啦 🎤"
                    cta="去付款 →"
                    onNavigate={go}
                  />
                ))
              )}
            </Track>

            <Track n="04" title="已媒合">
              {matched.length === 0 ? (
                <Empty>還沒有成功的 +1。</Empty>
              ) : (
                matched.map((m) => (
                  <MatchRow
                    key={String(m.id)}
                    href={`/matches/${m.id}`}
                    title={`${String(m.brand_name)} ${String(m.venue_name)}`}
                    sub={`${formatDateTime(String(m.sing_at))} · 聯絡方式已解鎖`}
                    cta="查看聯絡方式 →"
                    onNavigate={go}
                  />
                ))
              )}
            </Track>

            <Track n="05" title="已結束">
              {ended.length === 0 ? (
                <Empty>尚無歷史紀錄。</Empty>
              ) : (
                ended.map((m) => (
                  <MatchRow
                    key={String(m.id)}
                    href={`/matches/${m.id}`}
                    title={`${String(m.brand_name)} ${String(m.venue_name)}`}
                    sub={`${endedLabel(String(m.status))}${m.reviewable ? " · 可以評價" : ""}`}
                    cta="查看紀錄 →"
                    onNavigate={go}
                  />
                ))
              )}
            </Track>
          </div>
        </div>
      </div>
    </main>
  );
}

function endedLabel(status: string) {
  if (status === "COMPLETED") return "已完成";
  if (status === "CANCELLED") return "已取消";
  if (status === "EXPIRED_PAYMENT") return "付款逾時";
  return status;
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/20 py-2 last:border-b-0">
      <span className="text-sm text-white/80">{label}</span>
      <span
        className="text-white"
        style={{ fontFamily: "Anton, sans-serif", fontSize: 36, letterSpacing: "0.04em", lineHeight: 1 }}
      >
        {String(n).padStart(2, "0")}
      </span>
    </div>
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

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-white/80">{children}</p>;
}

function MatchRow({
  href,
  title,
  sub,
  cta,
  onNavigate,
}: {
  href: string;
  title: string;
  sub: string;
  cta: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(href);
      }}
      className="group flex min-h-12 items-center justify-between gap-4 border border-white/50 px-5 py-4 text-white transition-colors hover:bg-white hover:text-[#1a1040]"
    >
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-white/80 group-hover:text-[#1a1040]/70">{sub}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold tracking-wide">{cta}</span>
    </a>
  );
}
