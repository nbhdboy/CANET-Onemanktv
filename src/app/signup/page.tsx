import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen neon-gradient flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 card-float">
        <p className="text-xs tracking-[0.18em] uppercase font-semibold text-purple-700">K歌 +1</p>
        <h1 className="text-3xl font-bold mt-2">建立帳號</h1>
        <p className="text-[var(--muted)] mt-1 mb-6">年滿 18 歲才能使用。這不是交友軟體。</p>
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
