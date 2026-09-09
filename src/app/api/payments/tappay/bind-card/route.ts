import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bindTapPayCard } from "@/lib/tappay/cards";
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
      prime?: string;
      replaceExisting?: boolean;
    };
    if (!body.prime) {
      return NextResponse.json({ ok: false, error: "缺少 prime" }, { status: 400 });
    }

    const result = await bindTapPayCard({
      userId: session.id,
      prime: body.prime,
      email: session.email,
      replaceExisting: Boolean(body.replaceExisting),
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "綁卡失敗";
    logAppError("api.bind_card_failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
