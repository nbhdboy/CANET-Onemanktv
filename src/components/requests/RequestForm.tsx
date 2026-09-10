"use client";

import { useActionState, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  Lock,
  MapPin,
  MessageCircle,
  Mic2,
  Music2,
  Send,
  Wallet,
} from "lucide-react";
import { createRequestAction } from "@/actions/match";
import {
  DURATION_OPTIONS,
  MUSIC_GENRES,
  PREFERENCE_OPTIONS,
  heroByAge,
  type HeroAge,
} from "@/lib/constants";
import { preferredCity, sortCities, venueOptionLabel, venuesMatching } from "@/lib/ktv-venues";
import { avatarPresetOrFallback, avatarPresetSrc, isPhotoAvatar } from "@/lib/avatar";
import { durationLabel, formatTwd } from "@/lib/format";
import type { ActionResult, KtvBrand, KtvVenue } from "@/lib/types";

const init: ActionResult = { ok: false };

const field =
  "compose-glass-field w-full rounded-2xl border-0 px-4 h-12 text-[#1a1040] outline-none";

const TIME_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const TIME_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

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
  const discImage = photo || avatarPresetSrc(avatarUrl);
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

  const accent = hero.glassGlow;
  const accentSoft = hero.glassGlowSoft;
  const ctaGradient = `linear-gradient(110deg, ${hero.ctaTo} 0%, ${accent} 48%, ${hero.ctaFrom} 100%)`;

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
    <main className="relative min-h-screen overflow-hidden text-white" style={{ backgroundColor: hero.bg }}>
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
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full opacity-50 blur-2xl"
        style={{ background: `radial-gradient(circle, ${accent}aa 0%, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-[38%] h-40 w-40 rounded-full opacity-40 blur-2xl"
        style={{ background: `radial-gradient(circle, ${accentSoft}88 0%, transparent 70%)` }}
      />

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
                    background: discImage
                      ? "#12081f"
                      : `linear-gradient(165deg, ${preset.from} 0%, ${preset.to} 58%, #1a1040 100%)`,
                    boxShadow: "0 28px 70px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.12)",
                  }}
                >
                  {discImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={discImage}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  <p className="absolute left-4 top-4 z-10 rounded-full border border-white/40 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-white/90">
                    {date && time ? "即將上架" : "草稿"}
                  </p>
                  {!discImage ? (
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

          <div className="compose-panel relative">
            <div className="compose-glass relative overflow-hidden rounded-[28px] p-5 sm:p-7 lg:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-60 blur-xl"
                style={{ background: `radial-gradient(circle, ${accent}99 0%, transparent 68%)` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full border border-white/25 opacity-40"
              />

              <div className="relative mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/45 bg-white/15 text-white"
                      aria-hidden
                    >
                      <Mic2 size={18} />
                    </span>
                    <div>
                      <h1
                        className="text-white"
                        style={{
                          fontFamily: "Anton, sans-serif",
                          fontSize: "clamp(34px, 5.5vw, 52px)",
                          letterSpacing: "-0.03em",
                          lineHeight: 0.95,
                        }}
                      >
                        排一場
                        <br />
                        剛剛好
                      </h1>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/88">
                        每一筆需求最多只能成功媒合 1 位 +1。預覽卡會跟著你填的內容變，填完就可以發布。
                      </p>
                    </div>
                  </div>
                </div>
                <ol className="flex shrink-0 items-center gap-2 self-start sm:pt-1" aria-hidden>
                  {[
                    { n: 1, label: "去哪唱" },
                    { n: 2, label: "何時唱" },
                    { n: 3, label: "怎麼唱" },
                  ].map((step, i) => (
                    <li key={step.n} className="flex items-center gap-2">
                      {i > 0 ? <span className="h-px w-4 bg-white/45 sm:w-6" /> : null}
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0
                              ? "bg-white text-[#1a1040]"
                              : "border border-white/70 text-white"
                          }`}
                        >
                          {step.n}
                        </span>
                        <span className="hidden text-[10px] tracking-wide text-white/75 sm:block">
                          {step.label}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="relative space-y-7">
                <Track n="01" title="去哪唱" accent={accent}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <IconField icon={<Mic2 size={16} />} label="KTV 品牌">
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
                    </IconField>
                    <IconField icon={<MapPin size={16} />} label="城市">
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
                    </IconField>
                    <IconField icon={<Building2 size={16} />} label="分店">
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
                    </IconField>
                  </div>
                </Track>

                <Track n="02" title="何時唱" accent={accent}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <IconField icon={<CalendarDays size={16} />} label="日期">
                      <input
                        name="date"
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={field}
                      />
                    </IconField>
                    <IconField icon={<Clock3 size={16} />} label="開唱時間">
                      <GlassTimeSelect value={time} onChange={setTime} required />
                    </IconField>
                    <IconField icon={<Music2 size={16} />} label="預計唱多久">
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
                    </IconField>
                  </div>
                </Track>

                <Track n="03" title="怎麼唱" accent={accent}>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-white">音樂類型 · 可複選</legend>
                    <div className="flex flex-wrap gap-2">
                      {MUSIC_GENRES.map((g) => {
                        const on = genres.includes(g);
                        return (
                          <label
                            key={g}
                            className={`compose-glass-chip inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm ${
                              on ? "is-on" : "text-white"
                            }`}
                            style={
                              on
                                ? {
                                    background: `linear-gradient(135deg, ${accentSoft}, ${accent})`,
                                    boxShadow: `0 8px 20px ${accent}55`,
                                  }
                                : undefined
                            }
                          >
                            <input
                              type="checkbox"
                              name="genres"
                              value={g}
                              checked={on}
                              onChange={() => {
                                setFormError("");
                                setGenres((cur) =>
                                  cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g],
                                );
                              }}
                              className="sr-only"
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
                            className={`compose-glass-chip inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm ${
                              on ? "is-on" : "text-white"
                            }`}
                            style={
                              on
                                ? {
                                    background: `linear-gradient(135deg, ${hero.ctaTo}, ${accent})`,
                                    boxShadow: `0 8px 20px ${accent}55`,
                                  }
                                : undefined
                            }
                          >
                            <input
                              type="checkbox"
                              name="preferences"
                              value={p.id}
                              checked={on}
                              onChange={() =>
                                setPrefs((cur) =>
                                  cur.includes(p.id)
                                    ? cur.filter((x) => x !== p.id)
                                    : [...cur, p.id],
                                )
                              }
                              className="sr-only"
                            />
                            {p.emoji} {p.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <IconField icon={<Wallet size={16} />} label="預估兩人總費用（選填）">
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
                        <p className="mt-1.5 text-sm text-white/90">
                          兩人分攤預估 {formatTwd(split)} / 人
                          <span className="mt-1 block text-xs text-white/70">
                            僅供參考，實際價格依 KTV 現場與官方公告為準。
                          </span>
                        </p>
                      ) : null}
                    </IconField>
                    <IconField icon={<MessageCircle size={16} />} label="額外需求（最多 200 字）">
                      <textarea
                        name="note"
                        maxLength={200}
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="例如：想唱周杰倫，找同齡一起分攤"
                        className="compose-glass-field w-full rounded-2xl border-0 p-4 text-[#1a1040] outline-none placeholder:text-[#6b6280] focus:ring-2 focus:ring-white/70"
                      />
                    </IconField>
                  </div>
                </Track>
              </div>

              {formError || state.error ? (
                <p
                  className="relative mt-6 rounded-2xl bg-black/35 px-4 py-3 text-sm font-medium text-amber-100"
                  role="alert"
                >
                  {formError || state.error}
                </p>
              ) : null}

              <div className="relative mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold tracking-[0.12em] text-white transition-transform hover:scale-[1.01] disabled:opacity-60 sm:max-w-md"
                  style={{
                    background: ctaGradient,
                    boxShadow: `0 14px 36px ${accent}66`,
                  }}
                >
                  <Send size={16} />
                  {pending ? "發布中…" : "發布這場歌局"}
                  <ArrowRight size={16} />
                </button>
                <p className="flex items-center gap-2 text-xs leading-relaxed text-white/80 sm:max-w-[220px]">
                  <Lock size={14} className="shrink-0 opacity-80" />
                  聯絡方式要媒合成功才會交換，公開資料不會外流。
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}

function Track({
  n,
  title,
  accent,
  children,
}: {
  n: string;
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-white/25 pt-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            background: `linear-gradient(145deg, ${accent}cc, ${accent})`,
            boxShadow: `0 8px 18px ${accent}44`,
          }}
        >
          {n}
        </span>
        <p className="text-base font-semibold tracking-wide text-white">{title}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function IconField({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="block min-w-0 space-y-1.5">
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
        <span className="text-white/75" aria-hidden>
          {icon}
        </span>
        {label}
      </p>
      {children}
    </div>
  );
}

function GlassTimeSelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
}) {
  const [hour = "", minute = ""] = value ? value.split(":") : ["", ""];
  const snappedMinute = TIME_MINUTES.includes(minute) ? minute : "";

  function setPart(nextHour: string, nextMinute: string) {
    if (!nextHour && !nextMinute) {
      onChange("");
      return;
    }
    onChange(`${nextHour || "00"}:${nextMinute || "00"}`);
  }

  return (
    <div className="compose-glass-time">
      <input type="hidden" name="time" value={value} />
      <select
        aria-label="開唱時間（時）"
        required={required}
        value={hour}
        onChange={(e) => setPart(e.target.value, snappedMinute || "00")}
        className={field}
      >
        <option value="" disabled>
          --
        </option>
        {TIME_HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="compose-glass-time-sep" aria-hidden>
        :
      </span>
      <select
        aria-label="開唱時間（分）"
        required={required}
        value={snappedMinute}
        onChange={(e) => setPart(hour || "00", e.target.value)}
        className={field}
      >
        <option value="" disabled>
          --
        </option>
        {TIME_MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
