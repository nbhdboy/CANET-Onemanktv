import { NextResponse } from "next/server";
import { settleTapPayNotify } from "@/lib/supabase/live-payments";
import { isLivePayment } from "@/lib/tappay/env";
import { logApp, logAppError } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * LINE Pay backend_notify_url（經 TapPay）。
 * 成功後同樣更新 payments、確認媒合並開應稅發票。
 */
export async function POST(req: Request) {
  try {
    if (!isLivePayment()) {
      return NextResponse.json({ error: "PAYMENT_MODE 不是 LIVE" }, { status: 400 });
    }

    const body = (await req.json()) as {
      status?: number | string;
      order_number?: string;
      rec_trade_id?: string;
      bank_transaction_id?: string;
      amount?: number;
      msg?: string;
    };

    logApp("api.linepay_notify_received", {
      status: body.status,
      orderNumber: body.order_number,
      msg: body.msg,
      hasTradeId: Boolean(body.rec_trade_id),
    });

    // CANET 對 LINE Pay 另要求 msg === Success；維持相容
    if (Number(body.status) === 0 && body.msg && body.msg !== "Success") {
      logApp("api.linepay_notify_ignored_msg", {
        orderNumber: body.order_number,
        msg: body.msg,
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await settleTapPayNotify(body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logAppError("api.linepay_notify_failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
