"use client";

import { useState } from "react";
import { acceptAction, rejectAction } from "@/actions/match";

export function ApplicantActions({ applicationId }: { applicationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function accept() {
    setPending(true);
    const res = await acceptAction(applicationId);
    if (res && !res.ok) setError(res.error || "無法接受");
    setPending(false);
  }

  async function reject() {
    setPending(true);
    const res = await rejectAction(applicationId);
    if (!res.ok) setError(res.error || "無法婉拒");
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={accept}
          className="flex-1 rounded-2xl neon-gradient text-white font-semibold h-12"
        >
          接受
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={reject}
          className="flex-1 rounded-2xl bg-white border font-semibold h-12"
        >
          婉拒
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
