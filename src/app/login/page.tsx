import { cookies } from "next/headers";
import { AuthForm } from "@/components/auth/AuthForm";
import { GlassFormShell } from "@/components/layout/GlassFormShell";
import { SiteLegalLinks } from "@/components/legal/SiteLegalLinks";
import { HERO_AGE_COOKIE, heroByAge, parseHeroAge } from "@/lib/constants";
import type { Search } from "@/lib/route-types";

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const oauthError = typeof sp.error === "string" ? sp.error : undefined;
  const ageBand = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value) ?? 20;
  const hero = heroByAge(ageBand);

  return (
    <GlassFormShell
      ageBand={ageBand}
      watermark="登入"
      kicker={`K歌 +1 · ${hero.label}`}
      title="歡迎回來"
      subtitle="一個人想唱？找你的 +1。"
    >
      <AuthForm
        mode="login"
        next={next}
        oauthError={oauthError}
        accent={hero.glassGlow}
        accentSoft={hero.glassGlowSoft}
        ctaFrom={hero.ctaFrom}
      />
      <SiteLegalLinks
        className="mt-8 border-t border-white/25 pt-5"
        tone="onDark"
        includeSafety={false}
      />
    </GlassFormShell>
  );
}
