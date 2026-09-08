export function Stars({ value, size = "md" }: { value: number | null; size?: "sm" | "md" }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-sm text-[var(--muted)]">🌱 新歌友</span>;
  }
  const cls = size === "sm" ? "text-xs" : "text-sm";
  return (
    <span className={`${cls} font-semibold`}>
      ⭐ {value.toFixed(1)}
    </span>
  );
}

export function Newcomer() {
  return (
    <div className="text-sm text-[var(--muted)]">
      <p className="font-medium text-foreground">🌱 新歌友</p>
      <p>還沒有評價</p>
    </div>
  );
}
