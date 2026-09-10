"use client";

import { useActionState, useEffect, useState } from "react";
import { updateContactsAction, updatePublicProfileAction } from "@/actions/profile";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { GlassPanel, glassCtaStyle, glassFieldClass } from "@/components/layout/GlassFormShell";
import { StageTrack } from "@/components/layout/StagePage";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

export function SettingsForms({
  nickname,
  avatar,
  lineId,
  instagram,
  threads,
  accent,
  accentSoft,
  ctaFrom,
}: {
  nickname: string;
  avatar: string;
  lineId: string;
  instagram: string;
  threads: string;
  accent: string;
  accentSoft: string;
  ctaFrom: string;
}) {
  const [p, pAction, pPending] = useActionState(updatePublicProfileAction, init);
  const [c, cAction, cPending] = useActionState(updateContactsAction, init);
  const [avatarValue, setAvatarValue] = useState(avatar || "mic-purple");
  const [line, setLine] = useState(lineId);
  const [ig, setIg] = useState(instagram);
  const [th, setTh] = useState(threads);
  const cta = glassCtaStyle(accent, accentSoft, ctaFrom);

  useEffect(() => {
    setLine(lineId);
    setIg(instagram);
    setTh(threads);
  }, [lineId, instagram, threads]);

  useEffect(() => {
    setAvatarValue(avatar || "mic-purple");
  }, [avatar]);

  return (
    <div className="space-y-8" style={{ colorScheme: "light" }}>
      <StageTrack n="01" title="公開資料">
        <GlassPanel accent={accent}>
          <form action={pAction} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-white">暱稱</span>
              <input name="nickname" defaultValue={nickname} className={glassFieldClass} />
            </label>
            <input type="hidden" name="avatar" value={avatarValue} />
            <AvatarPicker value={avatarValue} onChange={setAvatarValue} tone="onDark" />
            {p.error ? <p className="text-sm text-amber-100">{p.error}</p> : null}
            {p.ok ? <p className="text-sm text-white">已儲存。</p> : null}
            <button
              type="submit"
              disabled={pPending}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full text-sm font-semibold tracking-[0.12em] text-white disabled:opacity-60"
              style={cta}
            >
              {pPending ? "儲存中…" : "更新公開資料"}
            </button>
          </form>
        </GlassPanel>
      </StageTrack>

      <StageTrack n="02" title="私人聯絡方式">
        <GlassPanel accent={accent}>
          <form action={cAction} className="space-y-4">
            <p className="text-sm text-white/80">
              只有媒合成功後，對方才看得到這些資料。空白欄位會保留已儲存的資料。
            </p>
            <input
              name="lineId"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="LINE ID"
              className={glassFieldClass}
            />
            <input
              name="instagram"
              value={ig}
              onChange={(e) => setIg(e.target.value)}
              placeholder="Instagram"
              className={glassFieldClass}
            />
            <input
              name="threads"
              value={th}
              onChange={(e) => setTh(e.target.value)}
              placeholder="Threads"
              className={glassFieldClass}
            />
            {c.error ? <p className="text-sm text-amber-100">{c.error}</p> : null}
            {c.ok ? <p className="text-sm text-white">已儲存。</p> : null}
            <button
              type="submit"
              disabled={cPending}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full text-sm font-semibold tracking-[0.12em] text-white disabled:opacity-60"
              style={cta}
            >
              {cPending ? "儲存中…" : "更新聯絡方式"}
            </button>
          </form>
        </GlassPanel>
      </StageTrack>
    </div>
  );
}
