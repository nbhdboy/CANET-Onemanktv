import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listApplicantsApp, loadProfile, loadRequestCard } from "@/lib/app-data";
import { ApplicantsBoard } from "@/components/match/ApplicantsBoard";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  parseHeroAge,
} from "@/lib/constants";
import { ageFromBirthYear } from "@/lib/time";

import type { IdParams } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function ApplicantsPage({ params }: { params: IdParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const item = await loadRequestCard(id, session.id);
  if (!item || item.initiator.id !== session.id) notFound();
  const applicants = await listApplicantsApp(session.id, id);
  const profile = await loadProfile(session.id);

  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    profile?.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(profile.birth_year_private))
      : null;
  const ageBand = fromCookie ?? fromProfile ?? 20;

  return (
    <ApplicantsBoard ageBand={ageBand} request={item} applicants={applicants} />
  );
}
