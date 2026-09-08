import { notFound } from "next/navigation";
import { getProfile } from "@/lib/users";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";
import { listReviewsForUser, reviewTagStats } from "@/lib/reviews";
import { accountAgeLabel } from "@/lib/time";
import { POSITIVE_REVIEW_TAGS } from "@/lib/constants";
import { getSession } from "@/lib/session";
import { isBlockedEither } from "@/lib/safety";

import type { IdParams } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: IdParams }) {
  const { id } = await params;
  const session = await getSession();
  if (session && isBlockedEither(session.id, id)) notFound();
  const profile = getProfile(id);
  if (!profile || profile.status === "BANNED") notFound();
  const stats = reviewTagStats(id);
  const reviews = listReviewsForUser(id);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="rounded-3xl bg-white card-float p-6 text-center space-y-3">
        <Avatar presetId={profile.avatar_url} nickname={profile.nickname} size={84} />
        <h1 className="text-2xl font-bold">{profile.nickname || "歌友"}</h1>
        {profile.rating_count === 0 ? (
          <div>
            <p className="font-medium">🌱 新歌友</p>
            <p className="text-sm text-[var(--muted)]">還沒有評價</p>
          </div>
        ) : (
          <div>
            <Stars value={profile.rating_avg} />
            <p>完成 {profile.successful_match_count} 次媒合</p>
            <p className="text-sm text-[var(--muted)]">
              {stats.pct("on_time")}% 準時 · {stats.pct("friendly")}% 好相處 · {Math.max(0, 100 - stats.pct("no_show"))}% 願意再次一起唱
            </p>
          </div>
        )}
        <p className="text-sm text-[var(--muted)]">{accountAgeLabel(profile.created_at)}</p>
      </div>
      <section className="space-y-3">
        <h2 className="font-bold">評價</h2>
        {reviews.length === 0 && <p className="text-sm text-[var(--muted)]">尚無評價。</p>}
        {reviews.map((r) => (
          <article key={r.id} className="rounded-3xl bg-white p-4 card-float">
            <p>⭐ {r.rating}</p>
            <p className="text-sm mt-1">
              {JSON.parse(r.tags || "[]")
                .map((t: string) => POSITIVE_REVIEW_TAGS.find((x) => x.id === t)?.label || t)
                .join(" · ")}
            </p>
            {r.comment && <p className="text-sm mt-2">{r.comment}</p>}
          </article>
        ))}
      </section>
    </main>
  );
}
