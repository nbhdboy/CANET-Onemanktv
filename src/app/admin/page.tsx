import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProfile } from "@/lib/users";
import {
  adminKpis,
  listReportsAdmin,
  listUsersAdmin,
  usersNeedingNoShowReview,
} from "@/lib/admin";
import { getAllConfig } from "@/lib/db";
import { getBrands, getVenues } from "@/lib/match";
import { saveConfigForm, updateBrandForm, upsertVenueForm } from "@/actions/admin";
import { ReportButtons, UserStatusButtons } from "@/components/admin/AdminButtons";
import { formatTwd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = getProfile(session.id);
  if (!me?.is_admin) redirect("/");
  const kpis = adminKpis();
  const users = listUsersAdmin();
  const reports = listReportsAdmin();
  const brands = getBrands(true);
  const venues = getVenues(undefined, true);
  const config = getAllConfig();
  const noShow = usersNeedingNoShowReview();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      <h1 className="text-3xl font-bold">Admin</h1>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Users" value={kpis.users} />
        <Stat label="Requests" value={kpis.requests} />
        <Stat label="Applications" value={kpis.applications} />
        <Stat label="Matches" value={kpis.matches} />
        <Stat label="Successful" value={kpis.successful} />
        <Stat label="Match Rate" value={`${Math.round(kpis.matchRate * 100)}%`} />
        <Stat label="Paid" value={kpis.paid} />
        <Stat label="Revenue" value={formatTwd(kpis.revenue)} />
      </section>

      {noShow.length > 0 && (
        <section className="rounded-3xl bg-amber-50 p-5">
          <h2 className="font-bold">爽約提醒（達門檻，需人工審核）</h2>
          {noShow.map((u) => (
            <p key={u.id} className="text-sm">
              {u.nickname || u.id} · {u.noShow} 次爽約標籤
            </p>
          ))}
        </section>
      )}

      <section className="rounded-3xl bg-white p-5 card-float space-y-2">
        <h2 className="font-bold">Funnel</h2>
        {kpis.funnel.map((f) => (
          <p key={f.name} className="text-sm flex justify-between">
            <span>{f.name}</span>
            <span>{f.count}</span>
          </p>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Users</h2>
        {users.map((u) => (
          <article key={String(u.id)} className="rounded-3xl bg-white p-4 card-float space-y-2">
            <p className="font-medium">
              {String(u.nickname || "未命名")} · {String(u.email)} · {String(u.status)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              matches {String(u.successful_match_count)} · free_used {String(u.free_match_used)}
            </p>
            <UserStatusButtons userId={String(u.id)} />
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Reports</h2>
        {reports.length === 0 && <p className="text-sm text-[var(--muted)]">目前沒有檢舉。</p>}
        {reports.map((r) => (
          <article key={String(r.id)} className="rounded-3xl bg-white p-4 card-float space-y-2">
            <p className="font-medium">
              {String(r.reporter_name)} → {String(r.reported_name)} · {String(r.reason)} · {String(r.status)}
            </p>
            {r.description ? <p className="text-sm">{String(r.description)}</p> : null}
            <ReportButtons reportId={String(r.id)} />
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">KTV Brands / Booking URL</h2>
        {brands.map((b) => (
          <form key={b.id} action={updateBrandForm} className="rounded-3xl bg-white p-4 card-float grid gap-2">
            <input type="hidden" name="id" value={b.id} />
            <input name="name" defaultValue={b.name} className="h-12 rounded-2xl border px-3" />
            <input name="booking_url" defaultValue={b.booking_url} className="h-12 rounded-2xl border px-3" />
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" name="enabled" defaultChecked={Boolean(b.enabled)} /> 啟用
            </label>
            <button className="h-12 rounded-2xl bg-purple-700 text-white font-semibold">儲存品牌</button>
          </form>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">新增門市</h2>
        <form action={upsertVenueForm} className="rounded-3xl bg-white p-4 card-float grid gap-2">
          <select name="brand_id" className="h-12 rounded-2xl border px-3">
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input name="name" placeholder="門市名稱" required className="h-12 rounded-2xl border px-3" />
          <input name="city" placeholder="城市" required className="h-12 rounded-2xl border px-3" />
          <input name="district" placeholder="行政區" required className="h-12 rounded-2xl border px-3" />
          <input name="address" placeholder="地址" required className="h-12 rounded-2xl border px-3" />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" name="enabled" defaultChecked /> 啟用
          </label>
          <button className="h-12 rounded-2xl bg-purple-700 text-white font-semibold">新增門市</button>
        </form>
        <div className="text-sm space-y-1">
          {venues.map((v) => (
            <p key={v.id}>
              {v.city}
              {v.name} · {v.enabled ? "啟用" : "停用"}
            </p>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">Platform Config</h2>
        <form action={saveConfigForm} className="rounded-3xl bg-white p-4 card-float grid gap-3">
          <label className="text-sm">
            service_fee_twd
            <input name="service_fee_twd" defaultValue={config.service_fee_twd} className="mt-1 w-full h-12 rounded-2xl border px-3" />
          </label>
          <label className="text-sm">
            free_match_count
            <input name="free_match_count" defaultValue={config.free_match_count} className="mt-1 w-full h-12 rounded-2xl border px-3" />
          </label>
          <label className="text-sm">
            payment_timeout_minutes
            <input name="payment_timeout_minutes" defaultValue={config.payment_timeout_minutes} className="mt-1 w-full h-12 rounded-2xl border px-3" />
          </label>
          <label className="text-sm">
            payment_mode
            <select name="payment_mode" defaultValue={config.payment_mode} className="mt-1 w-full h-12 rounded-2xl border px-3">
              <option value="MOCK">MOCK</option>
              <option value="LIVE">LIVE</option>
            </select>
          </label>
          <label className="text-sm">
            no_show_review_threshold
            <input name="no_show_review_threshold" defaultValue={config.no_show_review_threshold} className="mt-1 w-full h-12 rounded-2xl border px-3" />
          </label>
          <button className="h-12 rounded-2xl bg-purple-700 text-white font-semibold">儲存設定</button>
        </form>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-white p-4 card-float">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
