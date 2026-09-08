"use client";

import { useActionState } from "react";
import { updateContactsAction, updatePublicProfileAction } from "@/actions/profile";
import { AVATAR_PRESETS } from "@/lib/constants";
import { StageTrack, ghostBtn } from "@/components/layout/StagePage";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

const field =
  "w-full rounded-2xl border border-black/15 bg-white px-4 h-12 text-[#1a1040] placeholder:text-[#6b6280]";

export function SettingsForms({
  nickname,
  avatar,
  lineId,
  instagram,
  threads,
}: {
  nickname: string;
  avatar: string;
  lineId: string;
  instagram: string;
  threads: string;
}) {
  const [p, pAction, pPending] = useActionState(updatePublicProfileAction, init);
  const [c, cAction, cPending] = useActionState(updateContactsAction, init);

  return (
    <div className="space-y-8" style={{ colorScheme: "light" }}>
      <StageTrack n="01" title="公開資料">
        <form action={pAction} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-white">暱稱</span>
            <input name="nickname" defaultValue={nickname} className={field} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-white">頭像</span>
            <select name="avatar" defaultValue={avatar} className={field}>
              {AVATAR_PRESETS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.id}
                </option>
              ))}
            </select>
          </label>
          {p.error ? <p className="text-sm text-amber-100">{p.error}</p> : null}
          {p.ok ? <p className="text-sm text-white">已儲存。</p> : null}
          <button type="submit" disabled={pPending} className={ghostBtn}>
            {pPending ? "儲存中…" : "更新公開資料"}
          </button>
        </form>
      </StageTrack>

      <StageTrack n="02" title="私人聯絡方式">
        <form action={cAction} className="space-y-4">
          <p className="text-sm text-white/80">只有媒合成功後，對方才看得到這些資料。</p>
          <input name="lineId" defaultValue={lineId} placeholder="LINE ID" className={field} />
          <input name="instagram" defaultValue={instagram} placeholder="Instagram" className={field} />
          <input name="threads" defaultValue={threads} placeholder="Threads" className={field} />
          {c.error ? <p className="text-sm text-amber-100">{c.error}</p> : null}
          {c.ok ? <p className="text-sm text-white">已儲存。</p> : null}
          <button type="submit" disabled={cPending} className={ghostBtn}>
            {cPending ? "儲存中…" : "更新聯絡方式"}
          </button>
        </form>
      </StageTrack>
    </div>
  );
}
