import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/app-data";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await loadProfile(session.id);
  if (profile?.profile_completed) redirect("/");

  return (
    <main className="min-h-screen px-4 py-12 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold">先完成你的歌友資料</h1>
      <p className="text-[var(--muted)] mt-2 mb-8">
        公開只會看到暱稱與評價。真實姓名與聯絡方式會保持私密，直到媒合成功。
      </p>
      <OnboardingForm />
    </main>
  );
}
