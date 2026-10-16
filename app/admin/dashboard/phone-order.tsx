"use client";

import { type SubmitEvent, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
  SHIPMENT_TYPE_LABELS,
  type ShipmentRequest,
  type ShipmentType,
  VEHICLE_TYPES,
  detectDirection,
  formatPrice,
  getProvinceCities,
  getProvinces,
  normalizeDigits,
  placeLabel,
} from "@/lib/shipments";

type Place = { province: string; city: string };

const empty: Place = { province: "", city: "" };

const field =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-orange-500";
const select =
  "w-full rounded-2xl border border-white/10 bg-ink-2 px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50";

// ثبت بار برای مشتری‌ای که تلفنی تماس گرفته؛ بار به هیچ حساب صاحب باری وصل نیست
export function PhoneOrderForm({
  supabase,
  onCreated,
  onClose,
}: {
  supabase: SupabaseClient;
  onCreated: (row: ShipmentRequest) => void;
  onClose: () => void;
}) {
  const [shipmentType, setShipmentType] = useState<ShipmentType>("full");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("door_to_door");
  const [origin, setOrigin] = useState<Place>(empty);
  const [destination, setDestination] = useState<Place>(empty);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isPartial = shipmentType === "partial";
  const showAddresses = !isPartial || deliveryMode === "door_to_door";
  const priceDigits = normalizeDigits(price).replace(/\D/g, "");
  const priceValue = priceDigits ? Number(priceDigits) : null;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const value = (name: string) => String(formData.get(name) ?? "").trim();

    if (!value("full_name") || !value("phone") || !value("cargo_type")) {
      setError("نام، شماره تماس و نوع بار الزامی هستند.");
      return;
    }

    if (!origin.city || !destination.city) {
      setError("شهر مبدا و مقصد را انتخاب کنید.");
      return;
    }

    if (origin.province === destination.province && origin.city === destination.city) {
      setError("مبدا و مقصد نمی‌توانند یک شهر باشند.");
      return;
    }

    if (isPartial && (!value("quantity") || !value("weight"))) {
      setError("برای خرده‌بار، تعداد و وزن را بنویسید.");
      return;
    }

    const routing = detectDirection(origin, destination);
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
        origin: placeLabel(origin.province, origin.city),
        destination: placeLabel(destination.province, destination.city),
        pickup_address: showAddresses ? value("pickup_address") || null : null,
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

    // پیامک به متصدی شهر (برای خرده‌بار تهران ← شهرستان)
    supabase.functions
      .invoke("notify-new-request", { body: { requestId: data.id } })
      .catch((notifyError) => console.error("Notify error:", notifyError));

    onCreated(data as ShipmentRequest);
  }

  function placePicker(title: string, place: Place, setPlace: (p: Place) => void) {
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
            {getProvinces().map((item) => (
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
            {getProvinceCities(place.province).map((item) => (
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
        <h3 className="text-lg font-black">📞 ثبت بار تلفنی</h3>
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

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SHIPMENT_TYPE_LABELS) as ShipmentType[]).map((type) => (
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

      <div className="grid gap-4 sm:grid-cols-2">
        {placePicker("مبدا", origin, setOrigin)}
        {placePicker("مقصد", destination, setDestination)}
      </div>

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

      {showAddresses && (
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="pickup_address" placeholder="آدرس بارگیری" className={field} />
          <input name="delivery_address" placeholder="آدرس تخلیه" className={field} />
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
