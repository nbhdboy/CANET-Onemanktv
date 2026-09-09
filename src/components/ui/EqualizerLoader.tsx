export function EqualizerLoader({
  label = "載入中",
  tone = "muted",
  compact = false,
}: {
  label?: string;
  tone?: "muted" | "light";
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${compact ? "py-2" : "py-16"}`}
      role="status"
    >
      <div className="flex h-8 items-end gap-1" aria-hidden>
        {[12, 22, 30, 18, 26].map((h, i) => (
          <span
            key={i}
            className={`eq-bar w-1.5 rounded-full ${tone === "light" ? "bg-white" : "bg-purple-600"}`}
            style={{ height: h }}
          />
        ))}
      </div>
      <p className={`text-sm ${tone === "light" ? "text-white/90" : "text-[var(--muted)]"}`}>
        {label}
      </p>
    </div>
  );
}
