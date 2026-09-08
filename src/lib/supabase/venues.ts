import type { SupabaseClient } from "@supabase/supabase-js";
import { logApp, logAppError } from "@/lib/log";
import { seedCatalog } from "@/lib/ktv-venues";

let pending: Promise<void> | null = null;

export async function ensureSupabaseKtvCatalog(client: SupabaseClient) {
  if (!pending) {
    pending = syncCatalog(client).catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

async function syncCatalog(client: SupabaseClient) {
  const catalog = seedCatalog();
  const brands = catalog.brands.map((b) => ({
    id: b.id,
    name: b.name,
    booking_url: b.booking_url,
    logo_url: b.logo_url,
    enabled: true,
  }));
  const venues = catalog.venues.map((v) => ({
    id: v.id,
    brand_id: v.brand_id,
    name: v.name,
    city: v.city,
    district: v.district,
    address: v.address,
    enabled: true,
  }));
  const officialIds = new Set(venues.map((v) => v.id));

  const brandRes = await client.from("ktv_brands").upsert(brands, { onConflict: "id" });
  if (brandRes.error) {
    logAppError("ktv.brands_upsert_failed", {
      message: brandRes.error.message,
      code: brandRes.error.code,
    });
    throw new Error(brandRes.error.message);
  }

  const venueRes = await client.from("ktv_venues").upsert(venues, { onConflict: "id" });
  if (venueRes.error) {
    logAppError("ktv.venues_upsert_failed", {
      message: venueRes.error.message,
      code: venueRes.error.code,
    });
    throw new Error(venueRes.error.message);
  }

  const existingRes = await client.from("ktv_venues").select("id");
  if (existingRes.error) {
    logAppError("ktv.venues_list_failed", {
      message: existingRes.error.message,
      code: existingRes.error.code,
    });
  } else {
    const stale = (existingRes.data ?? [])
      .map((row) => String(row.id))
      .filter((id) => !officialIds.has(id));
    if (stale.length) {
      const disableRes = await client.from("ktv_venues").update({ enabled: false }).in("id", stale);
      if (disableRes.error) {
        logAppError("ktv.venues_disable_failed", {
          message: disableRes.error.message,
          code: disableRes.error.code,
          staleCount: stale.length,
        });
      } else {
        logApp("ktv.venues_disabled", { staleCount: stale.length });
      }
    }
  }

  logApp("ktv.catalog_synced", { brandCount: brands.length, venueCount: venues.length });
}
