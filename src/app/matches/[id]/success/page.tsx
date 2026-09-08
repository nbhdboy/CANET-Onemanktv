import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadMatchForUserApp, loadRequestCard } from "@/lib/app-data";
import { MatchConfetti } from "@/components/match/MatchConfetti";
import { durationLabel } from "@/lib/format";
import { formatDateTime } from "@/lib/time";
import Link from "next/link";

import type { IdParams } from "@/lib/route-types";

export default async function MatchSuccessPage({ params }: { params: IdParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const match = await loadMatchForUserApp(session.id, id);
  if (!match) notFound();
  const request = await loadRequestCard(match.request_id, session.id);

  if (match.status === "PENDING_PAYMENT") {
    redirect(`/matches/${id}`);
  }

  return (
    <main className="min-h-screen neon-gradient text-white flex items-center justify-center px-4">
      <MatchConfetti />
      <div className="max-w-lg text-center space-y-5">
        <p className="text-5xl" aria-hidden>
          🎉
        </p>
        <h1 className="text-4xl font-bold" style={{ fontFamily: "Anton, sans-serif" }}>
          找到你的 +1 啦！
        </h1>
        <p className="text-lg opacity-90">今晚終於不用一個人唱情歌。</p>
        {request && (
          <p>
            {request.brand_name} {request.venue_name}
            <br />
            {formatDateTime(request.sing_at)} · 2 人 · 預計 {durationLabel(request.duration_hours)}
          </p>
        )}
        <Link
          href={`/matches/${id}`}
          className="inline-flex h-12 px-6 items-center rounded-2xl bg-white text-purple-800 font-semibold"
        >
          查看聯絡方式
        </Link>
      </div>
    </main>
  );
}
