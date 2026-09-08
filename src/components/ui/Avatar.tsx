import { avatarPreset } from "@/lib/format";

export function Avatar({
  presetId,
  nickname,
  size = 44,
}: {
  presetId?: string | null;
  nickname?: string | null;
  size?: number;
}) {
  const p = avatarPreset(presetId);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white shrink-0"
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
