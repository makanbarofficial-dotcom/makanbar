// یک‌بار اجرا: مختصات همه‌ی شهرها و استان‌های فهرست سایت از OpenStreetMap (Nominatim)
// خروجی: lib/city-coords.json  →  { "alborz/karaj": [35.822, 50.990], "alborz": [...], ... }
// فقط نام شهر و استان فرستاده می‌شود (هیچ اطلاعات کاربری). طبق قانون Nominatim، هر ثانیه حداکثر یک درخواست.
// اجرا: node scripts/geocode-cities.mjs   (اگر وسط کار قطع شد، دوباره اجرا کنید؛ از همان‌جا ادامه می‌دهد)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getCities, getProvincesList } from "@code-plate/iran-cities";

const OUT = "lib/city-coords.json";
const coords = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// مرز تقریبی ایران؛ نتیجه‌ی بیرون از آن پذیرفته نمی‌شود
const inIran = (lat, lng) => lat > 24.5 && lat < 40 && lng > 43.5 && lng < 63.5;

async function search(params) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ir", "accept-language": "fa", ...params });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "makanbar-city-geocode/1.0" } });
      if (response.ok) {
        const [hit] = await response.json();
        await sleep(1100);
        if (!hit) return null;
        const lat = Number(hit.lat);
        const lng = Number(hit.lon);
        return inIran(lat, lng) ? [Math.round(lat * 1000) / 1000, Math.round(lng * 1000) / 1000] : null;
      }
    } catch {
      // شبکه موقتاً قطع شد
    }
    await sleep(3000 * attempt);
  }
  return null;
}

let done = 0;
let missing = [];
const provinces = getProvincesList();
const total = provinces.reduce((sum, p) => sum + getCities(p.en).length + 1, 0);

for (const province of provinces) {
  const stateName = `استان ${province.fa}`;
  if (!coords[province.en]) {
    coords[province.en] =
      (await search({ state: stateName })) ?? (await search({ q: `${province.fa}، ایران` }));
  }
  done++;
  for (const city of getCities(province.en)) {
    const key = `${province.en}/${city.en}`;
    if (!coords[key]) {
      coords[key] =
        (await search({ city: city.fa, state: stateName })) ??
        (await search({ q: `${city.fa}، ${province.fa}` }));
      if (!coords[key]) missing.push(`${province.fa} / ${city.fa}`);
    }
    done++;
    if (done % 25 === 0) {
      writeFileSync(OUT, JSON.stringify(coords));
      console.log(`${done}/${total}`);
    }
  }
}

writeFileSync(OUT, JSON.stringify(coords));
const found = Object.values(coords).filter(Boolean).length;
console.log(`done: ${found}/${total} found`);
if (missing.length) console.log(`not found (${missing.length}):\n${missing.join("\n")}`);
