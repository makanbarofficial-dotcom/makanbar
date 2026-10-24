import { getCities, getProvincesList } from "@code-plate/iran-cities";

// انواع حمل؛ درون‌شهری یعنی مبدا و مقصد در یک شهر (فقط مدیر و متصدی درون‌شهری همان شهر می‌بینند)
export type ShipmentType = "full" | "partial" | "intracity";

// جهت حمل بین‌شهری؛ بار درون‌شهری جهت «intracity» دارد
export type Direction = "from_tehran" | "to_tehran" | "between_cities" | "intracity";

export const SHIPMENT_TYPE_LABELS: Record<ShipmentType, string> = {
  full: "دربستی",
  partial: "خرده‌بار",
  intracity: "درون‌شهری",
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  from_tehran: "از تهران به شهرستان",
  to_tehran: "از شهرستان به تهران",
  between_cities: "بین شهرستان‌ها",
  intracity: "درون‌شهری",
};

// نوع متصدی: بین‌شهری (خرده‌بار تهران ← شهر او)، درون‌شهری (بارهای داخل شهر او)
// یا نماینده (خرده‌بارهایی که از شهر او به تهران یا شهرهای دیگر می‌رود)
export type StaffKind = "intercity" | "intracity" | "origin";

export const STAFF_KIND_LABELS: Record<StaffKind, string> = {
  intercity: "متصدی خرده‌بار تهران",
  intracity: "متصدی درون‌شهری",
  origin: "نماینده شهر",
};

// بارهایی که برای رانندگان فرستاده می‌شوند (دربستی و درون‌شهری)
export function isDriverShipment(type: ShipmentType | null | undefined) {
  return type === "full" || type === "intracity";
}

// روش تحویل خرده‌بار
export type DeliveryMode = "terminal" | "door_to_door";

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  terminal: "باربری به باربری",
  door_to_door: "درب به درب",
};

export const DELIVERY_MODE_HINTS: Record<DeliveryMode, string> = {
  terminal: "بار را به باربری مبدا تحویل می‌دهید و گیرنده آن را از باربری مقصد تحویل می‌گیرد.",
  door_to_door: "بار را از محل شما می‌گیریم و تا درِ مغازه یا انبار مقصد می‌رسانیم.",
};

export const TEHRAN_PROVINCE = "tehran";
export const TEHRAN_CITY = "tehran";

// وضعیت‌ها به ترتیب چرخه کار
export const STATUSES = [
  "جدید",
  "در حال پیگیری",
  "تأیید شده",
  "ارسال به رانندگان",
  "راننده تعیین شد",
  "در حال حمل",
  "انجام شد",
  "لغو شد",
] as const;

// وضعیت‌هایی که متصدی می‌تواند برای خرده‌بار انتخاب کند
export const STAFF_STATUSES = [
  "جدید",
  "در حال پیگیری",
  "تأیید شده",
  "در حال حمل",
  "انجام شد",
  "لغو شد",
] as const;

export const VEHICLE_TYPES = [
  "تریلی",
  "کامیون",
  "جفت",
  "تک",
  "خاور و کامیونت",
  "وانت و نیسان",
  "پیک موتوری",
];

export type ShipmentRequest = {
  id: number;
  created_at: string;
  updated_at?: string | null;
  customer_id: string | null;
  full_name: string;
  phone: string;
  origin: string;
  destination: string;
  cargo_type: string;
  weight: string | null;
  vehicle_type: string | null;
  description: string | null;
  status: string | null;
  shipment_type: ShipmentType | null;
  direction: Direction | null;
  city_province: string | null;
  city: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  price: number | null;
  staff_note: string | null;
  quantity: string | null;
  dimensions: string | null;
  origin_province?: string | null;
  origin_city?: string | null;
  delivery_mode: DeliveryMode | null;
};

const provinces = getProvincesList();

export function getProvinces() {
  return provinces;
}

export function getProvinceCities(province: string) {
  return province ? getCities(province) : [];
}

export function isTehran(province: string, city: string) {
  return province === TEHRAN_PROVINCE && city === TEHRAN_CITY;
}

