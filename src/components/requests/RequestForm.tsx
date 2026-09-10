"use client";

import { useActionState, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createRequestAction } from "@/actions/match";
import {
  DURATION_OPTIONS,
  MUSIC_GENRES,
  PREFERENCE_OPTIONS,
  heroByAge,
  type HeroAge,
} from "@/lib/constants";
import { preferredCity, sortCities, venueOptionLabel, venuesMatching } from "@/lib/ktv-venues";
import { avatarPresetOrFallback, isPhotoAvatar } from "@/lib/avatar";
import { durationLabel, formatTwd } from "@/lib/format";
import type { ActionResult, KtvBrand, KtvVenue } from "@/lib/types";

const init: ActionResult = { ok: false };

const field =
  "w-full rounded-2xl border border-black/15 bg-white px-4 h-12 text-[#1a1040]";

function prettyWhen(date: string, time: string) {
  if (!date || !time) return "";
  const parts = date.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!month || !day) return `${date} ${time}`;
  return `${month}/${day} ${time}`;
}

export function RequestForm({
  brands,
  venues,
  nickname,
  avatarUrl,
  ageBand,
}: {
  brands: KtvBrand[];
  venues: KtvVenue[];
  nickname: string;
  avatarUrl?: string | null;
  ageBand: HeroAge;
}) {
  const hero = heroByAge(ageBand);
  const preset = avatarPresetOrFallback(avatarUrl);
  const photo = isPhotoAvatar(avatarUrl) ? avatarUrl : null;
  const [brandId, setBrandId] = useState(brands[0]?.id || "");
  const [city, setCity] = useState(() =>
    preferredCity(
      venues.filter((v) => v.brand_id === (brands[0]?.id || "") && v.enabled).map((v) => v.city),
    ),
  );
  const [venueId, setVenueId] = useState(() => {
    const firstBrand = brands[0]?.id || "";
    const firstCity = preferredCity(
      venues.filter((v) => v.brand_id === firstBrand && v.enabled).map((v) => v.city),
    );
    return (
      venues.find((v) => v.brand_id === firstBrand && v.enabled && v.city === firstCity)?.id || ""
    );
  });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("3");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(createRequestAction, init);
  const [formError, setFormError] = useState("");

  const citiesForBrand = useMemo(
    () =>
      sortCities(
        venues.filter((v) => v.brand_id === brandId && v.enabled).map((v) => v.city),
      ),
    [venues, brandId],
  );
  const filtered = useMemo(
    () => venuesMatching(venues, { brandId, city }),
    [venues, brandId, city],
  );
  const venue = filtered.find((v) => v.id === venueId) ?? filtered[0];
  const split = cost ? Math.round(Number(cost) / 2) : null;
  const hours = Number(duration) || 3;

  function pickBrand(id: string) {
    setBrandId(id);
    const nextCity = preferredCity(
      venues.filter((v) => v.brand_id === id && v.enabled).map((v) => v.city),
    );
    setCity(nextCity);
    const next = venues.find((v) => v.brand_id === id && v.enabled && v.city === nextCity);
    setVenueId(next?.id || "");
  }

  function pickCity(nextCity: string) {
    setCity(nextCity);
    const next = venues.find((v) => v.brand_id === brandId && v.enabled && v.city === nextCity);
    setVenueId(next?.id || "");
  }

  return (
    <main className="relative min-h-screen text-white" style={{ backgroundColor: hero.bg }}>
      <div className="grain pointer-events-none absolute inset-0 opacity-35" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-4 right-0 select-none uppercase opacity-[0.12]"
        style={{
          fontFamily: "Anton, sans-serif",
          fontSize: "clamp(80px, 18vw, 200px)",
          letterSpacing: "-0.06em",
          lineHeight: 0.8,
        }}
      >
        排場
      </div>

      <form
        action={formAction}
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          if (!genres.length) {
            e.preventDefault();
            setFormError("請至少選擇一種音樂類型。");
            return;
          }
          setFormError("");
        }}
        className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:px-10 lg:pb-16 lg:pt-10"
        style={{ colorScheme: "light" }}
      >
        <div className="mb-8 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
            K歌 +1 · 排一場 {hero.label}
          </p>
          <Link
            href="/"
            aria-label="回到找歌友"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 text-white transition-colors hover:bg-white hover:text-[#1a1040]"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </Link>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <aside className="compose-poster lg:sticky lg:top-24">
            <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-white/75">
              LIVE 預覽 · 草稿
            </p>
            <div className="relative mx-auto" style={{ maxWidth: 280, height: 400 }}>
              <div
                aria-hidden
                className="absolute inset-0 translate-x-4 rotate-[9deg] rounded-[36px] bg-white/20"
              />
              <div
                aria-hidden
                className="absolute inset-0 -translate-x-3 rotate-[-7deg] rounded-[36px] bg-black/18"
              />
              <div className="deck-float relative h-full">
                <article
                  className="relative h-full overflow-hidden text-white"
                  style={{
                    borderRadius: 36,
                    background: photo
                      ? "#12081f"
                      : `linear-gradient(165deg, ${preset.from} 0%, ${preset.to} 58%, #1a1040 100%)`,
                    boxShadow: "0 28px 70px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.12)",
                  }}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  <p className="absolute left-4 top-4 z-10 rounded-full border border-white/40 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-white/90">
                    {date && time ? "即將上架" : "草稿"}
                  </p>
                  {!photo ? (
                    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
                      <span className="text-7xl">{preset.emoji}</span>
                    </div>
                  ) : null}
                  <div
                    className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 pt-16"
                    style={{
                      background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(16,10,28,0.84) 72%)",
                    }}
                  >
                    <p
                      className={`text-[15px] font-medium leading-snug ${
                        note.trim() ? "text-white/95" : "text-white/55"
                      }`}
                    >
                      {note.trim() ? `「${note.trim()}」` : "寫一句想唱的話，會出現在這裡"}
                    </p>
                    <p className="mt-3 text-[22px] font-bold leading-tight">{nickname}</p>
                    <p className="mt-1 text-sm text-white/88">
                      {prettyWhen(date, time) || "還沒選開唱時間"}
                      {" · "}
                      {venue ? venue.name : "還沒選門市"}
                    </p>
                    <p className="mt-3 text-sm font-semibold tracking-wide">去配對 →</p>
                  </div>
                </article>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-white/80">
              發布後，找歌友會看到這張卡。
              {genres.length ? ` 曲風：${genres.join(" / ")}` : ""}
              {Number.isFinite(split) && split != null ? ` · 約 ${formatTwd(split)} / 人` : ""}
              {` · ${durationLabel(hours)}`}
            </p>
          </aside>

          <div className="compose-panel space-y-8">
            <div>
              <h1
                className="uppercase text-white"
                style={{
                  fontFamily: "Anton, sans-serif",
                  fontSize: "clamp(40px, 7vw, 76px)",
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                }}
              >
                排一場
                <br />
                剛剛好
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/88">
                每一筆需求最多只能成功媒合 1 位 +1。預覽卡會跟著你填的內容變，填完就可以發布。
              </p>
            </div>

            <Track n="01" title="去哪唱">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-white">KTV 品牌</span>
                <select
                  name="brandId"
                  value={brandId}
                  onChange={(e) => pickBrand(e.target.value)}
                  className={field}
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-white">城市</span>
                <select
                  aria-label="城市"
                  value={city}
                  onChange={(e) => pickCity(e.target.value)}
                  className={field}
                >
                  {citiesForBrand.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-white">分店</span>
                <select
                  name="venueId"
                  required
                  value={filtered.some((v) => v.id === venueId) ? venueId : filtered[0]?.id || ""}
                  onChange={(e) => setVenueId(e.target.value)}
                  className={field}
                >
                  {filtered.map((v) => (
                    <option key={v.id} value={v.id}>
                      {venueOptionLabel(v)}
                    </option>
                  ))}
                </select>
              </label>
            </Track>

            <Track n="02" title="何時唱">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-white">日期</span>
                  <input
                    name="date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={field}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-white">開唱時間</span>
                  <input
                    name="time"
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={field}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-white">預計唱多久</span>
                <select
                  name="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={field}
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </Track>

            <Track n="03" title="怎麼唱">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-white">音樂類型</legend>
                <div className="flex flex-wrap gap-2">
                  {MUSIC_GENRES.map((g) => {
                    const on = genres.includes(g);
                    return (
                      <label
                        key={g}
                        className={`inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm ${
                          on ? "bg-white text-[#1a1040]" : "border border-white/45 text-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="genres"
                          value={g}
                          checked={on}
                          onChange={() => {
                            setFormError("");
                            setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
                          }}
                          className="h-4 w-4 min-h-0"
                          style={{ minHeight: 0 }}
                        />
                        {g}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-white">唱歌習慣（選填）</legend>
                <div className="flex flex-wrap gap-2">
                  {PREFERENCE_OPTIONS.map((p) => {
                    const on = prefs.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm ${
                          on ? "bg-white text-[#1a1040]" : "border border-white/45 text-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="preferences"
                          value={p.id}
                          checked={on}
                          onChange={() =>
                            setPrefs((cur) =>
                              cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id],
                            )
                          }
                          className="h-4 w-4 min-h-0"
                          style={{ minHeight: 0 }}
                        />
                        {p.emoji} {p.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-white">預估兩人總費用（選填）</span>
                <input
                  name="cost"
                  type="number"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={field}
                  placeholder="例如 900"
                />
                {split != null && Number.isFinite(split) ? (
                  <p className="text-sm text-white/90">
                    兩人分攤預估 {formatTwd(split)} / 人
                    <span className="mt-1 block text-xs text-white/70">
                      僅供參考，實際價格依 KTV 現場與官方公告為準。
                    </span>
                  </p>
                ) : null}
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-white">額外需求（最多 200 字）</span>
                <textarea
                  name="note"
                  maxLength={200}
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例如：想唱周杰倫，找同齡一起分攤"
                  className="w-full rounded-2xl border border-black/15 bg-white p-4 text-[#1a1040] placeholder:text-[#6b6280]"
                />
              </label>
            </Track>

            {formError || state.error ? (
              <p className="rounded-2xl bg-black/35 px-4 py-3 text-sm font-medium text-amber-100" role="alert">
                {formError || state.error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="flex min-h-12 w-full max-w-xs items-center justify-center border border-white text-sm font-semibold tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-[#1a1040] disabled:opacity-60"
            >
              {pending ? "發布中…" : "發布這場歌局"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

function Track({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/25 pt-5">
      <p
        className="mb-3 text-white/55"
        style={{ fontFamily: "Anton, sans-serif", fontSize: 28, letterSpacing: "0.06em", lineHeight: 1 }}
      >
        {n} <span className="ml-2 text-base font-semibold tracking-wide text-white">{title}</span>
      </p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
