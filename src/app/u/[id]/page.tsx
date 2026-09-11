import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadProfile } from "@/lib/app-data";
import { listReviewsForUser, reviewTagStats } from "@/lib/reviews";
import { accountAgeLabel, ageFromBirthYear } from "@/lib/time";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  parseHeroAge,
} from "@/lib/constants";
import { PublicProfileBoard } from "@/components/profile/PublicProfileBoard";

import type { IdParams, Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: IdParams;
  searchParams: Search;
}) {
  const { id } = await params;
  const session = await getSession();
  // 封鎖只影響媒合／動態牆；公開名片與評價仍可查看（例如從安全中心回看）。

  const profile = await loadProfile(id);
  if (!profile || profile.status === "BANNED") notFound();

  const stats = await reviewTagStats(id);
  const reviews = await listReviewsForUser(id);
  const viewer = session ? await loadProfile(session.id) : null;

  const sp = await searchParams;
  const fromSafety = (typeof sp.from === "string" ? sp.from : sp.from?.[0]) === "safety";
  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromViewer =
    viewer?.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(viewer.birth_year_private))
      : null;
  const ageBand = fromCookie ?? fromViewer ?? 20;

  return (
    <PublicProfileBoard
      ageBand={ageBand}
      nickname={profile.nickname || "歌友"}
      avatarUrl={profile.avatar_url}
      accountAge={accountAgeLabel(profile.created_at)}
      ratingAvg={profile.rating_avg}
      ratingCount={profile.rating_count}
      matchCount={profile.successful_match_count}
      onTimePct={stats.pct("on_time")}
      friendlyPct={stats.pct("friendly")}
      singAgainPct={Math.max(0, 100 - stats.pct("no_show"))}
      reviews={reviews}
      isSelf={session?.id === id}
      backHref={fromSafety ? "/safety" : session ? "/matches" : "/"}
      backLabel={fromSafety ? "回安全中心" : "返回"}
    />
  );
}
