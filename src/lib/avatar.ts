import { AVATAR_PRESETS, DEFAULT_AVATAR_PRESET_ID } from "@/lib/constants";

export function isPhotoAvatar(value?: string | null) {
  if (!value) return false;
  return /^https?:\/\//i.test(value) || value.startsWith("/uploads/");
}

export function avatarPresetOrFallback(id?: string | null) {
  if (id && !isPhotoAvatar(id)) {
    return AVATAR_PRESETS.find((a) => a.id === id) ?? AVATAR_PRESETS[0];
  }
  return AVATAR_PRESETS[0];
}

/** 預設頭像圖（非照片）；舊 emoji id 會落到第一組。 */
export function avatarPresetSrc(id?: string | null) {
  if (isPhotoAvatar(id)) return null;
  return avatarPresetOrFallback(id).src;
}

export { DEFAULT_AVATAR_PRESET_ID };

export function isManagedAvatarUrl(url: string) {
  if (url.startsWith("/uploads/avatars/")) return true;
  try {
    const u = new URL(url);
    return u.pathname.includes("/storage/v1/object/public/avatars/");
  } catch {
    return false;
  }
}

export function storagePathFromPublicUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/avatars/";
  const idx = url.indexOf(marker);
  if (idx >= 0) return decodeURIComponent(url.slice(idx + marker.length));
  if (url.startsWith("/uploads/avatars/")) return url.replace(/^\/uploads\/avatars\//, "");
  return null;
}
