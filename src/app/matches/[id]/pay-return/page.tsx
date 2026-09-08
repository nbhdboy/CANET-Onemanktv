import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadMatchForUserApp, loadMyPaymentApp } from "@/lib/app-data";
import { PayReturnClient } from "@/components/match/PayReturnClient";
import type { IdParams } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function PayReturnPage({
  params,
  searchParams,
}: {
  params: IdParams;
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const match = await loadMatchForUserApp(session.id, id);
  if (!match) notFound();

  const paymentId = sp.paymentId;
  if (!paymentId) redirect(`/matches/${id}`);

  const myPay = await loadMyPaymentApp(match.id, session.id);
  if (!myPay || myPay.id !== paymentId) notFound();

  if (myPay.status === "PAID" || myPay.status === "NOT_REQUIRED") {
    if (match.status === "MATCHED" || match.status === "COMPLETED") {
      redirect(`/matches/${id}/success`);
    }
    redirect(`/matches/${id}`);
  }

  return <PayReturnClient paymentId={paymentId} matchId={id} />;
}
