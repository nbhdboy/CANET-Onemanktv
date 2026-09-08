export const VENUE_SEED_VERSION = "2026-09-07";

export const CITY_ORDER = [
  "基隆市",
  "台北市",
  "新北市",
  "桃園市",
  "新竹市",
  "苗栗縣",
  "台中市",
  "彰化縣",
  "雲林縣",
  "嘉義市",
  "台南市",
  "高雄市",
  "屏東縣",
  "宜蘭縣",
  "花蓮縣",
  "台東縣",
] as const;

export type SeedVenue = {
  brand_id: "cashbox" | "holiday" | "star";
  name: string;
  city: string;
  district: string;
  address: string;
};

/** 依官網／公司登記彙整的實際營業門市。城市用「台北市」而非「臺北市」。 */
export const SEED_VENUES: SeedVenue[] = [
  // 錢櫃 — cashboxparty.com 門市專區 + 維基分店表
  { brand_id: "cashbox", name: "敦南店", city: "台北市", district: "大安區", address: "台北市大安區敦化南路一段205號" },
  { brand_id: "cashbox", name: "忠孝店", city: "台北市", district: "大安區", address: "台北市大安區忠孝東路四段22號" },
  { brand_id: "cashbox", name: "松江店", city: "台北市", district: "中山區", address: "台北市中山區松江路193號" },
  { brand_id: "cashbox", name: "南京店", city: "台北市", district: "中山區", address: "台北市中山區南京東路二段3號" },
  { brand_id: "cashbox", name: "林森店", city: "台北市", district: "中山區", address: "台北市中山區林森北路312號" },
  { brand_id: "cashbox", name: "中華新館", city: "台北市", district: "中正區", address: "台北市中正區中華路一段55號" },
  { brand_id: "cashbox", name: "板橋店", city: "新北市", district: "板橋區", address: "新北市板橋區館前西路" },
  { brand_id: "cashbox", name: "永和店", city: "新北市", district: "永和區", address: "新北市永和區永和路一段129號" },
  { brand_id: "cashbox", name: "桃園店", city: "桃園市", district: "桃園區", address: "桃園市桃園區中華路3號" },
  { brand_id: "cashbox", name: "南崁店", city: "桃園市", district: "蘆竹區", address: "桃園市蘆竹區南崁路一段290號" },
  { brand_id: "cashbox", name: "中壢店", city: "桃園市", district: "中壢區", address: "桃園市中壢區中央東路88號" },
  { brand_id: "cashbox", name: "新竹店", city: "新竹市", district: "北區", address: "新竹市北區北大路" },
  { brand_id: "cashbox", name: "台中店", city: "台中市", district: "中區", address: "台中市中區自由路二段32號" },
  { brand_id: "cashbox", name: "嘉義店", city: "嘉義市", district: "西區", address: "嘉義市西區仁愛路" },
  { brand_id: "cashbox", name: "台南店", city: "台南市", district: "中西區", address: "台南市中西區西門路" },
  { brand_id: "cashbox", name: "中華新館", city: "高雄市", district: "前金區", address: "高雄市前金區中華三路" },
  { brand_id: "cashbox", name: "建興店", city: "高雄市", district: "三民區", address: "高雄市三民區建興路" },
  { brand_id: "cashbox", name: "墾丁壹號店", city: "屏東縣", district: "恆春鎮", address: "屏東縣恆春鎮墾丁路" },

  // 好樂迪 — holiday.com.tw 營業時間／門市查詢 + 公司登記營業中分店
  { brand_id: "holiday", name: "內湖店", city: "台北市", district: "內湖區", address: "台北市內湖區成功路四段68號" },
  { brand_id: "holiday", name: "石牌店", city: "台北市", district: "北投區", address: "台北市北投區裕民六路120號" },
  { brand_id: "holiday", name: "錦州店", city: "台北市", district: "中山區", address: "台北市中山區錦州街15號" },
  { brand_id: "holiday", name: "中興店", city: "台北市", district: "松山區", address: "台北市松山區復興南路一段27號" },
  { brand_id: "holiday", name: "西寧店", city: "台北市", district: "萬華區", address: "台北市萬華區西寧南路62號" },
  { brand_id: "holiday", name: "館前店", city: "台北市", district: "中正區", address: "台北市中正區館前路34號" },
  { brand_id: "holiday", name: "通化店", city: "台北市", district: "信義區", address: "台北市信義區基隆路二段109號" },
  { brand_id: "holiday", name: "景美店", city: "台北市", district: "文山區", address: "台北市文山區羅斯福路六段403號" },
  { brand_id: "holiday", name: "基隆店", city: "基隆市", district: "信義區", address: "基隆市信義區信一路147號" },
  { brand_id: "holiday", name: "淡水店", city: "新北市", district: "淡水區", address: "新北市淡水區中正路250號" },
  { brand_id: "holiday", name: "汐止店", city: "新北市", district: "汐止區", address: "新北市汐止區中興路158之1號" },
  { brand_id: "holiday", name: "蘆洲店", city: "新北市", district: "蘆洲區", address: "新北市蘆洲區長榮路238號" },
  { brand_id: "holiday", name: "重陽店", city: "新北市", district: "三重區", address: "新北市三重區重陽路一段1號" },
  { brand_id: "holiday", name: "三重店", city: "新北市", district: "三重區", address: "新北市三重區正義北路68號" },
  { brand_id: "holiday", name: "板前店", city: "新北市", district: "板橋區", address: "新北市板橋區南雅南路一段8號" },
  { brand_id: "holiday", name: "板後店", city: "新北市", district: "板橋區", address: "新北市板橋區館前東路106號" },
  { brand_id: "holiday", name: "埔墘店", city: "新北市", district: "板橋區", address: "新北市板橋區三民路一段183號" },
  { brand_id: "holiday", name: "中和店", city: "新北市", district: "中和區", address: "新北市中和區景新街338號" },
  { brand_id: "holiday", name: "土城店", city: "新北市", district: "土城區", address: "新北市土城區中央路二段211號" },
  { brand_id: "holiday", name: "樹林店", city: "新北市", district: "樹林區", address: "新北市樹林區鎮前街18號" },
  { brand_id: "holiday", name: "三峽店", city: "新北市", district: "三峽區", address: "新北市三峽區文化路59號" },
  { brand_id: "holiday", name: "復興店", city: "桃園市", district: "桃園區", address: "桃園市桃園區復興路70號" },
  { brand_id: "holiday", name: "桃中店", city: "桃園市", district: "桃園區", address: "桃園市桃園區中正路366號" },
  { brand_id: "holiday", name: "中美店", city: "桃園市", district: "中壢區", address: "桃園市中壢區中美路二段137號" },
  { brand_id: "holiday", name: "新竹店", city: "新竹市", district: "東區", address: "新竹市東區中華路二段200號" },
  { brand_id: "holiday", name: "頭份店", city: "苗栗縣", district: "頭份市", address: "苗栗縣頭份市中正路169號" },
  { brand_id: "holiday", name: "向陽店", city: "台中市", district: "豐原區", address: "台中市豐原區向陽路77號" },
  { brand_id: "holiday", name: "西屯店", city: "台中市", district: "西屯區", address: "台中市西屯區河南路二段301巷60號" },
  { brand_id: "holiday", name: "文心店", city: "台中市", district: "北屯區", address: "台中市北屯區文心路四段821號" },
  { brand_id: "holiday", name: "三民店", city: "台中市", district: "北區", address: "台中市北區三民路三段136號" },
  { brand_id: "holiday", name: "美村店", city: "台中市", district: "西區", address: "台中市西區美村路一段272號" },
  { brand_id: "holiday", name: "大里店", city: "台中市", district: "大里區", address: "台中市大里區中興路二段446之5號" },
  { brand_id: "holiday", name: "彰化店", city: "彰化縣", district: "彰化市", address: "彰化縣彰化市華山路22號" },
  { brand_id: "holiday", name: "斗六店", city: "雲林縣", district: "斗六市", address: "雲林縣斗六市西平路20號" },
  { brand_id: "holiday", name: "成功店", city: "台南市", district: "中西區", address: "台南市中西區成功路99號" },
  { brand_id: "holiday", name: "楠梓店", city: "高雄市", district: "楠梓區", address: "高雄市楠梓區瑞屏路1號" },
  { brand_id: "holiday", name: "中華店", city: "高雄市", district: "前金區", address: "高雄市前金區中華三路11號" },
  { brand_id: "holiday", name: "建工店", city: "高雄市", district: "三民區", address: "高雄市三民區建工路431號" },
  { brand_id: "holiday", name: "東港店", city: "屏東縣", district: "東港鎮", address: "屏東縣東港鎮中山路73號" },
  { brand_id: "holiday", name: "宜蘭店", city: "宜蘭縣", district: "宜蘭市", address: "宜蘭縣宜蘭市舊城東路50號" },
  { brand_id: "holiday", name: "羅東店", city: "宜蘭縣", district: "羅東鎮", address: "宜蘭縣羅東鎮公正路" },
  { brand_id: "holiday", name: "花蓮店", city: "花蓮縣", district: "花蓮市", address: "花蓮縣花蓮市國聯五路69號" },
  { brand_id: "holiday", name: "玉里店", city: "花蓮縣", district: "玉里鎮", address: "花蓮縣玉里鎮中山路二段113號" },
  { brand_id: "holiday", name: "台東店", city: "台東縣", district: "台東市", address: "台東縣台東市中華路一段572號" },

  // 星聚點 — 西門／板橋／復興等館已歇業，目前僅台北旗艦館
  { brand_id: "star", name: "旗艦館", city: "台北市", district: "大同區", address: "台北市大同區延平北路二段83號" },
];

