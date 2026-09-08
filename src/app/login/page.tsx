import { AuthForm } from "@/components/auth/AuthForm";
import type { Search } from "@/lib/route-types";

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const oauthError = typeof sp.error === "string" ? sp.error : undefined;
  return (
    <main className="min-h-screen neon-gradient flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 card-float">
        <p className="text-xs tracking-[0.18em] uppercase font-semibold text-purple-700">K歌 +1</p>
        <h1 className="text-3xl font-bold mt-2">歡迎回來</h1>
        <p className="text-[var(--muted)] mt-1 mb-6">一個人想唱？找你的 +1。</p>
        <AuthForm mode="login" next={next} oauthError={oauthError} />
      </div>
    </main>
  );
}
