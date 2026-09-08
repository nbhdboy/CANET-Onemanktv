import { notFound, redirect } from "next/navigation";
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
import { canReview } from "@/lib/reviews";
import { useSupabaseApp } from "@/lib/runtime";
import { getTapPayPublicConfig, isLivePayment } from "@/lib/tappay/env";
import { countdownLabel, formatDateTime } from "@/lib/time";
import { durationLabel } from "@/lib/format";
import Link from "next/link";

import type { IdParams } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: IdParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const match = await loadMatchForUserApp(session.id, id);
  if (!match) notFound();
  const request = await loadRequestCard(match.request_id, session.id);
  if (!request) notFound();
  const counterpartId =
    match.initiator_id === session.id ? match.participant_id : match.initiator_id;
  const counterpart = await loadProfile(counterpartId);
  const myPay = await loadMyPaymentApp(match.id, session.id);
  const allPay = await loadPaymentsApp(match.id);
  const brand = await loadBrandForRequestApp(match.request_id);
  const cloud = useSupabaseApp();
  const reviewGate = cloud
    ? ({ ok: false as const, reason: "NOT_READY" as const })
    : canReview(session.id, match.id);

  if (match.status === "PENDING_PAYMENT" && myPay?.status === "PENDING") {
    const live = isLivePayment();
    const tappay = getTapPayPublicConfig();
    return (
      <main className="mx-auto max-w-lg px-4 py-10 space-y-6">
        {live ? (
          <TapPayCheckout
            paymentId={myPay.id}
            amount={myPay.fee_due}
            deadlineLabel={match.payment_deadline ? countdownLabel(match.payment_deadline) : "--"}
            defaultEmail={session.email}
            appId={tappay.appId}
            appKey={tappay.appKey}
            tappayEnv={tappay.env}
          />
        ) : (
          <MockCheckout
            paymentId={myPay.id}
            amount={myPay.fee_due}
            deadlineLabel={match.payment_deadline ? countdownLabel(match.payment_deadline) : "--"}
          />
        )}
        <p className="text-sm text-[var(--muted)]">
          對方付款狀態：
          {allPay
            .filter((p) => p.user_id !== session.id)
            .map((p) => (p.status === "PAID" || p.status === "NOT_REQUIRED" ? "已完成" : "等待中"))
            .join("")}
        </p>
      </main>
    );
  }

  if (match.status === "PENDING_PAYMENT") {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 space-y-4">
        <h1 className="text-2xl font-bold">等待對方完成付款</h1>
        <p className="text-[var(--muted)]">你這次無需支付平台服務費。對方完成後就會正式媒合。</p>
        <p className="text-sm">倒數 {match.payment_deadline ? countdownLabel(match.payment_deadline) : ""}</p>
      </main>
    );
  }

  if (match.status === "EXPIRED_PAYMENT" || match.status === "CANCELLED") {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 space-y-4">
        <h1 className="text-2xl font-bold">這次媒合沒有成立</h1>
        <p>這次媒合付款時間已結束，名額已重新開放。</p>
        <p className="text-sm text-[var(--muted)]">第一次免費額度沒有被消耗。</p>
        <Link href="/" className="text-purple-700 font-semibold">
          看看其他歌局
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 space-y-6">
      <section className="rounded-3xl neon-gradient text-white p-6">
        <p className="text-sm opacity-90">🎉 找到你的 +1 啦！</p>
        <h1 className="text-3xl font-bold mt-1">今晚就別再一個人唱情歌了。</h1>
        <p className="mt-4">
          {request.brand_name} {request.venue_name}
        </p>
        <p>
          {formatDateTime(request.sing_at)} · 2 人 · 預計 {durationLabel(request.duration_hours)}
        </p>
      </section>

      {counterpart && (
        <UnlockedContacts matchId={match.id} nickname={counterpart.nickname || "歌友"} />
      )}

      {brand && (
        <BookingPanel
          matchId={match.id}
          brandName={brand.name}
          bookingUrl={brand.booking_url}
          isInitiator={match.initiator_id === session.id}
          marked={match.booking_status === "MARKED_DONE"}
        />
      )}

      <div className="rounded-3xl bg-amber-50 p-5 text-sm space-y-2">
        <p className="font-semibold">第一次和新歌友見面？</p>
        <p>建議：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>告知朋友你的行程</li>
          <li>選擇正常營業的公開 KTV</li>
          <li>不要提供金融帳號、證件或敏感個資</li>
          <li>如果感到不舒服，隨時離開並使用檢舉功能</li>
        </ul>
      </div>

      {reviewGate.ok && <ReviewForm matchId={match.id} />}
      {reviewGate.reason === "TOO_EARLY" && (
        <p className="text-sm text-[var(--muted)]">活動結束後就可以互評。</p>
      )}

      <SafetyActions userId={counterpartId} matchId={match.id} requestId={match.request_id} />
    </main>
  );
}
