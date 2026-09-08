export function EqualizerLoader({ label = "載入中" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <div className="flex items-end gap-1 h-8" aria-hidden>
        {[12, 22, 30, 18, 26].map((h, i) => (
          <span key={i} className="eq-bar w-1.5 rounded-full bg-purple-600" style={{ height: h }} />
        ))}
      </div>
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
