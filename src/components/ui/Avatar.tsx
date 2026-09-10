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
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
        fontSize: size * 0.42,
      }}
      aria-hidden={!nickname}
      title={nickname || undefined}
    >
      {p.emoji}
    </span>
  );
}
