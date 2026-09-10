"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openNotificationAction } from "@/actions/admin";
import { EqualizerLoader } from "@/components/ui/EqualizerLoader";
import {
  parseNotificationPayload,
  resolveNotificationHref,
} from "@/lib/notification-links";
import { formatDateTime, relativeFromNow } from "@/lib/time";
import type { NotificationRecord } from "@/lib/types";

export function NotificationList({ items }: { items: NotificationRecord[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function openItem(n: NotificationRecord) {
    if (loading) return;
    const payload = parseNotificationPayload(n.payload);
    const href = resolveNotificationHref(n.type, payload);
    if (!href) return;
    setLoading(true);
    try {
      await openNotificationAction(n.id, href);
      router.push(href);
    } catch {
      setLoading(false);
    }
  }

  if (loading) {
    return <EqualizerLoader />;
  }

  if (items.length === 0) {
    return <p className="text-sm text-white/80">目前沒有通知。</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((n) => {
        const payload = parseNotificationPayload(n.payload);
        const message = payload.message || n.type;
        const href = resolveNotificationHref(n.type, payload);
        const clickable = Boolean(href);

        if (!clickable) {
          return (
            <article
              key={n.id}
              className={`border px-5 py-4 ${
                n.is_read ? "border-white/35 text-white/80" : "border-white text-white"
              }`}
            >
              <p className="font-medium">{message}</p>
              <p className="mt-1 text-xs text-white/70">
                {formatDateTime(n.created_at)} · {relativeFromNow(n.created_at)}
              </p>
            </article>
          );
        }

        return (
          <button
            key={n.id}
            type="button"
            onClick={() => openItem(n)}
            className={`group flex w-full flex-col border px-5 py-4 text-left transition-colors hover:bg-white hover:text-[#1a1040] ${
              n.is_read ? "border-white/35 text-white/80" : "border-white text-white"
            }`}
          >
            <p className="font-medium">{message}</p>
            <p className="mt-1 text-xs text-white/70 group-hover:text-[#1a1040]/70">
              {formatDateTime(n.created_at)} · {relativeFromNow(n.created_at)}
            </p>
            <p className="mt-3 text-sm font-semibold tracking-wide">前往 →</p>
          </button>
        );
      })}
    </div>
  );
}
