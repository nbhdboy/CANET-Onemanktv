import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MatchesBoard } from "@/components/match/MatchesBoard";
import { getSession } from "@/lib/session";
import { loadProfile } from "@/lib/app-data";
import { listMyApplications, listMyInitiated, listMyMatches } from "@/lib/match";
import { canReview } from "@/lib/reviews";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  parseHeroAge,
} from "@/lib/constants";
import { ageFromBirthYear } from "@/lib/time";
import type { Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/matches");
  const profile = await loadProfile(session.id);

  const sp = await searchParams;
  const fromQuery = parseHeroAge(typeof sp.age === "string" ? sp.age : null);
  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    profile?.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(profile.birth_year_private))
      : null;

  const apps = listMyApplications(session.id);
  const initiated = listMyInitiated(session.id);
  const matches = listMyMatches(session.id);

  const waitingReply = apps.filter((a) => a.status === "PENDING");
  const waitingPay = matches.filter((m) => m.status === "PENDING_PAYMENT");
  const matched = matches.filter((m) => m.status === "MATCHED");
  const ended = matches
    .filter(
      (m) =>
        m.status === "COMPLETED" ||
        m.status === "CANCELLED" ||
        m.status === "EXPIRED_PAYMENT",
    )
    .map((m) => ({
      ...m,
      reviewable: canReview(session.id, String(m.id)).ok,
    }));

  return (
    <MatchesBoard
      nickname={profile?.nickname || "歌友"}
      avatarUrl={profile?.avatar_url}
      ageBand={fromQuery ?? fromCookie ?? fromProfile ?? 20}
      pendingRequests={initiated.filter((r) => Number(r.pending_count) > 0)}
      waitingReply={waitingReply}
      waitingPay={waitingPay}
      matched={matched}
      ended={ended}
    />
  );
}
