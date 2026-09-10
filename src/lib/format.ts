import { AVATAR_PRESETS } from "./constants";
import type { PublicProfile } from "./types";

export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function filledContact(value?: string | null) {
  return Boolean(value && value.trim());
}

export function hasContact(c: {
  line_id?: string | null;
  instagram_handle?: string | null;
  threads_handle?: string | null;
}) {
  return (
    filledContact(c.line_id) ||
    filledContact(c.instagram_handle) ||
    filledContact(c.threads_handle)
  );
}

export function toPublicProfile(row: {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  successful_match_count: number;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  account_verified: number;
  status: PublicProfile["status"];
}): PublicProfile {
  return {
    id: row.id,
    nickname: row.nickname || "歌友",
    avatar_url: row.avatar_url,
    successful_match_count: row.successful_match_count,
    rating_avg: row.rating_avg,
    rating_count: row.rating_count,
    created_at: row.created_at,
    account_verified: row.account_verified,
    status: row.status,
  };
}

export function avatarPreset(id: string | null | undefined) {
  if (id && (/^https?:\/\//i.test(id) || id.startsWith("/uploads/"))) {
    return AVATAR_PRESETS[0];
  }
  return AVATAR_PRESETS.find((a) => a.id === id) ?? AVATAR_PRESETS[0];
}

export function formatTwd(n: number) {
  return `NT$${n.toLocaleString("zh-TW")}`;
}

export function durationLabel(hours: number) {
  return hours >= 5 ? "5 小時+" : `${hours} 小時`;
}

export function gateError(code: string): string {
  const map: Record<string, string> = {
    UNAUTHORIZED: "請先登入。",
    BANNED: "此帳號已被停權。",
    SUSPENDED: "此帳號目前暫停使用。",
    AGE: "K歌 +1 僅開放 18 歲以上使用者。",
    PROFILE: "請先完成個人資料，再開始媒合。",
    CONTACT: "請先設定至少一種聯絡方式，再開始媒合。",
    TERMS: "請先同意使用條款。",
    SELF: "不能申請自己的歌局。",
    BLOCKED: "目前無法與這位使用者互動。",
    MATCHED: "🎤 慢了一步！這位歌友已經找到 +1 了。",
    EXPIRED: "這場歌局已經過時間囉。",
    NOT_OPEN: "這場歌局目前無法申請。",
    DUPLICATE: "你已經申請過這場歌局了。",
    LOCKED: "發起人正在確認另一位歌友，請稍候。",
  };
  return map[code] ?? code;
}
