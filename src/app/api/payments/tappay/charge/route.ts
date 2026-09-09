import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { chargeTapPayPayment } from "@/lib/supabase/live-payments";
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
      paymentId?: string;
      prime?: string;
      cardId?: string;
      method?: "card" | "linepay" | "saved_card";
      buyerEmail?: string;
      cardholderName?: string;
      carrier?: string;
      buyerIdentifier?: string;
      buyerName?: string;
      saveCard?: boolean;
      replaceExistingCard?: boolean;
    };

    if (!body.paymentId) {
      return NextResponse.json({ ok: false, error: "缺少 paymentId" }, { status: 400 });
    }
    if (body.method !== "saved_card" && !body.cardId && !body.prime) {
      return NextResponse.json({ ok: false, error: "缺少 paymentId 或 prime" }, { status: 400 });
    }

    const result = await chargeTapPayPayment({
      userId: session.id,
      paymentId: body.paymentId,
      prime: body.prime,
      cardId: body.cardId,
      method: body.method,
      buyerEmail: body.buyerEmail || session.email,
      cardholderName: body.cardholderName,
      carrier: body.carrier,
      buyerIdentifier: body.buyerIdentifier,
      buyerName: body.buyerName,
      saveCard: body.saveCard,
      replaceExistingCard: body.replaceExistingCard,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "付款失敗";
    logAppError("api.tappay_charge_failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
