"use client";

import { type SubmitEvent, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
  SHIPMENT_TYPE_LABELS,
  type ShipmentRequest,
  type ShipmentType,
  type Terminal,
  VEHICLE_TYPES,
  detectDirection,
  formatPrice,
  getProvinceCities,
  getProvinces,
  normalizeDigits,
  placeLabel,
  terminalAddress,
} from "@/lib/shipments";

type Place = { province: string; city: string };

const empty: Place = { province: "", city: "" };

const field =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-orange-500";
const select =
  "w-full rounded-2xl border border-white/10 bg-ink-2 px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50";

const ALL_TYPES = Object.keys(SHIPMENT_TYPE_LABELS) as ShipmentType[];

// ثبت بار برای مشتری‌ای که تلفنی تماس گرفته؛ بار به هیچ حساب صاحب باری وصل نیست.
// مدیر همه نوع بار ثبت می‌کند؛ متصدی درون‌شهری فقط بار درون‌شهری شهرهای خودش و نماینده
// فقط خرده‌بار با مبدا شهر خودش (types، defaultCity و areas: محدوده‌ی «مبدا»؛ شهر خالی یعنی کل استان).
// متصدی خرده‌بار تهران: مبدا تهران و مقصد فقط شهرهای خودش (destinationAreas و defaultDestination).
export function PhoneOrderForm({
  supabase,
  onCreated,
  onClose,
  types = ALL_TYPES,
  defaultCity = empty,
  areas,
  destinationAreas,
  defaultDestination = empty,
}: {
  supabase: SupabaseClient;
  onCreated: (row: ShipmentRequest) => void;
  onClose: () => void;
  types?: ShipmentType[];
  defaultCity?: Place;
  areas?: Place[];
  destinationAreas?: Place[];
  defaultDestination?: Place;
}) {
  const [shipmentType, setShipmentType] = useState<ShipmentType>(types[0]);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("door_to_door");
  const [origin, setOrigin] = useState<Place>(defaultCity);
  const [destination, setDestination] = useState<Place>(defaultDestination);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isPartial = shipmentType === "partial";
  const isIntracity = shipmentType === "intracity";
  const showAddresses = !isPartial || deliveryMode === "door_to_door";
  const priceDigits = normalizeDigits(price).replace(/\D/g, "");
  const priceValue = priceDigits ? Number(priceDigits) : null;

  // بار درون‌شهری: با تیک «آدرس شرکت»، مبدا یکی از باربری‌های ماکان بار در همان شهر است
  const [fromCompany, setFromCompany] = useState(false);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [terminalId, setTerminalId] = useState("");

  useEffect(() => {
    supabase
      .from("representatives")
      .select("id, name, province, city, address")
      .then(({ data }) => setTerminals((data ?? []) as Terminal[]));
  }, [supabase]);

  const cityTerminals = useMemo(
    () =>
      terminals.filter(
        (terminal) => terminal.province === origin.province && terminal.city === origin.city
      ),
    [terminals, origin.province, origin.city]
  );

  // شهر عوض شد: اگر فقط یک باربری هست همان انتخاب می‌شود
  useEffect(() => {
    setTerminalId(cityTerminals.length === 1 ? String(cityTerminals[0].id) : "");
  }, [cityTerminals]);

  const terminal = isIntracity && fromCompany
    ? cityTerminals.find((item) => String(item.id) === terminalId)
    : undefined;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const value = (name: string) => String(formData.get(name) ?? "").trim();

    if (!value("full_name") || !value("phone") || !value("cargo_type")) {
      setError("نام، شماره تماس و نوع بار الزامی هستند.");
      return;
    }

    // بار درون‌شهری یک شهر دارد که هم مبدا است هم مقصد
    const target = isIntracity ? origin : destination;

    if (!origin.city || !target.city) {
      setError(isIntracity ? "شهر را انتخاب کنید." : "شهر مبدا و مقصد را انتخاب کنید.");
      return;
    }

    if (!isIntracity && origin.province === destination.province && origin.city === destination.city) {
      setError("مبدا و مقصد نمی‌توانند یک شهر باشند؛ برای داخل شهر «درون‌شهری» را انتخاب کنید.");
      return;
    }

    if (isIntracity && fromCompany && !terminal) {
      setError(
        cityTerminals.length
          ? "باربری شرکت را انتخاب کنید."
          : "برای این شهر آدرس شرکت (باربری) ثبت نشده؛ تیک را بردارید و آدرس مبدا را بنویسید."
      );
      return;
    }

    const pickupAddress = terminal ? terminalAddress(terminal) : value("pickup_address");

    if (isIntracity && (!pickupAddress || !value("delivery_address"))) {
      setError("برای بار درون‌شهری، آدرس مبدا و مقصد را بنویسید.");
      return;
    }

    if (isPartial && (!value("quantity") || !value("weight"))) {
      setError("برای خرده‌بار، تعداد و وزن را بنویسید.");
      return;
    }

    const routing = isIntracity
      ? { direction: "intracity" as const, province: origin.province, city: origin.city }
      : detectDirection(origin, destination);
    const dimensions = ["length", "width", "height"]
      .map((key, i) => (value(key) ? `${["طول", "عرض", "ارتفاع"][i]} ${value(key)}` : ""))
      .filter(Boolean);

    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("requests")
      .insert({
        customer_id: null,
        full_name: value("full_name"),
        phone: value("phone"),
        shipment_type: shipmentType,
        direction: routing.direction,
        city_province: routing.province,
        city: routing.city,
        origin_province: origin.province,
        origin_city: origin.city,
        origin: placeLabel(origin.province, origin.city),
        destination: placeLabel(target.province, target.city),
        pickup_address: showAddresses ? pickupAddress || null : null,
        delivery_address: showAddresses ? value("delivery_address") || null : null,
        delivery_mode: isPartial ? deliveryMode : "door_to_door",
        cargo_type: value("cargo_type"),
        weight: value("weight") || null,
        quantity: isPartial ? value("quantity") : null,
        dimensions: isPartial && dimensions.length ? `${dimensions.join(" × ")} سانتی‌متر` : null,
        vehicle_type: isPartial ? "" : value("vehicle_type"),
        description: value("description") || null,
        price: priceValue,
        status: "جدید",
      })
      .select("*")
      .single();

    setSaving(false);

    if (insertError) {
      setError(`ثبت بار انجام نشد: ${insertError.message}`);
      return;
    }

    // پیامک به مدیر و متصدی شهر
    supabase.functions
      .invoke("notify-new-request", { body: { requestId: data.id } })
      .catch((notifyError) => console.error("Notify error:", notifyError));

    onCreated(data as ShipmentRequest);
  }

  // فقط استان‌ها و شهرهای محدوده‌ی متصدی/نماینده (اگر areas داده شده باشد)؛ فقط برای مبدا
  function provinceOptions(limit?: Place[]) {
    return limit
      ? getProvinces().filter((item) => limit.some((area) => area.province === item.en))
      : getProvinces();
  }

  function cityOptions(province: string, limit?: Place[]) {
    const cities = getProvinceCities(province);
    if (!limit) return cities;
    const inProvince = limit.filter((area) => area.province === province);
    if (inProvince.some((area) => !area.city)) return cities;
    return cities.filter((item) => inProvince.some((area) => area.city === item.en));
  }

  function placePicker(title: string, place: Place, setPlace: (p: Place) => void, limit?: Place[]) {
    return (
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-orange-300">{title} *</legend>
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label={`استان ${title}`}
            value={place.province}
            onChange={(e) => setPlace({ province: e.target.value, city: "" })}
            className={select}
          >
            <option value="">استان</option>
            {provinceOptions(limit).map((item) => (
              <option key={item.en} value={item.en}>
                {item.fa}
              </option>
            ))}
          </select>
          <select
            aria-label={`شهر ${title}`}
            value={place.city}
            disabled={!place.province}
            onChange={(e) => setPlace({ ...place, city: e.target.value })}
            className={select}
          >
            <option value="">شهر</option>
            {cityOptions(place.province, limit).map((item) => (
              <option key={item.en} value={item.en}>
                {item.fa}
              </option>
            ))}
          </select>
        </div>
      </fieldset>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-5 rounded-3xl border border-orange-400/30 bg-orange-500/[0.04] p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">
          📞 ثبت بار تلفنی{types.length === 1 ? ` ${SHIPMENT_TYPE_LABELS[types[0]]}` : ""}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن"
          className="rounded-lg px-3 py-1 text-white/50 hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="full_name" placeholder="نام مشتری *" className={field} />
        <input
          name="phone"
          placeholder="شماره تماس مشتری *"
          inputMode="tel"
          dir="ltr"
          className={`${field} text-right`}
        />
      </div>

      {types.length > 1 && (
      <div className="grid grid-cols-3 gap-2">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setShipmentType(type)}
            className={`rounded-2xl border py-3 font-bold transition ${
              shipmentType === type
                ? "border-orange-400 bg-orange-500/15"
                : "border-white/10 bg-white/5 text-white/70"
            }`}
          >
            {SHIPMENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      )}

      {isIntracity ? (
        placePicker("شهر", origin, setOrigin, areas)
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {placePicker("مبدا", origin, setOrigin, areas)}
          {placePicker("مقصد", destination, setDestination, destinationAreas)}
        </div>
      )}

      {isPartial && (
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(DELIVERY_MODE_LABELS) as DeliveryMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDeliveryMode(mode)}
              className={`rounded-2xl border py-3 text-sm font-bold transition ${
                deliveryMode === mode
                  ? "border-orange-400 bg-orange-500/15"
                  : "border-white/10 bg-white/5 text-white/70"
              }`}
            >
              {DELIVERY_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      )}

      {isIntracity && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={fromCompany}
              onChange={(e) => setFromCompany(e.target.checked)}
              className="h-5 w-5 accent-orange-500"
            />
            🏢 مبدا: آدرس شرکت (باربری ماکان بار)
          </label>

          {fromCompany &&
            (!origin.city ? (
              <p className="text-xs text-white/50">اول شهر را انتخاب کنید.</p>
            ) : cityTerminals.length === 0 ? (
              <p className="text-xs leading-6 text-orange-200">
                برای این شهر آدرس شرکت ثبت نشده است (بخش نمایندگان)؛ تیک را بردارید و آدرس مبدا را
                بنویسید.
              </p>
            ) : cityTerminals.length === 1 ? (
              <p className="text-xs leading-6 text-emerald-300">{terminalAddress(cityTerminals[0])}</p>
            ) : (
              <select
                aria-label="باربری مبدا"
                value={terminalId}
                onChange={(e) => setTerminalId(e.target.value)}
                className={select}
              >
                <option value="">باربری را انتخاب کنید</option>
                {cityTerminals.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {terminalAddress(item)}
                  </option>
                ))}
              </select>
            ))}
        </div>
      )}

      {showAddresses && (
        <div className="grid gap-3 sm:grid-cols-2">
          {!(isIntracity && fromCompany) && (
            <input
              name="pickup_address"
              placeholder={isIntracity ? "آدرس مبدا (بارگیری) *" : "آدرس بارگیری"}
              className={field}
            />
          )}
          <input
            name="delivery_address"
            placeholder={isIntracity ? "آدرس مقصد (تخلیه) *" : "آدرس تخلیه"}
            className={field}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="cargo_type" placeholder="نوع بار *" className={field} />
        {isPartial ? (
          <input name="quantity" placeholder="تعداد *، مثلاً ۵ کارتن" className={field} />
        ) : (
          <select name="vehicle_type" defaultValue="" className={select}>
            <option value="">خودرو: فرقی نمی‌کند</option>
            {VEHICLE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        )}
        <input
          name="weight"
          placeholder={isPartial ? "وزن *، مثلاً ۸۰ کیلو" : "وزن، مثلاً ۱۰ تن"}
          className={field}
        />
        <div>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="کرایه (تومان، اختیاری)"
            className={field}
          />
          {priceValue != null && (
            <p className="mt-1 text-xs font-bold text-emerald-300">{formatPrice(priceValue)}</p>
          )}
        </div>
      </div>

      {isPartial && (
        <div className="grid grid-cols-3 gap-2">
          <input name="length" placeholder="طول (cm)" inputMode="decimal" className={field} />
          <input name="width" placeholder="عرض (cm)" inputMode="decimal" className={field} />
          <input name="height" placeholder="ارتفاع (cm)" inputMode="decimal" className={field} />
        </div>
      )}

      <textarea name="description" rows={2} placeholder="توضیحات" className={`${field} resize-none`} />

      {error && (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-orange-500 py-4 font-black text-white transition hover:bg-orange-400 disabled:opacity-50"
      >
        {saving ? "در حال ثبت..." : "ثبت بار"}
      </button>
    </form>
  );
}
