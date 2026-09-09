import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BindCardReturnClient } from "@/components/settings/BindCardReturnClient";

export const dynamic = "force-dynamic";

export default async function BindCardReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; rec_trade_id?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/settings");
  const sp = await searchParams;
  if (!sp.order) redirect("/settings");
  return (
    <BindCardReturnClient
      orderNumber={sp.order}
      recTradeId={sp.rec_trade_id}
      status={sp.status}
    />
  );
}
