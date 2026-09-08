import { NextResponse } from "next/server";
import { logApp, logAppError } from "@/lib/log";

export const dynamic = "force-dynamic";

/** TapPay 電子發票異常／結果 notify（先記錄，不阻斷主流程）。 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    logApp("api.invoice_notify", {
      payload: body,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logAppError("api.invoice_notify_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
