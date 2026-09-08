import Link from "next/link";

export function EmptyFeed({
  ageLabel,
  age,
  onColor = false,
}: {
  ageLabel?: string;
  age?: number;
  onColor?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-10 text-center space-y-4 ${
        onColor ? "bg-white/90 shadow-[0_18px_50px_rgba(0,0,0,0.12)]" : "bg-white card-float"
      }`}
    >
      <p className="text-4xl" aria-hidden>
        🎤
      </p>
      <h2 className="text-xl font-bold">
        {ageLabel ? `現在好像還沒有 ${ageLabel} 的歌局……` : "現在好像有點安靜……"}
      </h2>
      <p className="text-[var(--muted)]">不如你來當第一個開唱的人？</p>
      <Link
        href={age ? `/requests/new?age=${age}` : "/requests/new"}
        className="inline-flex min-h-12 items-center justify-center rounded-2xl neon-gradient text-white px-6 font-semibold"
      >
        發起唱歌需求
      </Link>
    </div>
  );
}
