import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center gap-4">
      <h1 className="text-2xl font-bold">找不到這頁</h1>
      <Link href="/" className="text-purple-700 font-semibold">
        回首頁找歌友
      </Link>
    </main>
  );
}
