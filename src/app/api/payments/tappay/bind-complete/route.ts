import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { completeBindFromRedirect } from "@/lib/tappay/cards";
import { isLivePayment } from "@/lib/tappay/env";
import { logAppError } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!isLivePayment()) {
      return NextResponse.json({ ok: false, error: "PAYMENT_MODE 不是 LIVE" }, { status: 400 });
    }
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "請先登入" }, { status: 401 });
    }

    const body = (await req.json()) as {
      orderNumber?: string;
      recTradeId?: string;
      status?: string | number;
    };
    if (!body.orderNumber) {
      return NextResponse.json({ ok: false, error: "缺少 orderNumber" }, { status: 400 });
    }

    const result = await completeBindFromRedirect({
      userId: session.id,
      orderNumber: body.orderNumber,
      recTradeId: body.recTradeId,
      status: body.status,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "完成綁卡失敗";
    logAppError("api.bind_complete_failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
