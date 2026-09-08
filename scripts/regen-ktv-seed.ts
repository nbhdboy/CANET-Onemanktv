import fs from "node:fs";
import { seedCatalog } from "../src/lib/ktv-venues";

const c = seedCatalog();
const esc = (s: string) => s.replace(/'/g, "''");

let out = `-- Seed KTV brands and venues for hosted Supabase.
-- Regenerated from src/lib/ktv-venues.ts.
insert into public.ktv_brands (id, name, booking_url, logo_url, enabled) values
`;
out += c.brands
  .map((b) => `  ('${b.id}', '${esc(b.name)}', '${esc(b.booking_url)}', '${esc(b.logo_url)}', true)`)
  .join(",\n");
out += `
on conflict (id) do update set
  name = excluded.name,
  booking_url = excluded.booking_url,
  logo_url = excluded.logo_url,
  enabled = excluded.enabled;

insert into public.ktv_venues (id, brand_id, name, city, district, address, enabled) values
`;
out += c.venues
  .map(
    (v) =>
      `  ('${esc(v.id)}', '${v.brand_id}', '${esc(v.name)}', '${esc(v.city)}', '${esc(v.district)}', '${esc(v.address)}', true)`,
  )
  .join(",\n");
out += `
on conflict (id) do update set
  brand_id = excluded.brand_id,
  name = excluded.name,
  city = excluded.city,
  district = excluded.district,
  address = excluded.address,
  enabled = excluded.enabled;
`;

fs.writeFileSync("supabase/migrations/00003_seed_ktv.sql", out);
console.log(`wrote ${c.brands.length} brands, ${c.venues.length} venues`);
