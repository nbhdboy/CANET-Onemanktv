import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadNotifications, loadProfile, loadUnread } from "@/lib/app-data";
import { NotificationsBoard } from "@/components/notifications/NotificationsBoard";
import { avatarPresetOrFallback } from "@/lib/avatar";
import { ageFromBirthYear } from "@/lib/time";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  parseHeroAge,
} from "@/lib/constants";
import type { Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/notifications");
  const profile = await loadProfile(session.id);
  const items = await loadNotifications(session.id);
  const unread = await loadUnread(session.id);

  const sp = await searchParams;
  const fromQuery = parseHeroAge(typeof sp.age === "string" ? sp.age : null);
  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    profile?.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(profile.birth_year_private))
      : null;
  const ageBand = fromQuery ?? fromCookie ?? fromProfile ?? 20;
  const preset = avatarPresetOrFallback(profile?.avatar_url);

  return (
    <NotificationsBoard
      ageBand={ageBand}
      unread={unread}
      discFrom={preset.from}
      discTo={preset.to}
      items={items}
    />
  );
}
