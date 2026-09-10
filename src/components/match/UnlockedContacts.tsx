"use client";

import { useEffect, useState } from "react";
import { unlockContactsAction } from "@/actions/match";
import { GlassPanel } from "@/components/layout/GlassFormShell";
import type { PrivateContacts } from "@/lib/types";

export function UnlockedContacts({
  matchId,
  nickname,
  accent = "#F472B6",
}: {
  matchId: string;
  nickname: string;
  accent?: string;
}) {
  const [data, setData] = useState<PrivateContacts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    unlockContactsAction(matchId)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "無法解鎖"));
  }, [matchId]);

  if (error) {
    return (
      <GlassPanel accent={accent}>
        <p className="text-sm text-amber-100">{error}</p>
      </GlassPanel>
    );
  }

  if (!data) {
    return (
      <GlassPanel accent={accent}>
        <p className="text-sm text-white/80">正在解鎖聯絡方式…</p>
      </GlassPanel>
    );
  }

  const items = [
    data.line_id ? { label: "LINE", value: data.line_id } : null,
    data.instagram_handle ? { label: "Instagram", value: data.instagram_handle } : null,
    data.threads_handle ? { label: "Threads", value: data.threads_handle } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <GlassPanel accent={accent}>
      <div className="space-y-2 text-white">
        <h3 className="font-bold">{nickname} 的聯絡方式</h3>
        {items.length === 0 ? (
          <p className="text-sm text-white/85">對方尚未填寫可顯示的聯絡方式。</p>
        ) : null}
        {items.map((i) => (
          <p key={i.label} className="text-sm text-white/95">
            {i.label}：已解鎖 · <span className="font-semibold">{i.value}</span>
          </p>
        ))}
      </div>
    </GlassPanel>
  );
}
