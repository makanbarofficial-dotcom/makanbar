"use client";

import { type SubmitEvent, useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert, ui } from "@/components/ui";
import {
  TEHRAN_CITY,
  TEHRAN_PROVINCE,
  VEHICLE_TYPES,
  formatDate,
  formatPrice,
  getProvinceCities,
  getProvinces,
  normalizeDigits,
  placeLabel,
} from "@/lib/shipments";

type Place = { province: string; city: string };

type LoadStatus = "available" | "assigned" | "in_transit" | "delivered" | "cancelled";

type VehicleRequest = {
  id: string;
  origin: string;
  destination: string;
  cargo_type: string;
  weight: string | null;
  vehicle_type: string | null;
  price: number | null;
  status: LoadStatus;
  description: string | null;
  created_at: string;
  driver_id: string | null;
  contact_name: string | null;
};

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string | null;
  vehicle_plate: string | null;
};

const STATUS_LABELS: Record<LoadStatus, string> = {
  available: "در انتظار راننده",
  assigned: "راننده پذیرفت",
  in_transit: "در مسیر",
  delivered: "تحویل شد",
  cancelled: "لغو شد",
};

const STATUS_TONES: Record<LoadStatus, string> = {
  available: "bg-amber-500/15 text-amber-300",
  assigned: "bg-sky-500/15 text-sky-300",
  in_transit: "bg-orange-500/15 text-orange-300",
  delivered: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-red-500/15 text-red-300",
};

