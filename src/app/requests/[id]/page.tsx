import { notFound } from "next/navigation";
import { RequestStage } from "@/components/requests/RequestStage";
import { getSession } from "@/lib/session";
import { loadRequestCard } from "@/lib/app-data";
import { track } from "@/lib/db";
import { listReviewsForUser, reviewTagStats } from "@/lib/reviews";
import { getMyReportAgainstUser, hasBlockedUser } from "@/lib/safety";

import type { IdParams } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({ params }: { params: IdParams }) {
  const { id } = await params;
  const session = await getSession();
  const item = await loadRequestCard(id, session?.id);
  if (!item) notFound();
  if (session) track("request_viewed", session.id, { requestId: id });

  const isOwner = session?.id === item.initiator.id;
  const stats = await reviewTagStats(item.initiator.id);
  const reviews = (await listReviewsForUser(item.initiator.id)).slice(0, 3);
  const safety =
    session && !isOwner
      ? await Promise.all([
          getMyReportAgainstUser({
            reporterId: session.id,
            reportedUserId: item.initiator.id,
            requestId: item.id,
          }),
          hasBlockedUser(session.id, item.initiator.id),
        ])
      : [null, false] as const;

  return (
    <RequestStage
      item={item}
      isOwner={isOwner}
      sessionId={session?.id}
      onTimePct={stats.pct("on_time")}
      friendlyPct={stats.pct("friendly")}
      reviews={reviews}
      existingReport={safety[0]}
      initiallyBlocked={Boolean(safety[1])}
    />
  );
}
