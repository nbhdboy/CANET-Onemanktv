"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { onboardingAction } from "@/actions/profile";
import { AVATAR_PRESETS } from "@/lib/constants";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };
const inlineLink = "font-semibold text-purple-700 underline underline-offset-2";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(onboardingAction, init);
  const [avatar, setAvatar] = useState<string>(AVATAR_PRESETS[0].id);
  const year = new Date().getFullYear();

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="avatar" value={avatar} />
      <AvatarPicker value={avatar} onChange={setAvatar} />
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
      <label className="flex flex-row items-start gap-3 text-sm leading-6">
        <input
          name="age"
          type="checkbox"
          required
          className="mt-0.5 size-5 shrink-0 rounded border border-[var(--line)]"
        />
        <span className="min-w-0 flex-1">
          我確認已年滿 18 歲，並了解這不是交友或約會服務。
        </span>
      </label>
      <label className="flex flex-row items-start gap-3 text-sm leading-6">
        <input
          name="terms"
          type="checkbox"
          required
          className="mt-0.5 size-5 shrink-0 rounded border border-[var(--line)]"
        />
        <span className="min-w-0 flex-1">
          我同意
          <Link href="/terms" className={inlineLink} onClick={(e) => e.stopPropagation()}>
            使用條款
          </Link>
          、
          <Link href="/privacy" className={inlineLink} onClick={(e) => e.stopPropagation()}>
            隱私權政策
          </Link>
          ，以及
          <Link href="/safety" className={inlineLink} onClick={(e) => e.stopPropagation()}>
            陌生人見面的安全建議
          </Link>
          。
        </span>
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
