import { cookies } from "next/headers";
import { AuthForm } from "@/components/auth/AuthForm";
import { GlassFormShell } from "@/components/layout/GlassFormShell";
import { SiteLegalLinks } from "@/components/legal/SiteLegalLinks";
import { HERO_AGE_COOKIE, heroByAge, parseHeroAge } from "@/lib/constants";

export default async function SignupPage() {
  const ageBand = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value) ?? 20;
  const hero = heroByAge(ageBand);

  return (
    <GlassFormShell
      ageBand={ageBand}
      watermark="註冊"
      kicker={`K歌 +1 · ${hero.label}`}
      title="建立帳號"
      subtitle="年滿 18 歲才能使用。這不是交友軟體。"
    >
      <AuthForm
        mode="signup"
        accent={hero.glassGlow}
        accentSoft={hero.glassGlowSoft}
        ctaFrom={hero.ctaFrom}
      />
      <SiteLegalLinks
        className="mt-8 border-t border-white/25 pt-5"
        tone="onDark"
        includeSafety={false}
        align="center"
      />
    </GlassFormShell>
  );
}
