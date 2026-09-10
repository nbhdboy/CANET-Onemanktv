"use client";

import { useEffect, useMemo, useState } from "react";
import type { KtvBrand, KtvVenue } from "@/lib/types";
import { preferredCity, sortCities, venuesMatching } from "@/lib/ktv-venues";

export type FeedFilterState = {
  when?: string;
  city?: string;
  brand?: string;
  venue?: string;
  posted?: string;
  age?: number;
};

export function FeedFilters({
  cities,
  brands,
  venues,
  current,
  onColor = false,
  accent,
  accentSoft,
  onApply,
}: {
  cities: string[];
  brands: KtvBrand[];
  venues: KtvVenue[];
  current: FeedFilterState;
  onColor?: boolean;
  accent?: string;
  accentSoft?: string;
  onApply?: (next: FeedFilterState) => void;
}) {
  const when = current.when || "";
  const [city, setCity] = useState(current.city || "");
  const [brand, setBrand] = useState(current.brand || "");
  const [venue, setVenue] = useState(current.venue || "");
  const [posted, setPosted] = useState(current.posted || "");

  useEffect(() => {
    setCity(current.city || "");
    setBrand(current.brand || "");
    setVenue(current.venue || "");
    setPosted(current.posted || "");
  }, [current.city, current.brand, current.venue, current.posted]);

  const cityOptions = useMemo(() => {
    const fromBrand = venuesMatching(venues, { brandId: brand || undefined }).map((v) => v.city);
    return sortCities(fromBrand.length ? fromBrand : cities);
  }, [venues, brand, cities]);

  const brandOptions = useMemo(() => {
    if (!city) return brands;
    return brands.filter((b) => venues.some((v) => v.brand_id === b.id && v.city === city && v.enabled !== 0));
  }, [brands, venues, city]);

  const venueOptions = useMemo(
    () => venuesMatching(venues, { city: city || undefined, brandId: brand || undefined }),
    [venues, city, brand],
  );

  const chips = [
    { id: "now", label: "🔥 現在就唱" },
    { id: "today", label: "今天" },
    { id: "tonight", label: "今晚" },
    { id: "tomorrow", label: "明天" },
  ];

  const glass = onColor;
  const chipAccent = accent || "#F472B6";
  const chipAccentSoft = accentSoft || accent || "#FB7185";

  const idle = glass
    ? "compose-glass-chip text-white"
    : "bg-white text-foreground border border-black/10";
  const active = glass
    ? "compose-glass-chip is-on text-white"
    : "bg-purple-700 text-white";
  const field = glass
    ? "compose-glass-field w-full rounded-2xl border-0 px-3 h-11 text-sm text-[#1a1040] outline-none"
    : "rounded-xl bg-white px-2.5 h-10 text-sm";
  const chipCls =
    "shrink-0 rounded-full px-3.5 h-9 text-xs font-medium inline-flex items-center cursor-pointer";
  const clearCls = glass
    ? "compose-glass-chip shrink-0 rounded-full px-3.5 h-9 text-xs font-medium text-white transition-colors hover:bg-white/25"
    : "shrink-0 rounded-full border border-black/20 px-3 h-9 text-xs font-medium transition-colors hover:bg-black/5";

  const hasFilters = Boolean(when || city || brand || venue || posted);

  function apply(patch: Partial<FeedFilterState>) {
    const merged: FeedFilterState = {
      ...current,
      city,
      brand,
      venue,
      posted,
      ...patch,
    };
    const cleaned: FeedFilterState = { age: merged.age };
    if (merged.when) cleaned.when = merged.when;
    if (merged.city) cleaned.city = merged.city;
    if (merged.brand) cleaned.brand = merged.brand;
    if (merged.venue) cleaned.venue = merged.venue;
    if (merged.posted) cleaned.posted = merged.posted;

    if (onApply) {
      onApply(cleaned);
      return;
    }
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(cleaned)) {
      if (v != null && v !== "") next.set(k, String(v));
    }
    const q = next.toString();
    window.location.assign(q ? `/?${q}#feed` : "/#feed");
  }

  function pickCity(nextCity: string) {
    setCity(nextCity);
    const brandsInCity = brands.filter((b) =>
      venues.some((v) => v.brand_id === b.id && (!nextCity || v.city === nextCity) && v.enabled !== 0),
    );
    const nextBrand = brand && brandsInCity.some((b) => b.id === brand) ? brand : "";
    setBrand(nextBrand);
    const nextVenues = venuesMatching(venues, {
      city: nextCity || undefined,
      brandId: nextBrand || undefined,
    });
    setVenue(nextVenues.some((v) => v.id === venue) ? venue : "");
  }

  function pickBrand(nextBrand: string) {
    setBrand(nextBrand);
    const citiesForBrand = sortCities(
      venuesMatching(venues, { brandId: nextBrand || undefined }).map((v) => v.city),
    );
    const nextCity =
      city && (!nextBrand || citiesForBrand.includes(city))
        ? city
        : nextBrand
          ? preferredCity(citiesForBrand)
          : city;
    if (nextBrand && city && !citiesForBrand.includes(city)) setCity(nextCity);
    const nextVenues = venuesMatching(venues, {
      city: (nextBrand && city && !citiesForBrand.includes(city) ? nextCity : city) || undefined,
      brandId: nextBrand || undefined,
    });
    setVenue(nextVenues.some((v) => v.id === venue) ? venue : "");
  }

  const filtersBody = (
    <>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
          {chips.map((c) => {
            const on = when === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => apply({ when: when === c.id ? undefined : c.id })}
                className={`${chipCls} ${on ? active : idle}`}
                style={
                  glass && on
                    ? {
                        background: `linear-gradient(135deg, ${chipAccentSoft}, ${chipAccent})`,
                        boxShadow: `0 8px 18px ${chipAccent}55`,
                      }
                    : undefined
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setCity("");
              setBrand("");
              setVenue("");
              setPosted("");
              apply({
                when: undefined,
                city: undefined,
                brand: undefined,
                venue: undefined,
                posted: undefined,
              });
            }}
            className={clearCls}
          >
            清除篩選
          </button>
        ) : null}
      </div>
      <form
        action="/#feed"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          apply({});
        }}
        className={glass ? "mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" : "grid grid-cols-2 gap-1.5 sm:grid-cols-4"}
        style={glass ? { colorScheme: "light" } : undefined}
      >
        {when ? <input type="hidden" name="when" value={when} /> : null}
        {current.age ? <input type="hidden" name="age" value={current.age} /> : null}
        <select
          aria-label="城市"
          name="city"
          value={city}
          onChange={(e) => pickCity(e.target.value)}
          className={field}
        >
          <option value="">全部城市</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="KTV 品牌"
          name="brand"
          value={brand}
          onChange={(e) => pickBrand(e.target.value)}
          className={field}
        >
          <option value="">全部品牌</option>
          {brandOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          aria-label="門市"
          name="venue"
          value={venueOptions.some((v) => v.id === venue) ? venue : ""}
          onChange={(e) => setVenue(e.target.value)}
          className={field}
        >
          <option value="">全部門市</option>
          {venueOptions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}（{v.city}）
            </option>
          ))}
        </select>
        <select
          aria-label="發布時間"
          name="posted"
          value={posted}
          onChange={(e) => setPosted(e.target.value)}
          className={field}
        >
          <option value="">最新</option>
          <option value="1h">1 小時內</option>
          <option value="3h">3 小時內</option>
          <option value="6h">6 小時內</option>
          <option value="24h">24 小時內</option>
        </select>
        <button
          type="submit"
          className={
            glass
              ? "col-span-2 sm:col-span-4 inline-flex h-11 items-center justify-center rounded-full bg-white text-sm font-semibold tracking-[0.12em] text-[#1a1040] shadow-[0_8px_22px_rgba(0,0,0,0.08)] transition-colors hover:bg-white/95"
              : "col-span-2 sm:col-span-4 h-10 rounded-xl text-sm font-medium bg-white"
          }
        >
          套用篩選
        </button>
      </form>
    </>
  );

  if (!glass) {
    return <div className="space-y-3">{filtersBody}</div>;
  }

  return (
    <div className="compose-glass relative overflow-hidden rounded-[24px] p-4 sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-50 blur-xl"
        style={{
          background: `radial-gradient(circle, ${chipAccent}88 0%, transparent 70%)`,
        }}
      />
      <div className="relative space-y-1">{filtersBody}</div>
    </div>
  );
}
