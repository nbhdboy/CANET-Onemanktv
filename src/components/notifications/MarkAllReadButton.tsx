"use client";

import { useFormStatus } from "react-dom";
import { ghostBtn } from "@/components/layout/StagePage";

export function MarkAllReadButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${ghostBtn} disabled:opacity-60`}>
      {pending ? "處理中…" : "全部標為已讀"}
    </button>
  );
}
