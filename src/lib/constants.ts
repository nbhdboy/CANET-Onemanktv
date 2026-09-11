export const APP_NAME = "K歌 +1";
export const APP_TAGLINE = "一個人想唱 KTV？找另一個一個人，兩個人剛剛好。";
export const SUPPORT_EMAIL = "service@canet.tech";
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
  {
    id: "age20-f",
    label: "20 歲 · 女",
    age: 20,
    gender: "f",
    src: "/avatars/presets/age-20-f.png?v=1",
    emoji: "🎤",
    from: "#F4845F",
    to: "#FFB090",
  },
  {
    id: "age20-m",
    label: "20 歲 · 男",
    age: 20,
    gender: "m",
    src: "/avatars/presets/age-20-m.png?v=1",
    emoji: "🎤",
    from: "#E56A3D",
    to: "#F4845F",
  },
  {
    id: "age30-f",
    label: "30 歲 · 女",
    age: 30,
    gender: "f",
    src: "/avatars/presets/age-30-f.png?v=1",
    emoji: "🎵",
    from: "#6EB5FF",
    to: "#A8D4FF",
  },
  {
    id: "age30-m",
    label: "30 歲 · 男",
    age: 30,
    gender: "m",
    src: "/avatars/presets/age-30-m.png?v=1",
    emoji: "🎵",
    from: "#3D8FE8",
    to: "#6EB5FF",
  },
  {
    id: "age40-f",
    label: "40 歲 · 女",
    age: 40,
    gender: "f",
    src: "/avatars/presets/age-40-f.png?v=1",
    emoji: "✨",
    from: "#6BBF7A",
    to: "#A5E0B0",
  },
  {
    id: "age40-m",
    label: "40 歲 · 男",
    age: 40,
    gender: "m",
    src: "/avatars/presets/age-40-m.png?v=1",
    emoji: "✨",
    from: "#3F9A52",
    to: "#6BBF7A",
  },
  {
    id: "age50-f",
    label: "50 歲 · 女",
    age: 50,
    gender: "f",
    src: "/avatars/presets/age-50-f.png?v=1",
    emoji: "⭐",
    from: "#E882B4",
    to: "#F5B8D6",
  },
  {
    id: "age50-m",
    label: "50 歲 · 男",
    age: 50,
    gender: "m",
    src: "/avatars/presets/age-50-m.png?v=1",
    emoji: "⭐",
    from: "#D45A9A",
    to: "#E882B4",
  },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];
export const DEFAULT_AVATAR_PRESET_ID: AvatarPresetId = AVATAR_PRESETS[0].id;

export const HERO_IMAGES = [
  {
    age: 20,
    minAge: 18,
    maxAge: 29,
    label: "20 歲",
    src: "/heroes/age-20.png?v=3",
    bg: "#F4845F",
    panel: "#F79B7F",
    ctaFrom: "#E56A3D",
    ctaMid: "#F4845F",
    ctaTo: "#FFB090",
    /** 玻璃圓盤內側光暈（隨年齡局變） */
    glassGlow: "#F472B6",
    glassGlowSoft: "#FB7185",
  },
  {
    age: 30,
    minAge: 30,
    maxAge: 39,
    label: "30 歲",
    src: "/heroes/age-30.png?v=4",
    bg: "#6EB5FF",
    panel: "#8DC4FF",
    ctaFrom: "#3D8FE8",
    ctaMid: "#6EB5FF",
    ctaTo: "#A8D4FF",
    glassGlow: "#818CF8",
    glassGlowSoft: "#38BDF8",
  },
  {
    age: 40,
    minAge: 40,
    maxAge: 49,
    label: "40 歲",
    src: "/heroes/age-40.png?v=4",
    bg: "#6BBF7A",
    panel: "#85CC92",
    ctaFrom: "#3F9A52",
    ctaMid: "#6BBF7A",
    ctaTo: "#A5E0B0",
    glassGlow: "#34D399",
    glassGlowSoft: "#A3E635",
  },
  {
    age: 50,
    minAge: 50,
    maxAge: 80,
    label: "50 歲",
    src: "/heroes/age-50.png?v=4",
    bg: "#E882B4",
    panel: "#ED9DC4",
    ctaFrom: "#D45A9A",
    ctaMid: "#E882B4",
    ctaTo: "#F5B8D6",
    glassGlow: "#F9A8D4",
    glassGlowSoft: "#C084FC",
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
