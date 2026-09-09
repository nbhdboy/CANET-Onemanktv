export const APP_NAME = "K歌 +1";
export const APP_TAGLINE = "一個人想唱 KTV？找另一個一個人，兩個人剛剛好。";
export const TIMEZONE = "Asia/Taipei";
export const CURRENCY = "TWD";
export const SESSION_COOKIE = "kplus1_session";
export const HERO_AGE_COOKIE = "kplus1_hero_age";

export const MUSIC_GENRES = [
  "華語",
  "台語",
  "粵語",
  "英文",
  "日文",
  "KPOP",
  "動漫",
  "經典老歌",
  "不拘",
] as const;

export const PREFERENCE_OPTIONS = [
  { id: "no_smoke", label: "希望不要抽菸", emoji: "🚭" },
  { id: "no_alcohol", label: "不喝酒", emoji: "🍺" },
  { id: "can_drink", label: "可以喝酒", emoji: "🍻" },
  { id: "share_mic", label: "麥克風平均分", emoji: "🎤" },
  { id: "casual", label: "隨性唱", emoji: "🎵" },
] as const;

export const DURATION_OPTIONS = [
  { value: 2, label: "2 小時" },
  { value: 3, label: "3 小時" },
  { value: 4, label: "4 小時" },
  { value: 5, label: "5 小時+" },
] as const;

export const POSITIVE_REVIEW_TAGS = [
  { id: "on_time", label: "準時", emoji: "⏰" },
  { id: "friendly", label: "好相處", emoji: "😊" },
  { id: "share_mic", label: "麥克風會分享", emoji: "🎤" },
  { id: "vibe", label: "很會帶氣氛", emoji: "🎵" },
  { id: "respect", label: "尊重他人", emoji: "👍" },
  { id: "communicate", label: "好溝通", emoji: "💬" },
] as const;

export const NEGATIVE_REVIEW_TAGS = [
  { id: "late", label: "遲到", emoji: "⏰" },
  { id: "no_show", label: "爽約", emoji: "👻" },
  { id: "inappropriate", label: "行為不適當", emoji: "🚫" },
  { id: "hog_mic", label: "霸麥", emoji: "🎤" },
  { id: "poor_comm", label: "溝通不佳", emoji: "😕" },
] as const;

export const REPORT_REASONS = [
  { id: "harassment", label: "騷擾" },
  { id: "language", label: "不當言語" },
  { id: "fake", label: "假帳號" },
  { id: "ads", label: "商業廣告" },
  { id: "scam", label: "詐騙" },
  { id: "no_show", label: "爽約" },
  { id: "unsafe", label: "不安全行為" },
  { id: "other", label: "其他" },
] as const;

export const AVATAR_PRESETS = [
  { id: "mic-purple", emoji: "🎤", from: "#7C3AED", to: "#EC4899" },
  { id: "notes-cyan", emoji: "🎵", from: "#06B6D4", to: "#7C3AED" },
  { id: "disco-pink", emoji: "🪩", from: "#E882B4", to: "#F4845F" },
  { id: "star-yellow", emoji: "⭐", from: "#F5C542", to: "#F4845F" },
  { id: "fire-coral", emoji: "🔥", from: "#F4845F", to: "#E11D48" },
  { id: "spark-blue", emoji: "✨", from: "#6EB5FF", to: "#7C3AED" },
] as const;

export const HERO_IMAGES = [
  {
    age: 20,
    minAge: 18,
    maxAge: 24,
    label: "20 歲",
    src: "/heroes/age-20.png?v=3",
    bg: "#F4845F",
    panel: "#F79B7F",
  },
  {
    age: 30,
    minAge: 25,
    maxAge: 34,
    label: "30 歲",
    src: "/heroes/age-30.png?v=4",
    bg: "#6EB5FF",
    panel: "#8DC4FF",
  },
  {
    age: 40,
    minAge: 35,
    maxAge: 44,
    label: "40 歲",
    src: "/heroes/age-40.png?v=4",
    bg: "#6BBF7A",
    panel: "#85CC92",
  },
  {
    age: 50,
    minAge: 45,
    maxAge: 80,
    label: "50 歲",
    src: "/heroes/age-50.png?v=4",
    bg: "#E882B4",
    panel: "#ED9DC4",
  },
] as const;

export type HeroAge = (typeof HERO_IMAGES)[number]["age"];

export function heroByAge(age?: number | string | null) {
  const n = Number(age);
  return HERO_IMAGES.find((h) => h.age === n) ?? HERO_IMAGES[0];
}

export function ageBandFromYears(age: number | null | undefined): HeroAge | null {
  if (age == null || Number.isNaN(age)) return null;
  const hit = HERO_IMAGES.find((h) => age >= h.minAge && age <= h.maxAge);
  return hit?.age ?? null;
}

export function parseHeroAge(raw?: string | number | null): HeroAge | null {
  const n = Number(raw);
  return HERO_IMAGES.some((h) => h.age === n) ? (n as HeroAge) : null;
}

export function rememberHeroAge(age: HeroAge | number) {
  const parsed = parseHeroAge(age);
  if (!parsed || typeof document === "undefined") return;
  document.cookie = `${HERO_AGE_COOKIE}=${parsed}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export const DEFAULT_CONFIG = {
  service_fee_twd: "50",
  free_match_count: "1",
  payment_timeout_minutes: "30",
  payment_mode: "MOCK",
  no_show_review_threshold: "3",
} as const;

export type MusicGenre = (typeof MUSIC_GENRES)[number];
export type PreferenceId = (typeof PREFERENCE_OPTIONS)[number]["id"];
export type ReviewTagId =
  | (typeof POSITIVE_REVIEW_TAGS)[number]["id"]
  | (typeof NEGATIVE_REVIEW_TAGS)[number]["id"];
