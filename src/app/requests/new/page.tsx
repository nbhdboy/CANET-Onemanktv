import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RequestForm } from "@/components/requests/RequestForm";
import { getSession } from "@/lib/session";
import { loadProfile } from "@/lib/app-data";
import { getBrands, getVenues } from "@/lib/match";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  parseHeroAge,
} from "@/lib/constants";
import { ageFromBirthYear } from "@/lib/time";
import type { Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const sp = await searchParams;
  const fromQuery = parseHeroAge(typeof sp.age === "string" ? sp.age : null);
  const ageQuery = fromQuery ? `?age=${fromQuery}` : "";

  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/requests/new${ageQuery}`)}`);
  const profile = await loadProfile(session.id);
  if (!profile?.profile_completed) redirect("/onboarding");

  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    profile.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(profile.birth_year_private))
      : null;

  return (
    <RequestForm
      brands={getBrands()}
      venues={getVenues()}
      nickname={profile.nickname || "歌友"}
      avatarUrl={profile.avatar_url}
      ageBand={fromQuery ?? fromCookie ?? fromProfile ?? 20}
    />
  );
}
