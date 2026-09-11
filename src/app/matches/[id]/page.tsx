import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import {
  loadBrandForRequestApp,
  loadMatchForUserApp,
  loadMyPaymentApp,
  loadPaymentsApp,
  loadProfile,
  loadRequestCard,
} from "@/lib/app-data";
import { MockCheckout } from "@/components/match/MockCheckout";
import { TapPayCheckout } from "@/components/match/TapPayCheckout";
import { UnlockedContacts } from "@/components/match/UnlockedContacts";
import { BookingPanel } from "@/components/match/BookingPanel";
import { ReviewForm } from "@/components/match/ReviewForm";
import { SafetyActions } from "@/components/safety/SafetyActions";
import { PaymentDeadlineCountdown } from "@/components/match/PaymentDeadlineCountdown";
import { GlassFormShell } from "@/components/layout/GlassFormShell";
import { canReview, getMyReviewForMatch } from "@/lib/reviews";
import { useSupabaseApp } from "@/lib/runtime";
import { getTapPayPublicConfig, isLivePayment } from "@/lib/tappay/env";
import { getPublicSavedCard } from "@/lib/tappay/cards";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  heroByAge,
  parseHeroAge,
} from "@/lib/constants";
import { ageFromBirthYear, formatDateTime } from "@/lib/time";
import { durationLabel } from "@/lib/format";
import type { IdParams } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: IdParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  if (useSupabaseApp()) {
    try {
      const { runSupabaseMaintenance } = await import("@/lib/supabase/maintenance");
      await runSupabaseMaintenance();
    } catch {
      /* ignore */
    }
  }

  const match = await loadMatchForUserApp(session.id, id);
  if (!match) notFound();
  const request = await loadRequestCard(match.request_id, session.id);
  if (!request) notFound();
  const counterpartId =
    match.initiator_id === session.id ? match.participant_id : match.initiator_id;
  const counterpart = await loadProfile(counterpartId);
  const myProfile = await loadProfile(session.id);
  const myPay = await loadMyPaymentApp(match.id, session.id);
  const allPay = await loadPaymentsApp(match.id);
  const brand = await loadBrandForRequestApp(match.request_id);
  const reviewGate = await canReview(session.id, match.id);
  const myReview =
    !reviewGate.ok && reviewGate.reason === "ALREADY"
      ? await getMyReviewForMatch(session.id, match.id)
      : null;
  const points = Number(myProfile?.points ?? 0);

  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    myProfile?.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(myProfile.birth_year_private))
      : null;
  const ageBand = fromCookie ?? fromProfile ?? (request.age_band as 20 | 30 | 40 | 50) ?? 20;
  const hero = heroByAge(ageBand);
  const accents = {
    accent: hero.glassGlow,
    accentSoft: hero.glassGlowSoft,
    ctaFrom: hero.ctaFrom,
  };

  if (match.status === "PENDING_PAYMENT" && myPay?.status === "PENDING") {
    const live = isLivePayment();
    const tappay = getTapPayPublicConfig();
    const savedCard = live ? await getPublicSavedCard(session.id).catch(() => null) : null;
    const counterpartStatus = allPay
      .filter((p) => p.user_id !== session.id)
      .map((p) => (p.status === "PAID" || p.status === "NOT_REQUIRED" ? "已完成" : "等待中"))
      .join("");

    return (
      <GlassFormShell
        ageBand={ageBand}
        watermark="付款"
        kicker={`K歌 +1 · ${hero.label}媒合`}
        title="完成付款"
        subtitle={`對方付款狀態：${counterpartStatus || "等待中"}`}
        maxWidthClass="max-w-lg"
      >
        {live ? (
          <TapPayCheckout
            paymentId={myPay.id}
            amount={myPay.fee_due}
            deadlineIso={match.payment_deadline}
            defaultEmail={session.email}
            appId={tappay.appId}
            appKey={tappay.appKey}
            tappayEnv={tappay.env}
            savedCard={savedCard}
            points={points}
            {...accents}
          />
        ) : (
          <MockCheckout
            paymentId={myPay.id}
            amount={myPay.fee_due}
            deadlineIso={match.payment_deadline}
            points={points}
            {...accents}
          />
        )}
      </GlassFormShell>
    );
  }

  if (match.status === "PENDING_PAYMENT") {
    return (
      <GlassFormShell
        ageBand={ageBand}
        watermark="等待"
        kicker={`K歌 +1 · ${hero.label}媒合`}
        title="等待對方完成付款"
        subtitle="你這次無需支付平台服務費。對方完成後就會正式媒合。"
        maxWidthClass="max-w-lg"
      >
        <PaymentDeadlineCountdown
          deadlineIso={match.payment_deadline}
          prefix="倒數"
          suffix=""
          className="text-sm text-white/85"
        />
      </GlassFormShell>
    );
  }

  if (match.status === "EXPIRED_PAYMENT" || match.status === "CANCELLED") {
    return (
      <GlassFormShell
        ageBand={ageBand}
        watermark="結束"
        kicker={`K歌 +1 · ${hero.label}媒合`}
        title="這次媒合沒有成立"
        subtitle="這次媒合付款時間已結束，名額已重新開放。第一次免費額度沒有被消耗。若你已付款，金額已轉成點數。"
        maxWidthClass="max-w-lg"
      >
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full border border-white/70 px-6 text-sm font-semibold text-white"
        >
          看看其他歌局
        </Link>
      </GlassFormShell>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white" style={{ backgroundColor: hero.bg }}>
      <div className="grain pointer-events-none absolute inset-0 opacity-35" />
      <div className="relative mx-auto max-w-lg space-y-6 px-4 py-10">
        <section className="compose-glass relative overflow-hidden rounded-[28px] p-6">
          <p className="text-sm text-white/90">🎉 找到你的 +1 啦！</p>
          <h1
            className="mt-1 text-white"
            style={{
              fontFamily: "Anton, sans-serif",
              fontSize: "clamp(28px, 7vw, 40px)",
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
            }}
          >
            今晚就別再一個人唱情歌了。
          </h1>
          <p className="mt-4">
            {request.brand_name} {request.venue_name}
          </p>
          <p>
            {formatDateTime(request.sing_at)} · 2 人 · 預計 {durationLabel(request.duration_hours)}
          </p>
        </section>

        {counterpart ? (
          <UnlockedContacts
            matchId={match.id}
            nickname={counterpart.nickname || "歌友"}
            accent={hero.glassGlow}
          />
        ) : null}

        {brand ? (
          <BookingPanel
            matchId={match.id}
            brandName={brand.name}
            bookingUrl={brand.booking_url}
            {...accents}
          />
        ) : null}

        <div className="compose-glass rounded-[24px] p-5 text-sm text-white">
          <p className="font-semibold">第一次和新歌友見面？</p>
          <p className="mt-2 text-white/85">建議：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/85">
            <li>告知朋友你的行程</li>
            <li>選擇正常營業的公開 KTV</li>
            <li>不要提供金融帳號、證件或敏感個資</li>
            <li>如果感到不舒服，隨時離開並使用檢舉功能</li>
          </ul>
        </div>

        {reviewGate.ok || myReview ? (
          <ReviewForm
            matchId={match.id}
            existingReview={myReview}
            {...accents}
          />
        ) : null}
        {!reviewGate.ok && reviewGate.reason === "TOO_EARLY" ? (
          <p className="text-sm text-white/80">活動結束後就可以互評。</p>
        ) : null}

        <SafetyActions
          userId={counterpartId}
          matchId={match.id}
          requestId={match.request_id}
          {...accents}
        />
      </div>
    </main>
  );
}
