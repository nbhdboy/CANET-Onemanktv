import { HomeExperience } from "@/components/home/HomeExperience";
import { getSession } from "@/lib/session";
import { getBrands, getCities, getVenues, listFeed } from "@/lib/match";
import { heroByAge } from "@/lib/constants";
import type { Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const session = await getSession();
  const age = heroByAge(typeof sp.age === "string" ? sp.age : "20").age;
  const filters = {
    when: typeof sp.when === "string" ? sp.when : undefined,
    city: typeof sp.city === "string" ? sp.city : undefined,
    brand: typeof sp.brand === "string" ? sp.brand : undefined,
    venue: typeof sp.venue === "string" ? sp.venue : undefined,
    posted: typeof sp.posted === "string" ? sp.posted : undefined,
  };
  const items = listFeed({ ...filters, age }, session?.id);
  const brands = getBrands();
  const venues = getVenues();
  const cities = getCities();

  return (
    <HomeExperience
      initialItems={items}
      initialAge={age}
      filters={filters}
      cities={cities}
      brands={brands}
      venues={venues}
      sessionId={session?.id}
    />
  );
}