// متصدی (یا مدیر) برای جابه‌جایی بارها از رانندگان ماشین درخواست می‌کند؛
// درخواست مستقیم در «بارهای آزاد» پنل رانندگان قرار می‌گیرد.
// staff.id خالی یعنی مدیر: همه درخواست‌های ماشین را می‌بیند و ثبتش به نام هیچ متصدی‌ای نیست.
export function VehicleRequests({
  supabase,
  staff,
  defaultDestination,
}: {
  supabase: SupabaseClient;
  staff: { id: number | null; name: string; phone: string };
  defaultDestination: Place;
}) {
  const [origin, setOrigin] = useState<Place>({ province: TEHRAN_PROVINCE, city: TEHRAN_CITY });
  const [destination, setDestination] = useState<Place>(defaultDestination);
  const [items, setItems] = useState<VehicleRequest[]>([]);
  const [drivers, setDrivers] = useState<Record<string, Driver>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = staff.id == null;

  const load = useCallback(async () => {
    let query = supabase
      .from("loads")
      .select(
        "id, origin, destination, cargo_type, weight, vehicle_type, price, status, description, created_at, driver_id, contact_name"
      )
      .is("request_id", null)
      .order("created_at", { ascending: false });

    if (staff.id != null) query = query.eq("handled_by_staff_id", staff.id);

    const { data } = await query;

    const list = (data ?? []) as VehicleRequest[];
    setItems(list);

    const driverIds = list.map((item) => item.driver_id).filter((id): id is string => !!id);

    if (driverIds.length > 0) {
      const { data: driverRows } = await supabase
        .from("driver_profiles")
        .select("id, full_name, phone, vehicle_type, vehicle_plate")
        .in("id", driverIds);

      setDrivers(
        Object.fromEntries(((driverRows ?? []) as Driver[]).map((driver) => [driver.id, driver]))
      );
    }

    setLoading(false);
  }, [supabase, staff.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = (name: string) => String(formData.get(name) ?? "").trim();

    const cargoType = value("cargo_type");
    const priceDigits = normalizeDigits(value("price")).replace(/\D/g, "");

    if (!origin.city || !destination.city || !cargoType) {
      setFormError("شهر مبدا، شهر مقصد و نوع بار را مشخص کنید.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("loads").insert({
      handled_by_staff_id: staff.id,
      request_id: null,
      driver_id: null,
      status: "available",
      shipment_type: "charter",
      origin: placeLabel(origin.province, origin.city),
      destination: placeLabel(destination.province, destination.city),
      cargo_type: cargoType,
      weight: value("weight") || null,
      vehicle_type: value("vehicle_type") || null,
      price: priceDigits ? Number(priceDigits) : null,
      pickup_address: value("pickup_address") || null,
      delivery_address: value("delivery_address") || null,
      description: value("description") || null,
      contact_name: staff.name,
      contact_phone: staff.phone,
    });

    setSubmitting(false);

    if (error) {
      setFormError(`ثبت درخواست انجام نشد: ${error.message}`);
      return;
    }

    form.reset();
    setOrigin({ province: TEHRAN_PROVINCE, city: TEHRAN_CITY });
    setDestination(defaultDestination);
    setShowForm(false);
    await load();
  }

  async function cancelRequest(item: VehicleRequest) {
    if (!confirm("این درخواست ماشین لغو شود؟")) return;

    setBusyId(item.id);
    const { data, error } = await supabase
      .from("loads")
      .update({ status: "cancelled" })
      .eq("id", item.id)
      .eq("status", "available")
      .select("id")
      .maybeSingle();
    setBusyId(null);

    if (error || !data) {
      alert("لغو انجام نشد؛ احتمالاً راننده‌ای همین الان درخواست را پذیرفته است.");
    }

    await load();
  }

  return (
    <section className="mt-6 space-y-4">
      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className={ui.btnPrimary}>
          ＋ درخواست ماشین جدید
        </button>
      ) : (
        <form onSubmit={handleSubmit} className={`${ui.card} space-y-4 p-5`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">درخواست ماشین</h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1 text-white/50 hover:bg-white/10"
              aria-label="بستن"
            >
              ✕
            </button>
          </div>
          <p className="text-xs leading-6 text-white/50">
            این درخواست در «بارهای آزاد» پنل رانندگان نمایش داده می‌شود و اولین راننده‌ای که
            بپذیرد، با شما تماس می‌گیرد.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["مبدا", origin, setOrigin],
                ["مقصد", destination, setDestination],
              ] as const
            ).map(([title, place, setPlace]) => (
              <fieldset key={title}>
                <legend className="text-sm text-white/70">{title} *</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    aria-label={`استان ${title}`}
                    value={place.province}
                    onChange={(event) => setPlace({ province: event.target.value, city: "" })}
                    className={ui.select}
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
                    onChange={(event) => setPlace({ ...place, city: event.target.value })}
                    className={ui.select}
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
            ))}
            <label className="block text-sm text-white/70">
              نوع خودرو
              <select name="vehicle_type" defaultValue="" className={`${ui.select} mt-2`}>
                <option value="">فرقی نمی‌کند</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-white/70">
              نوع بار *
              <input
                name="cargo_type"
                required
                maxLength={120}
                placeholder="مثلاً خرده‌بار مخلوط"
                className={`${ui.input} mt-2`}
              />
            </label>
            <label className="block text-sm text-white/70">
              وزن تقریبی
              <input name="weight" maxLength={80} placeholder="مثلاً ۸ تن" className={`${ui.input} mt-2`} />
            </label>
            <label className="block text-sm text-white/70">
              کرایه (تومان)
              <input name="price" inputMode="numeric" placeholder="کرایه پیشنهادی" className={`${ui.input} mt-2`} />
            </label>
            <label className="block text-sm text-white/70">
              آدرس بارگیری
              <input name="pickup_address" maxLength={300} className={`${ui.input} mt-2`} />
            </label>
            <label className="block text-sm text-white/70">
              آدرس تخلیه
              <input name="delivery_address" maxLength={300} className={`${ui.input} mt-2`} />
            </label>
            <label className="block text-sm text-white/70 sm:col-span-2">
              توضیحات
              <textarea
                name="description"
                rows={2}
                maxLength={1000}
                placeholder="زمان بارگیری یا نکات دیگر"
                className={`${ui.input} mt-2 resize-none`}
              />
            </label>
          </div>

          {formError && <Alert tone="error">{formError}</Alert>}

          <button type="submit" disabled={submitting} className={ui.btnPrimary}>
            {submitting ? "در حال ثبت..." : "ارسال برای رانندگان"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="p-6 text-center text-white/50">در حال دریافت...</p>
      ) : items.length === 0 ? (
        <div className={`${ui.card} p-10 text-center text-white/40`}>
          هنوز درخواست ماشینی ثبت نکرده‌اید.
        </div>
      ) : (
        items.map((item) => {
          const driver = item.driver_id ? drivers[item.driver_id] : undefined;

          return (
            <article key={item.id} className={`${ui.card} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-white/40">
                    {formatDate(item.created_at)}
                    {isAdmin && item.contact_name ? ` · ثبت‌کننده: ${item.contact_name}` : ""}
                  </p>
                  <h3 className="mt-1 text-lg font-black">
                    {item.origin} ← {item.destination}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    {[item.vehicle_type || "هر خودرویی", item.cargo_type, item.weight]
                      .filter(Boolean)
                      .join(" · ")}
                    {" · "}
                    {formatPrice(item.price)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[item.status]}`}
                >
                  {STATUS_LABELS[item.status]}
                </span>
              </div>

              {driver && (
                <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm">
                  <span className="text-white/50">راننده: </span>
                  <span className="font-bold">{driver.full_name}</span>{" "}
                  <a href={`tel:${driver.phone}`} dir="ltr" className="font-bold text-brand-2">
                    {driver.phone}
                  </a>
                  {(driver.vehicle_type || driver.vehicle_plate) && (
                    <span className="block text-xs text-white/50">
                      {[driver.vehicle_type, driver.vehicle_plate].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
              )}

              {item.status === "available" && (
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void cancelRequest(item)}
                  className="mt-3 rounded-xl border border-red-400/25 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  لغو درخواست
                </button>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
