import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileBoard } from "@/components/profile/ProfileBoard";
import { getSession } from "@/lib/session";
import { loadProfile, loadUnread } from "@/lib/app-data";
import { reviewTagStats } from "@/lib/reviews";
import { accountAgeLabel, ageFromBirthYear } from "@/lib/time";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  parseHeroAge,
} from "@/lib/constants";
import type { Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/profile");
  const profile = await loadProfile(session.id);
  if (!profile) redirect("/login?next=/profile");

  const sp = await searchParams;
  const fromQuery = parseHeroAge(typeof sp.age === "string" ? sp.age : null);
  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    profile.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(profile.birth_year_private))
      : null;

  const stats = reviewTagStats(session.id);
  const unread = await loadUnread(session.id);

  return (
    <ProfileBoard
      nickname={profile.nickname || ""}
      avatarUrl={profile.avatar_url}
      ageBand={fromQuery ?? fromCookie ?? fromProfile ?? 20}
      isAdmin={Boolean(profile.is_admin)}
      ratingAvg={profile.rating_avg}
      ratingCount={profile.rating_count}
      matchCount={profile.successful_match_count}
      accountAge={accountAgeLabel(profile.created_at)}
      unread={unread}
      onTimePct={stats.pct("on_time")}
      friendlyPct={stats.pct("friendly")}
      singAgainPct={Math.max(0, 100 - stats.pct("no_show"))}
      points={Number(profile.points ?? 0)}
    />
  );
}
