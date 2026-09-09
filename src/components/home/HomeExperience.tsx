"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToonHero } from "@/components/hero/ToonHero";
import { FeedFilters } from "@/components/feed/FeedFilters";
import { SpatialRequestDeck } from "@/components/feed/SpatialRequestDeck";
import { EmptyFeed } from "@/components/feed/EmptyFeed";
import { EqualizerLoader } from "@/components/ui/EqualizerLoader";
import { fetchFeedAction } from "@/actions/match";
import { HERO_IMAGES, rememberHeroAge } from "@/lib/constants";
import type { KtvBrand, KtvVenue, RequestCardData } from "@/lib/types";
import type { FeedFilters as FeedFilterValues } from "@/lib/match";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

export function HomeExperience({
  initialItems,
  initialAge,
  filters,
  cities,
  brands,
  venues,
  sessionId,
}: {
  initialItems: RequestCardData[];
  initialAge: number;
  filters: Omit<FeedFilterValues, "age">;
  cities: string[];
  brands: KtvBrand[];
  venues: KtvVenue[];
  sessionId?: string;
}) {
  const router = useRouter();
  const startIndex = Math.max(
    0,
    HERO_IMAGES.findIndex((h) => h.age === initialAge),
  );
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const hero = HERO_IMAGES[activeIndex];

  useEffect(() => {
    setItems(initialItems);
    setActiveIndex(startIndex);
    rememberHeroAge(HERO_IMAGES[startIndex].age);
  }, [initialItems, startIndex]);

  useEffect(() => {
    rememberHeroAge(hero.age);
  }, [hero.age]);

  function go(dir: "next" | "prev") {
    const nextIndex = dir === "next" ? (activeIndex + 1) % 4 : (activeIndex + 3) % 4;
    setActiveIndex(nextIndex);
    const age = HERO_IMAGES[nextIndex].age;
    rememberHeroAge(age);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, String(v));
    }
    params.set("age", String(age));
    startTransition(async () => {
      const nextItems = await fetchFeedAction({ ...filters, age });
      setItems(nextItems);
      router.replace(`/?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: hero.bg,
        transition: `background-color 650ms ${EASE}`,
      }}
    >
      <ToonHero activeIndex={activeIndex} onNavigate={go} />
      <section
        id="feed"
        className="relative w-full"
        style={{
          backgroundColor: hero.bg,
          transition: `background-color 650ms ${EASE}`,
        }}
      >
        <div className="grain pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto w-full max-w-[1120px] px-4 pt-10">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] uppercase text-white/90">
                找歌友 · {hero.label}
              </p>
              <h1
                className="mt-1 text-white uppercase"
                style={{
                  fontFamily: "Anton, sans-serif",
                  fontSize: "clamp(32px, 6vw, 64px)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                兩個人，剛剛好。
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/85">
                只顯示 {hero.minAge}–{hero.maxAge} 歲發起人的唱歌需求。
              </p>
            </div>
            <Link
              href={`/requests/new?age=${hero.age}`}
              className="hidden sm:inline-flex h-12 px-5 rounded-2xl border-2 border-white text-white font-semibold items-center hover:bg-white/12"
            >
              ＋ 發起唱歌需求
            </Link>
          </div>
          <FeedFilters
            cities={cities}
            brands={brands}
            venues={venues}
            current={{ ...filters, age: hero.age }}
            onColor
          />
        </div>
        <div
          className="relative mt-8 w-full overflow-x-clip pb-36 lg:pb-16"
          style={{ opacity: isPending ? 0.85 : 1, transition: "opacity 200ms ease" }}
        >
          {isPending ? (
            <div className="mx-auto max-w-[1120px] px-4">
              <div className="rounded-3xl bg-white/90 p-10 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
                <EqualizerLoader label="載入中" />
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="mx-auto max-w-[1120px] px-4">
              <EmptyFeed ageLabel={hero.label} age={hero.age} onColor />
            </div>
          ) : (
            <SpatialRequestDeck items={items} sessionId={sessionId} />
          )}
        </div>
      </section>
    </main>
  );
}
