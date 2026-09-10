import { avatarPresetOrFallback, isPhotoAvatar } from "@/lib/avatar";

export function Avatar({
  presetId,
  nickname,
  size = 44,
}: {
  presetId?: string | null;
  nickname?: string | null;
  size?: number;
}) {
  if (isPhotoAvatar(presetId)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={presetId!}
        alt={nickname || "頭像"}
        width={size}
        height={size}
        className="inline-block shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const p = avatarPresetOrFallback(presetId);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.src}
      alt={nickname || p.label || "頭像"}
      width={size}
      height={size}
      className="inline-block shrink-0 rounded-full object-cover bg-black"
      style={{ width: size, height: size }}
      title={nickname || p.label || undefined}
    />
  );
}
