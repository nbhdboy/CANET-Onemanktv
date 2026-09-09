"use client";

import { useState } from "react";
import { resolveReportAction, setUserStatusAction } from "@/actions/admin";
import type { UserStatus } from "@/lib/types";

export function UserStatusButtons({ userId }: { userId: string }) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {(["ACTIVE", "WARNED", "SUSPENDED", "BANNED"] as UserStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending !== null}
          className="h-10 px-3 rounded-xl border text-xs font-semibold bg-white disabled:opacity-60"
          onClick={async () => {
            if (pending) return;
            setPending(s);
            try {
              await setUserStatusAction(userId, s);
            } finally {
              setPending(null);
            }
          }}
        >
          {pending === s ? "處理中…" : s}
        </button>
      ))}
    </div>
  );
}

export function ReportButtons({ reportId }: { reportId: string }) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {(["DISMISSED", "WARNING", "SUSPENDED", "BANNED", "RESOLVED"] as const).map((a) => (
        <button
          key={a}
          type="button"
          disabled={pending !== null}
          className="h-10 px-3 rounded-xl border text-xs font-semibold bg-white disabled:opacity-60"
          onClick={async () => {
            if (pending) return;
            setPending(a);
            try {
              await resolveReportAction(reportId, a);
            } finally {
              setPending(null);
            }
          }}
        >
          {pending === a ? "處理中…" : a}
        </button>
      ))}
    </div>
  );
}