export function seedVenueId(v: Pick<SeedVenue, "brand_id" | "city" | "name">) {
  return `${v.brand_id}-${v.city}-${v.name}`;
}

const SEED_BRANDS = [
  {
    id: "cashbox",
    name: "錢櫃",
    booking_url: "https://www.cashboxparty.com/",
    logo_url: "🎤",
    enabled: 1,
  },
  {
    id: "holiday",
    name: "好樂迪",
    booking_url: "https://www.holiday.com.tw/",
    logo_url: "🎵",
    enabled: 1,
  },
  {
    id: "star",
    name: "星聚點",
    booking_url: "https://www.star-ktv.com/",
    logo_url: "⭐",
    enabled: 1,
  },
] as const;

export function seedCatalog() {
  const venues = sortVenues(
    SEED_VENUES.map((v) => ({
      id: seedVenueId(v),
      brand_id: v.brand_id,
      name: v.name,
      city: v.city,
      district: v.district,
      address: v.address,
      enabled: 1,
      created_at: "",
    })),
  );
  return {
    brands: [...SEED_BRANDS],
    venues,
    cities: sortCities(venues.map((v) => v.city)),
  };
}

export function cityRank(city: string) {
  const i = (CITY_ORDER as readonly string[]).indexOf(city);
  return i === -1 ? 999 : i;
}

function cmpText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortCities(cities: string[]) {
  return [...new Set(cities)].sort((a, b) => cityRank(a) - cityRank(b) || cmpText(a, b));
}

export function sortVenues<T extends { city: string; name: string }>(venues: T[]) {
  return [...venues].sort(
    (a, b) => cityRank(a.city) - cityRank(b.city) || cmpText(a.name, b.name),
  );
}

export function venuesMatching<T extends { city: string; brand_id: string; enabled?: number }>(
  venues: T[],
  opts: { city?: string; brandId?: string },
) {
  return venues.filter((v) => {
    if (v.enabled === 0) return false;
    if (opts.city && v.city !== opts.city) return false;
    if (opts.brandId && v.brand_id !== opts.brandId) return false;
    return true;
  });
}

export function preferredCity(cities: string[]) {
  const ordered = sortCities(cities);
  return ordered.includes("台北市") ? "台北市" : ordered[0] || "";
}
