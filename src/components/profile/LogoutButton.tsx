"use client";

import { useFormStatus } from "react-dom";

export function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full max-w-xs items-center justify-center border border-white text-sm font-semibold tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-[#1a1040] disabled:opacity-60"
    >
      {pending ? "登出中…" : "登出"}
    </button>
  );
}
