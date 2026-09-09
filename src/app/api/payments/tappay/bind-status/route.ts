import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBindTempStatus, getPublicSavedCard } from "@/lib/tappay/cards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const order = new URL(req.url).searchParams.get("order") || "";
  const card = await getPublicSavedCard(session.id);
  const temp = order ? await getBindTempStatus(session.id, order) : null;
  return NextResponse.json({
    ok: true,
    hasCard: Boolean(card),
    status: temp?.status || null,
  });
}
