import { NextResponse } from "next/server";
import { settleTapPayNotify } from "@/lib/supabase/live-payments";
import { settleBindCardNotify } from "@/lib/tappay/cards";
import { isLivePayment } from "@/lib/tappay/env";
import { logApp, logAppError } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * TapPay 3DS backend_notify_url（付款 + 綁卡 BIND*）。
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
      card_secret?: Record<string, unknown>;
      card_info?: Record<string, unknown>;
    };

    logApp("api.tappay_notify_received", {
      status: body.status,
      orderNumber: body.order_number,
      hasTradeId: Boolean(body.rec_trade_id),
    });

    if (body.order_number?.startsWith("BIND") || body.rec_trade_id) {
      const bindResult = await settleBindCardNotify(body);
      if ("ignored" in bindResult && bindResult.ignored && !body.order_number?.startsWith("BIND")) {
        // 不是綁卡暫存，繼續走付款 notify
      } else {
        if (!bindResult.ok && !("ignored" in bindResult && bindResult.ignored)) {
          return NextResponse.json(bindResult, { status: 404 });
        }
        if (bindResult.ok || body.order_number?.startsWith("BIND")) {
          return NextResponse.json(bindResult);
        }
      }
    }

    const result = await settleTapPayNotify(body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logAppError("api.tappay_notify_failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
