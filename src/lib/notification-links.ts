export type NotificationPayload = {
  message?: string;
  href?: string;
  matchId?: string;
  requestId?: string;
  applicationId?: string;
  paymentId?: string;
  reopened?: boolean;
  [key: string]: unknown;
};

export function parseNotificationPayload(raw: string | null | undefined): NotificationPayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as NotificationPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** 依 type + payload 推導深連結；舊通知沒有 href 也能用。 */
export function resolveNotificationHref(
  type: string,
  payload: NotificationPayload = {},
): string | null {
  if (typeof payload.href === "string" && payload.href.startsWith("/")) {
    return payload.href;
  }

  const matchId = typeof payload.matchId === "string" ? payload.matchId : null;
  const requestId = typeof payload.requestId === "string" ? payload.requestId : null;

  switch (type) {
    case "points_credit":
      return "/profile";
    case "points_redeem":
      return matchId ? `/matches/${matchId}` : "/profile";
    case "payment_needed":
    case "application_accepted":
    case "match_success":
    case "review_reminder":
      return matchId ? `/matches/${matchId}` : "/matches";
    case "payment_timeout":
      if (payload.reopened) return "/";
      return matchId ? `/matches/${matchId}` : "/matches";
    case "application_received":
      return requestId ? `/requests/${requestId}/applicants` : "/matches";
    case "application_rejected":
      return "/";
    case "review_received":
      return "/profile";
    default:
      if (matchId) return `/matches/${matchId}`;
      if (requestId) return `/requests/${requestId}`;
      return null;
  }
}

/** 寫入通知時附上 href，方便之後直接使用。 */
export function withNotificationHref(
  type: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const href = resolveNotificationHref(type, payload as NotificationPayload);
  if (!href || typeof payload.href === "string") return payload;
  return { ...payload, href };
}
