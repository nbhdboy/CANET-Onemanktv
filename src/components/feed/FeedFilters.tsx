"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { KtvBrand, KtvVenue } from "@/lib/types";
import { preferredCity, sortCities, venuesMatching } from "@/lib/ktv-venues";

export function FeedFilters({
  cities,
  brands,
  venues,
  current,
  onColor = false,
}: {
  cities: string[];
  brands: KtvBrand[];
  venues: KtvVenue[];
  current: {
    when?: string;
    city?: string;
    brand?: string;
    venue?: string;
    posted?: string;
    age?: number;
  };
  onColor?: boolean;
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
  const idle = onColor
    ? "bg-white/20 text-white border border-white/40"
    : "bg-white text-foreground";
  const active = onColor
    ? "bg-white text-foreground"
    : "bg-purple-700 text-white";
  const field = onColor
    ? "rounded-2xl bg-white/90 px-3 h-12 text-foreground"
    : "rounded-2xl bg-white px-3 h-12";

  function href(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const merged = { ...current, city, brand, venue, posted, ...patch };
    for (const [k, v] of Object.entries(merged)) {
      if (v != null && v !== "") next.set(k, String(v));
    }
    const q = next.toString();
    return q ? `/?${q}#feed` : "/#feed";
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((c) => (
          <Link
            key={c.id}
            href={href({ when: when === c.id ? undefined : c.id })}
            className={`shrink-0 rounded-full px-4 h-11 text-sm font-medium inline-flex items-center ${
              when === c.id ? active : idle
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>
      <form
        action="/#feed"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.assign(href({}));
        }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
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
          className={`col-span-2 sm:col-span-4 h-11 rounded-2xl font-medium ${
            onColor ? "bg-white text-foreground" : "bg-white"
          }`}
        >
          套用篩選
        </button>
      </form>
    </div>
  );
}
