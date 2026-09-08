"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center gap-4">
      <h1 className="text-2xl font-bold">有點狀況，歌先暫停一下</h1>
      <p className="text-sm text-[var(--muted)]">{error.message || "請再試一次"}</p>
      <button onClick={reset} className="h-12 px-6 rounded-2xl bg-purple-700 text-white font-semibold">
        重試
      </button>
    </main>
  );
}
