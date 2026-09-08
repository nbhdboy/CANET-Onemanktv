"use client";

import { useEffect, useState } from "react";
import { unlockContactsAction } from "@/actions/match";
import type { PrivateContacts } from "@/lib/types";

export function UnlockedContacts({ matchId, nickname }: { matchId: string; nickname: string }) {
  const [data, setData] = useState<PrivateContacts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    unlockContactsAction(matchId)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "無法解鎖"));
  }, [matchId]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="text-sm text-[var(--muted)]">正在解鎖聯絡方式…</p>;

  const items = [
    data.line_id ? { label: "LINE", value: data.line_id } : null,
    data.instagram_handle ? { label: "Instagram", value: data.instagram_handle } : null,
    data.threads_handle ? { label: "Threads", value: data.threads_handle } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="rounded-3xl bg-white card-float p-5 space-y-2">
      <h3 className="font-bold">{nickname} 的聯絡方式</h3>
      {items.length === 0 && <p className="text-sm">對方尚未填寫可顯示的聯絡方式。</p>}
      {items.map((i) => (
        <p key={i.label} className="text-sm">
          {i.label}：已解鎖 · <span className="font-medium">{i.value}</span>
        </p>
      ))}
    </div>
  );
}
