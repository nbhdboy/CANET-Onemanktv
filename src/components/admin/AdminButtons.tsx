"use client";

import { resolveReportAction, setUserStatusAction } from "@/actions/admin";
import type { UserStatus } from "@/lib/types";

export function UserStatusButtons({ userId }: { userId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["ACTIVE", "WARNED", "SUSPENDED", "BANNED"] as UserStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          className="h-10 px-3 rounded-xl border text-xs font-semibold bg-white"
          onClick={() => setUserStatusAction(userId, s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function ReportButtons({ reportId }: { reportId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["DISMISSED", "WARNING", "SUSPENDED", "BANNED", "RESOLVED"] as const).map((a) => (
        <button
          key={a}
          type="button"
          className="h-10 px-3 rounded-xl border text-xs font-semibold bg-white"
          onClick={() => resolveReportAction(reportId, a)}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