// جهت حمل از روی مبدا و مقصد.
// فقط خرده‌بار «تهران ← شهرستان» به متصدی شهر مقصد می‌رسد؛ بقیه فقط در پنل مدیر دیده می‌شوند.
// شهر ذخیره‌شده: برای بار شهرستان ← تهران خودِ مبدا، و در بقیه حالت‌ها مقصد.
export function detectDirection(
  origin: { province: string; city: string },
  destination: { province: string; city: string }
): { direction: Direction; province: string; city: string } {
  const fromTehran = isTehran(origin.province, origin.city);
  const toTehran = isTehran(destination.province, destination.city);

  if (fromTehran && !toTehran) {
    return { direction: "from_tehran", ...destination };
  }

  if (toTehran && !fromTehran) {
    return { direction: "to_tehran", ...origin };
  }

  return { direction: "between_cities", ...destination };
}

// نام نمایشی یک نقطه: «تهران» یا «شهر، استان»
export function placeLabel(province: string, city: string) {
  return isTehran(province, city) ? "تهران" : regionLabel(province, city);
}

// باربری‌های ماکان بار (همان نمایندگان هر شهر) که مبدا بار درون‌شهری می‌توانند باشند
export type Terminal = {
  id: number;
  name: string | null;
  province: string;
  city: string;
  address: string | null;
};

// متن آدرس بارگیری وقتی مبدا باربری است: «باربری اطلس بار — نبش خیابان …»
export function terminalAddress(terminal: Terminal) {
  return `باربری ${terminal.name ?? "ماکان بار"}${terminal.address ? ` — ${terminal.address}` : ""}`;
}

// آیا مبدا/مقصد ذخیره‌شده‌ی بار (مثل «مشهد، خراسان رضوی» یا «تهران») در استان/شهر انتخاب‌شده است؟
// بدون استان یعنی همه جا؛ بدون شهر یعنی کل استان.
export function placeMatches(label: string, province: string, city: string) {
  if (!province) return true;

  const value = normalizeSearch(label);
  if (city) return value === normalizeSearch(placeLabel(province, city));

  const provinceName = normalizeSearch(provinceFa(province));
  return value === provinceName || value.endsWith("،" + provinceName);
}

// آیا خودروی راننده برای بار مناسب است؟ بار بدون نوع خودرو برای همه است
// و «کامیون» یعنی تک یا جفت.
export function vehicleFits(loadVehicle: string | null | undefined, driverVehicle: string | null | undefined) {
  if (!loadVehicle || loadVehicle === "فرقی ندارد" || !driverVehicle) return true;
  if (loadVehicle === driverVehicle) return true;
  return loadVehicle === "کامیون" && (driverVehicle === "تک" || driverVehicle === "جفت");
}

export function provinceFa(value: string | null | undefined) {
  if (!value) return "";

  const found = provinces.find(
    (province) => province.en === value || province.fa === value
  );

  return found?.fa || value;
}

export function cityFa(
  province: string | null | undefined,
  city: string | null | undefined
) {
  if (!city || city === "*") return "کل استان";
  if (!province) return city;

  const found = getCities(province).find(
    (item) => item.en === city || item.fa === city
  );

  return found?.fa || city;
}

// متن «شهر، استان» برای سمت شهرستان
export function regionLabel(
  province: string | null | undefined,
  city: string | null | undefined
) {
  const cityName = cityFa(province, city);
  const provinceName = provinceFa(province);

  return cityName === provinceName ? cityName : `${cityName}، ${provinceName}`;
}

export function statusTone(status: string | null) {
  switch (status || "جدید") {
    case "جدید":
      return "bg-sky-500/15 text-sky-300";
    case "در حال پیگیری":
    case "تأیید شده":
      return "bg-amber-500/15 text-amber-300";
    case "ارسال به رانندگان":
    case "راننده تعیین شد":
    case "در حال حمل":
      return "bg-orange-500/15 text-orange-300";
    case "انجام شد":
      return "bg-emerald-500/15 text-emerald-300";
    case "لغو شد":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-white/10 text-white/70";
  }
}

export function formatPrice(value: number | null) {
  return value == null ? "تعیین نشده" : `${value.toLocaleString("fa-IR")} تومان`;
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// متن را برای جستجو یکسان می‌کند: ی/ک عربی و فارسی، فاصله و نیم‌فاصله، اعداد فارسی و حروف بزرگ
export function normalizeSearch(value: string | null | undefined) {
  return normalizeDigits(String(value ?? ""))
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ةۀ]/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[\s‌‏‎]+/g, "")
    .toLowerCase();
}

// آیا یکی از مقدارها شامل عبارت جستجو است؟
export function matchesSearch(query: string, values: unknown[]) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return values.some((value) => value != null && normalizeSearch(String(value)).includes(needle));
}

export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}
