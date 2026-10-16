"use client";

import { type SubmitEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/ui";
import {
  DELIVERY_MODE_HINTS,
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
  SHIPMENT_TYPE_LABELS,
  type ShipmentRequest,
  type ShipmentType,
  VEHICLE_TYPES,
  detectDirection,
  formatDate,
  formatPrice,
  getProvinceCities,
  getProvinces,
  placeLabel,
  statusTone,
} from "@/lib/shipments";

type Place = { province: string; city: string };

const emptyPlace: Place = { province: "", city: "" };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type CustomerProfile = {
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
};

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-orange-400";

const selectClass =
  "w-full rounded-2xl border border-white/10 bg-ink-2 px-4 py-3 text-white outline-none focus:border-orange-400 disabled:opacity-50";

const TYPE_HINTS: Record<ShipmentType, string> = {
  full: "کل ظرفیت یک خودرو برای بار شما؛ راننده مستقیم بار را جابه‌جا می‌کند.",
  partial: "بار کم‌حجم که همراه بارهای دیگر و از طریق متصدی شهر ارسال می‌شود.",
};

const DIMENSION_FIELDS = [
  ["length", "طول"],
  ["width", "عرض"],
  ["height", "ارتفاع"],
] as const;

// ابعاد واردشده را در یک متن ذخیره می‌کند: «طول ۵۰ × عرض ۴۰ × ارتفاع ۳۰ سانتی‌متر»
function formatDimensions(value: (name: string) => string) {
  const parts = DIMENSION_FIELDS.flatMap(([name, label]) => {
    const size = value(name);
    return size ? [`${label} ${size}`] : [];
  });

  return parts.length ? `${parts.join(" × ")} سانتی‌متر` : null;
}

// شماره موبایل را برای نمایش به قالب 09xxxxxxxxx برمی‌گرداند
function displayPhone(phone: string | null | undefined) {
  if (!phone) return "";
  if (phone.startsWith("+98")) return "0" + phone.slice(3);
  return phone;
}

export default function CustomerPanelPage() {
  const router = useRouter();
  const provinces = useMemo(() => getProvinces(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  const [shipmentType, setShipmentType] = useState<ShipmentType>("full");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("door_to_door");
  const [origin, setOrigin] = useState<Place>(emptyPlace);
  const [destination, setDestination] = useState<Place>(emptyPlace);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // خرده‌بار باربری‌به‌باربری آدرس ندارد؛ بقیه حالت‌ها از درِ محل جابه‌جا می‌شوند
  const showAddresses = shipmentType === "full" || deliveryMode === "door_to_door";

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    setError("");
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/customer/login");
      return;
    }

    setUserId(user.id);

    const [{ data: customer }, { data: rows, error: requestsError }] =
      await Promise.all([
        supabase
          .from("customers")
          .select("full_name, phone, company_name")
          .eq("auth_user_id", user.id)
          .maybeSingle(),
        supabase
          .from("requests")
          .select("*")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    if (customer) setProfile(customer as CustomerProfile);

    if (requestsError) {
      console.error("Customer requests error:", requestsError);
      setError("دریافت بارهای شما انجام نشد. دوباره تلاش کنید.");
    } else {
      setRequests((rows ?? []) as ShipmentRequest[]);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/customer/login");
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = (name: string) => String(formData.get(name) ?? "").trim();

    const fullName = value("full_name");
    const phone = value("phone");
    const cargoType = value("cargo_type");

    if (!origin.city || !destination.city) {
      setFormError("شهر مبدا و مقصد را انتخاب کنید.");
      return;
    }

    if (origin.province === destination.province && origin.city === destination.city) {
      setFormError("مبدا و مقصد نمی‌توانند یک شهر باشند.");
      return;
    }

    const routing = detectDirection(origin, destination);

    if (!fullName || !phone || !cargoType) {
      setFormError("نام، شماره تماس و نوع بار الزامی هستند.");
      return;
    }

    const isPartial = shipmentType === "partial";

    if (isPartial && (!value("quantity") || !value("weight"))) {
      setFormError("برای خرده‌بار، تعداد و وزن بار را بنویسید.");
      return;
    }

    if (showAddresses && (!value("pickup_address") || !value("delivery_address"))) {
      setFormError("آدرس بارگیری و آدرس تخلیه را بنویسید.");
      return;
    }

    setSubmitting(true);


    const { data: created, error: insertError } = await supabase.from("requests").insert({
      customer_id: userId,
      full_name: fullName,
      phone,
      shipment_type: shipmentType,
      direction: routing.direction,
      city_province: routing.province,
      city: routing.city,
      origin: placeLabel(origin.province, origin.city),
      destination: placeLabel(destination.province, destination.city),
      pickup_address: showAddresses ? value("pickup_address") : null,
      delivery_address: showAddresses ? value("delivery_address") : null,
      delivery_mode: isPartial ? deliveryMode : "door_to_door",
      cargo_type: cargoType,
      weight: value("weight") || null,
      quantity: isPartial ? value("quantity") : null,
      dimensions: isPartial ? formatDimensions(value) : null,
      vehicle_type: shipmentType === "full" ? value("vehicle_type") : "",
      description: value("description") || null,
      status: "جدید",
    })
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError) {
      console.error("Create request error:", insertError);
      setFormError(`ثبت بار انجام نشد: ${insertError.message}`);
      return;
    }

    // پیامک به متصدی شهر یا مدیر؛ خطای پیامک نباید ثبت بار را خراب کند
    supabase.functions
      .invoke("notify-new-request", { body: { requestId: created.id } })
      .catch((notifyError) => console.error("Notify error:", notifyError));

    form.reset();
    setOrigin(emptyPlace);
    setDestination(emptyPlace);
    setFormSuccess("بار شما ثبت شد و پس از بررسی با شما تماس می‌گیریم.");
    setActiveTab("list");
    await refresh();
  }

  async function cancelRequest(id: number) {
    if (!confirm("این درخواست لغو شود؟")) return;

    setCancellingId(id);

    const { error: updateError } = await supabase
      .from("requests")
      .update({ status: "لغو شد" })
      .eq("id", id);

    setCancellingId(null);

    if (updateError) {
      alert(`لغو درخواست انجام نشد: ${updateError.message}`);
      return;
    }

    await refresh();
  }

  const activeCount = requests.filter(
    (item) => !["انجام شد", "لغو شد"].includes(item.status || "جدید")
  ).length;

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-ink text-white"
      >
        <p className="font-bold">در حال بارگذاری پنل...</p>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-ink pb-24 text-white sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:min-h-20 sm:px-5">
          <Brand subtitle="پنل صاحبان بار" />

          <div className="flex items-center gap-3">
            {profile?.full_name && (
              <span className="hidden text-sm text-white/70 sm:block">
                {profile.full_name}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-5 sm:py-8">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl sm:p-5">
            <p className="text-sm text-white/50">همه بارها</p>
            <p className="mt-1 text-2xl font-black text-orange-400 sm:mt-2 sm:text-3xl">
              {requests.length.toLocaleString("fa-IR")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl sm:p-5">
            <p className="text-sm text-white/50">بارهای جاری</p>
            <p className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">
              {activeCount.toLocaleString("fa-IR")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormSuccess("");
              setActiveTab("create");
            }}
            className="hidden rounded-3xl bg-orange-500 p-5 text-right font-black transition hover:bg-orange-400 sm:block"
          >
            <span className="text-3xl">＋</span>
            <span className="mt-2 block">ثبت بار جدید</span>
          </button>
        </section>

        <div className="mt-8 hidden gap-2 sm:flex">
          {(
            [
              ["list", "بارهای من"],
              ["create", "ثبت بار جدید"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                activeTab === id
                  ? "bg-white text-[#07111f]"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {formSuccess && activeTab === "list" && (
          <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {formSuccess}
          </div>
        )}

        {activeTab === "list" && (
          <section className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
            {requests.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
                <p className="font-bold">هنوز باری ثبت نکرده‌اید.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="mt-4 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold"
                >
                  ثبت اولین بار
                </button>
              </div>
            )}

            {requests.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.shipment_type && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                          {SHIPMENT_TYPE_LABELS[item.shipment_type]}
                        </span>
                      )}
                      <span className="text-xs text-white/40">
                        کد {item.id.toLocaleString("fa-IR", { useGrouping: false })}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-black leading-7 sm:mt-3 sm:text-lg">
                      {item.origin} ← {item.destination}
                    </h3>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusTone(item.status)}`}
                  >
                    {item.status || "جدید"}
                  </span>
                </div>

                <div
                  className={`mt-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:mt-4 ${
                    item.price != null
                      ? "border border-emerald-400/25 bg-emerald-500/10"
                      : "border border-white/10 bg-black/10"
                  }`}
                >
                  <span className="text-sm text-white/60">کرایه</span>
                  {item.price != null ? (
                    <span className="text-lg font-black text-emerald-300">
                      {formatPrice(item.price)}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-white/50">
                      در حال بررسی…
                    </span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl bg-black/10 p-3">
                    <p className="text-xs text-white/40">نوع بار</p>
                    <p className="mt-1 font-bold">{item.cargo_type}</p>
                  </div>
                  <div className="rounded-2xl bg-black/10 p-3">
                    <p className="text-xs text-white/40">
                      {item.quantity ? "تعداد / وزن" : "وزن"}
                    </p>
                    <p className="mt-1 font-bold">
                      {[item.quantity, item.weight].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/10 p-3">
                    <p className="text-xs text-white/40">روش تحویل</p>
                    <p className="mt-1 font-bold">
                      {item.delivery_mode ? DELIVERY_MODE_LABELS[item.delivery_mode] : "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/10 p-3">
                    <p className="text-xs text-white/40">تاریخ ثبت</p>
                    <p className="mt-1 font-bold">{formatDate(item.created_at)}</p>
                  </div>
                </div>

                {item.dimensions && (
                  <p className="mt-2 text-xs text-white/50">ابعاد: {item.dimensions}</p>
                )}

                {(item.status || "جدید") === "جدید" && (
                  <button
                    type="button"
                    disabled={cancellingId === item.id}
                    onClick={() => void cancelRequest(item.id)}
                    className="mt-3 w-full rounded-xl border border-red-400/20 px-4 py-3 text-sm font-bold text-red-300 sm:mt-4 sm:w-auto sm:py-2 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {cancellingId === item.id ? "در حال لغو..." : "لغو درخواست"}
                  </button>
                )}
              </article>
            ))}
          </section>
        )}

        {activeTab === "create" && (
          <form
            onSubmit={handleSubmit}
            className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:mt-6 sm:rounded-3xl sm:p-6 md:p-8"
          >
            <h2 className="text-lg font-black sm:text-xl">نوع حمل</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(SHIPMENT_TYPE_LABELS) as ShipmentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setShipmentType(type)}
                  className={`rounded-2xl border p-4 text-right transition ${
                    shipmentType === type
                      ? "border-orange-400 bg-orange-500/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                  }`}
                >
                  <span className="font-black">{SHIPMENT_TYPE_LABELS[type]}</span>
                  <span className="mt-2 block text-xs leading-6 text-white/60">
                    {TYPE_HINTS[type]}
                  </span>
                </button>
              ))}
            </div>

            <h2 className="mt-6 text-lg font-black sm:mt-8 sm:text-xl">مسیر</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(
                [
                  ["مبدا", origin, setOrigin, "pickup_address", "آدرس بارگیری"],
                  ["مقصد", destination, setDestination, "delivery_address", "آدرس تخلیه"],
                ] as const
              ).map(([title, place, setPlace, addressName, addressLabel]) => (
                <fieldset
                  key={title}
                  className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <legend className="px-1 text-sm font-black text-orange-300">
                    {title} *
                  </legend>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      aria-label={`استان ${title}`}
                      value={place.province}
                      onChange={(event) =>
                        setPlace({ province: event.target.value, city: "" })
                      }
                      className={selectClass}
                    >
                      <option value="">استان</option>
                      {provinces.map((item) => (
                        <option key={item.en} value={item.en}>
                          {item.fa}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label={`شهر ${title}`}
                      value={place.city}
                      disabled={!place.province}
                      onChange={(event) =>
                        setPlace({ ...place, city: event.target.value })
                      }
                      className={selectClass}
                    >
                      <option value="">شهر</option>
                      {getProvinceCities(place.province).map((item) => (
                        <option key={item.en} value={item.en}>
                          {item.fa}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showAddresses && (
                    <input
                      name={addressName}
                      maxLength={300}
                      aria-label={addressLabel}
                      placeholder={`${addressLabel} *`}
                      className={inputClass}
                    />
                  )}
                </fieldset>
              ))}
            </div>

            {shipmentType === "partial" && (
              <>
                <h2 className="mt-6 text-lg font-black sm:mt-8 sm:text-xl">روش تحویل</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(Object.keys(DELIVERY_MODE_LABELS) as DeliveryMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDeliveryMode(mode)}
                      aria-pressed={deliveryMode === mode}
                      className={`rounded-2xl border p-4 text-right transition ${
                        deliveryMode === mode
                          ? "border-orange-400 bg-orange-500/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                      }`}
                    >
                      <span className="font-black">
                        {mode === "terminal" ? "🏢 " : "🚪 "}
                        {DELIVERY_MODE_LABELS[mode]}
                      </span>
                      <span className="mt-2 block text-xs leading-6 text-white/60">
                        {DELIVERY_MODE_HINTS[mode]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <h2 className="mt-6 text-lg font-black sm:mt-8 sm:text-xl">مشخصات بار</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-white/70 md:col-span-2">
                نوع بار *
                <input
                  name="cargo_type"
                  required
                  maxLength={120}
                  placeholder="مثلاً لوازم خانگی، قطعات یدکی، پارچه"
                  className={`${inputClass} mt-2`}
                />
              </label>

              {shipmentType === "partial" && (
                <label className="block text-sm text-white/70">
                  تعداد *
                  <input
                    name="quantity"
                    required
                    maxLength={80}
                    placeholder="مثلاً ۵ کارتن یا ۲ گونی"
                    className={`${inputClass} mt-2`}
                  />
                </label>
              )}

              <label className="block text-sm text-white/70">
                وزن {shipmentType === "partial" ? "*" : ""}
                <input
                  name="weight"
                  required={shipmentType === "partial"}
                  maxLength={80}
                  placeholder={shipmentType === "full" ? "مثلاً ۱۰ تن" : "مثلاً ۸۰ کیلو"}
                  className={`${inputClass} mt-2`}
                />
              </label>

              {shipmentType === "partial" && (
                <fieldset className="md:col-span-2">
                  <legend className="text-sm text-white/70">
                    ابعاد هر بسته (سانتی‌متر، اختیاری)
                  </legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {DIMENSION_FIELDS.map(([name, label]) => (
                      <label key={name} className="block">
                        <span className="mb-1 block text-xs text-white/50">{label}</span>
                        <input
                          name={name}
                          inputMode="decimal"
                          maxLength={6}
                          placeholder="۰"
                          className={`${inputClass} text-center`}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {shipmentType === "full" && (
                <label className="block text-sm text-white/70">
                  نوع خودرو
                  <select name="vehicle_type" defaultValue="" className={`${selectClass} mt-2`}>
                    <option value="">فرقی نمی‌کند</option>
                    {VEHICLE_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-sm text-white/70 md:col-span-2">
                توضیحات
                <textarea
                  name="description"
                  rows={3}
                  maxLength={1000}
                  placeholder="بسته‌بندی، زمان بارگیری یا نکات دیگر..."
                  className={`${inputClass} mt-2 resize-none`}
                />
              </label>
            </div>

            <h2 className="mt-6 text-lg font-black sm:mt-8 sm:text-xl">اطلاعات تماس</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-white/70">
                نام و نام خانوادگی *
                <input
                  name="full_name"
                  required
                  defaultValue={profile?.full_name ?? ""}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label className="block text-sm text-white/70">
                شماره تماس *
                <input
                  name="phone"
                  type="tel"
                  dir="ltr"
                  required
                  defaultValue={displayPhone(profile?.phone)}
                  placeholder="09121234567"
                  className={`${inputClass} mt-2 text-right`}
                />
              </label>
            </div>

            {formError && (
              <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-2xl bg-orange-500 px-4 py-4 text-base font-black sm:mt-8 sm:text-lg transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "در حال ثبت..."
                : `ثبت بار ${SHIPMENT_TYPE_LABELS[shipmentType]}`}
            </button>
          </form>
        )}
      </div>

      {/* منوی پایین موبایل */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/10 bg-ink/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`rounded-2xl py-3 text-sm font-bold transition ${
            activeTab === "list" ? "bg-white text-[#07111f]" : "bg-white/5 text-white/70"
          }`}
        >
          📦 بارهای من
        </button>
        <button
          type="button"
          onClick={() => {
            setFormSuccess("");
            setActiveTab("create");
          }}
          className={`rounded-2xl py-3 text-sm font-bold transition ${
            activeTab === "create" ? "bg-orange-400 text-white" : "bg-orange-500 text-white"
          }`}
        >
          ＋ ثبت بار جدید
        </button>
      </nav>
    </main>
  );
}
