import { getCities, getProvincesList } from "@code-plate/iran-cities";
import { normalizeSearch, placeLabel, provinceFa } from "@/lib/shipments";

// «بارهای نزدیک من»: فاصله‌ی راننده تا مبدأ هر بار.
// مبدأ بار فقط اسم شهر است (مثل «کرج، البرز»)؛ مختصات شهرها یک بار از OpenStreetMap گرفته شده
// (scripts/geocode-cities.mjs → lib/city-coords.json) و فقط وقتی راننده این گزینه را بزند بارگذاری می‌شود.

type Coords = Record<string, [number, number] | null>;

let lookup: Map<string, [number, number]> | null = null;

async function getLookup() {
  if (lookup) return lookup;
  const coords = (await import("./city-coords.json")).default as unknown as Coords;
  const map = new Map<string, [number, number]>();
  for (const province of getProvincesList()) {
    const provincePoint = coords[province.en];
    if (provincePoint) map.set(normalizeSearch(provinceFa(province.en)), provincePoint);
    for (const city of getCities(province.en)) {
      // اگر مختصات شهر پیدا نشده بود، مرکز استان جایش حساب می‌شود
      const point = coords[`${province.en}/${city.en}`] ?? provincePoint;
      if (point) map.set(normalizeSearch(placeLabel(province.en, city.en)), point);
    }
  }
  lookup = map;
  return map;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// فاصله‌ی مستقیم (هوایی) تا مبدأ هر بار، به کیلومتر؛ بار با مبدأ ناشناخته فاصله ندارد
export async function distancesToOrigins(
  me: { lat: number; lng: number },
  loads: { id: string | number; origin: string }[]
) {
  const map = await getLookup();
  const result: Record<string, number> = {};
  for (const load of loads) {
    const point = map.get(normalizeSearch(load.origin));
    if (point) result[String(load.id)] = distanceKm(me, { lat: point[0], lng: point[1] });
  }
  return result;
}
