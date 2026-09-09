import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { removeSavedCard } from "@/lib/tappay/cards";
import { isLivePayment } from "@/lib/tappay/env";
import { logAppError } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (!isLivePayment()) {
      return NextResponse.json({ ok: false, error: "PAYMENT_MODE 不是 LIVE" }, { status: 400 });
    }
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "請先登入" }, { status: 401 });
    }

    const result = await removeSavedCard(session.id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "刪卡失敗";
    logAppError("api.remove_card_failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
