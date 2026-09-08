import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listApplicants } from "@/lib/match";
import { loadRequestCard } from "@/lib/app-data";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";
import { ApplicantActions } from "@/components/match/ApplicantActions";
import { listReviewsForUser, topTags } from "@/lib/reviews";
import { POSITIVE_REVIEW_TAGS, NEGATIVE_REVIEW_TAGS } from "@/lib/constants";

import type { IdParams } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function ApplicantsPage({ params }: { params: IdParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const item = await loadRequestCard(id, session.id);
  if (!item || item.initiator.id !== session.id) notFound();
  const applicants = listApplicants(session.id, id);
  const pending = applicants.filter((a) => a.application.status === "PENDING");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-5">
      <h1 className="text-3xl font-bold">{pending.length} 個人想一起唱</h1>
      {applicants.length === 0 && <p className="text-[var(--muted)]">還沒有人申請。把連結分享出去吧。</p>}
      {applicants.map(({ application, profile }) => {
        const tags = topTags(profile.id);
        const tagLib = [...POSITIVE_REVIEW_TAGS, ...NEGATIVE_REVIEW_TAGS];
        const reviews = listReviewsForUser(profile.id).slice(0, 2);
        return (
          <article key={application.id} className="rounded-3xl bg-white card-float p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar presetId={profile.avatar_url} nickname={profile.nickname} />
              <div>
                <Link href={`/u/${profile.id}`} className="font-bold">
                  {profile.nickname}
                </Link>
                <p className="text-sm">
                  {profile.rating_count === 0 ? "🌱 新歌友" : <Stars value={profile.rating_avg} size="sm" />}
                  · 完成 {profile.successful_match_count} 次媒合
                </p>
              </div>
            </div>
            {tags.length > 0 && (
              <p className="text-sm">
                {tags
                  .map((t) => tagLib.find((x) => x.id === t.id))
                  .filter(Boolean)
                  .map((t) => `${t!.emoji} ${t!.label}`)
                  .join(" · ")}
              </p>
            )}
            {reviews.map((r) => (
              <p key={r.id} className="text-sm text-[var(--muted)]">
                最近評價：⭐ {r.rating} {r.comment || ""}
              </p>
            ))}
            {application.status === "PENDING" && item.status === "OPEN" ? (
              <ApplicantActions applicationId={application.id} />
            ) : (
              <p className="text-sm text-[var(--muted)]">狀態：{application.status}</p>
            )}
          </article>
        );
      })}
    </main>
  );
}
