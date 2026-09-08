"use client";

import { useActionState, useState } from "react";
import { onboardingAction } from "@/actions/profile";
import { AVATAR_PRESETS } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(onboardingAction, init);
  const [avatar, setAvatar] = useState<string>(AVATAR_PRESETS[0].id);
  const year = new Date().getFullYear();

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="avatar" value={avatar} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">選一個頭像</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_PRESETS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAvatar(a.id)}
              className={`w-12 h-12 rounded-full text-xl ${avatar === a.id ? "ring-2 ring-purple-700" : ""}`}
              style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
              aria-label={a.id}
            >
              {a.emoji}
            </button>
          ))}
        </div>
      </fieldset>
      <Field name="nickname" label="公開暱稱" required />
      <Field name="realName" label="真實姓名（僅自己可見）" required />
      <label className="block space-y-1">
        <span className="text-sm font-medium">出生年</span>
        <input
          name="birthYear"
          type="number"
          required
          min={year - 80}
          max={year - 18}
          className="w-full rounded-2xl border border-[var(--line)] px-4 h-12"
        />
        <span className="text-xs text-[var(--muted)]">K歌 +1 僅開放 18 歲以上使用者。</span>
      </label>
      <p className="text-sm font-medium">至少填一種聯絡方式（媒合成功才會交換）</p>
      <Field name="lineId" label="LINE ID" />
      <Field name="instagram" label="Instagram" />
      <Field name="threads" label="Threads" />
      <label className="flex items-start gap-3 text-sm">
        <input name="age" type="checkbox" required className="mt-1 w-5 h-5" />
        <span>我確認已年滿 18 歲，並了解這不是交友或約會服務。</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input name="terms" type="checkbox" required className="mt-1 w-5 h-5" />
        <span>我同意使用條款、隱私權政策，以及陌生人見面的安全建議。</span>
      </label>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl neon-gradient text-white font-semibold h-12"
      >
        {pending ? "儲存中…" : "完成資料"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[var(--line)] px-4 h-12 bg-white"
      />
    </label>
  );
}
