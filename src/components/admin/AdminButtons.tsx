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
  const actions = [
    { key: "DISMISSED" as const, label: "駁回" },
    { key: "WARNING" as const, label: "警告" },
    { key: "SUSPENDED" as const, label: "停權3天／再犯停用" },
    { key: "BANNED" as const, label: "永久停用" },
    { key: "RESOLVED" as const, label: "結案" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          disabled={pending !== null}
          className="h-10 px-3 rounded-xl border text-xs font-semibold bg-white disabled:opacity-60"
          onClick={async () => {
            if (pending) return;
            setPending(a.key);
            try {
              await resolveReportAction(reportId, a.key);
            } finally {
              setPending(null);
            }
          }}
        >
          {pending === a.key ? "處理中…" : a.label}
        </button>
      ))}
    </div>
  );
}
