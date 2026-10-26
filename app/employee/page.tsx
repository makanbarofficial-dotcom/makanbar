"use client";

import { PanelLoading } from "@/components/panel-loading";
import { notifyCustomer, notifyDrivers } from "@/lib/notify";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/ui";
import { VehicleRequests } from "./vehicle-requests";
import { PhoneOrderForm } from "../admin/dashboard/phone-order";
import { AdminSessionNotice } from "@/components/admin-session-notice";
import {
  DELIVERY_MODE_LABELS,
  STAFF_STATUSES,
  type StaffKind,
  vehicleFits,
  formatPrice,
  matchesSearch,
  normalizeDigits,
  type ShipmentRequest,
  formatDate,
  regionLabel,
  statusTone,
} from "@/lib/shipments";

const supabase = createSupabase();

type StaffProfile = {
  id: number;
  name: string;
  phone: string;
  panel_enabled: boolean | null;
  kind: StaffKind | null;
};

type StaffLocation = {
  id: number;
  province: string;
  city: string | null;
};

type Filter = "active" | "done" | "all";

// راننده‌ای که متصدی درون‌شهری می‌تواند بار را مستقیم به او بدهد
type DriverOption = {
  id: string;
  full_name: string | null;
  phone: string | null;
  vehicle_type: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
};

const FINISHED = ["انجام شد", "لغو شد"];

export default function EmployeePanelPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [locations, setLocations] = useState<StaffLocation[]>([]);
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [view, setView] = useState<"loads" | "phone" | "vehicles">("loads");
  // بارهای درون‌شهری که این متصدی برای رانندگان فرستاده است
  const [publishedIds, setPublishedIds] = useState<Set<number>>(new Set());
  const [publishingId, setPublishingId] = useState<number | null>(null);
  // با حساب مدیر وارد شده؛ صفحه‌ی انتخاب «پنل مدیریت / خروج» نشان داده می‌شود
  const [adminSession, setAdminSession] = useState(false);
  // انتخاب راننده/پیک برای بار درون‌شهری
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [assignedDrivers, setAssignedDrivers] = useState<Record<number, string>>({});
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [driverSearch, setDriverSearch] = useState("");
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [prices, setPrices] = useState<Record<number, string>>({});

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    setError("");
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/employee/login");
      return;
    }

    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, name, phone, panel_enabled, kind")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (staffError) {
      console.error("Staff profile error:", staffError);
      setError("دریافت اطلاعات متصدی انجام نشد.");
      setLoading(false);
      return;
    }

    if (!staff) {
      const { data: isAdmin } = await supabase.rpc("is_admin");
      setAdminSession(!!isAdmin);
    }

    setProfile(staff as StaffProfile | null);

    if (!staff || !staff.panel_enabled) {
      setLoading(false);
      return;
    }

    // دیتابیس فقط بارهای شهرهای این متصدی را برمی‌گرداند:
    // متصدی بین‌شهری خرده‌بار «تهران ← شهر او»، متصدی درون‌شهری بار درون‌شهری شهر او
    // نماینده: خرده‌بارهایی که مبدا آن‌ها شهر خودش است (دیتابیس فقط همان‌ها را برمی‌گرداند)
    const intracity = staff.kind === "intracity";
    let requestsQuery = supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
    requestsQuery = intracity
      ? requestsQuery.eq("shipment_type", "intracity")
      : staff.kind === "origin"
        ? requestsQuery.eq("shipment_type", "partial").neq("direction", "from_tehran")
        : requestsQuery.eq("shipment_type", "partial").eq("direction", "from_tehran");

    const [{ data: locationRows }, { data: rows, error: requestsError }, { data: published }] =
      await Promise.all([
        supabase
          .from("staff_locations")
          .select("id, province, city")
          .eq("staff_id", staff.id),
        requestsQuery,
        intracity
          ? supabase
              .from("loads")
              .select("request_id, driver_id")
              .eq("handled_by_staff_id", staff.id)
              .not("request_id", "is", null)
          : Promise.resolve({ data: [] as { request_id: number | null; driver_id: string | null }[] }),
      ]);

    if (intracity) {
      const { data: driverRows } = await supabase.rpc("list_drivers_for_intracity_staff");
      const driverList = (driverRows ?? []) as DriverOption[];
      setDrivers(driverList);

      const names = Object.fromEntries(driverList.map((driver) => [driver.id, driver.full_name ?? ""]));
      setAssignedDrivers(
        Object.fromEntries(
          (published ?? [])
            .filter((row) => row.request_id != null && row.driver_id)
            .map((row) => [row.request_id as number, names[row.driver_id as string] || "راننده"])
        )
      );
    }

    setLocations((locationRows ?? []) as StaffLocation[]);
    setPublishedIds(
      new Set(
        (published ?? [])
          .map((row) => row.request_id)
          .filter((id): id is number => id != null)
      )
    );

    if (requestsError) {
      console.error("Staff requests error:", requestsError);
      setError("دریافت بارها انجام نشد. دوباره تلاش کنید.");
    } else {
      const list = (rows ?? []) as ShipmentRequest[];
      setRequests(list);
      setNotes(
        Object.fromEntries(list.map((item) => [item.id, item.staff_note ?? ""]))
      );
      setPrices(
        Object.fromEntries(
          list.map((item) => [item.id, item.price != null ? String(item.price) : ""])
        )
      );
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const query = search.trim();

    return requests.filter((item) => {
      const finished = FINISHED.includes(item.status || "جدید");

      if (filter === "active" && finished) return false;
      if (filter === "done" && !finished) return false;
      return matchesSearch(query, [
        item.full_name,
        item.phone,
        item.destination,
        item.cargo_type,
      ]);
    });
  }, [requests, filter, search]);

  // متن کادر کرایه را به عدد تبدیل می‌کند؛ هم برای ذخیره و هم برای پیش‌نمایش
  function draftPrice(id: number) {
    const digits = normalizeDigits(prices[id] ?? "").replace(/\D/g, "");
    return digits ? Number(digits) : null;
  }

  async function saveRequest(item: ShipmentRequest, status: string) {
    // کرایه‌ی ثبت‌شده‌ی بار درون‌شهری عوض نمی‌شود
    const price = isLockedPrice(item) ? item.price : draftPrice(item.id);
    const staff_note = notes[item.id]?.trim() || null;

    if (
      profile?.kind === "intracity" &&
      item.price == null &&
      price != null &&
      !confirm(`کرایه ${formatPrice(price)} ثبت شود؟\nبعد از ثبت، کرایه دیگر قابل تغییر نیست.`)
    ) {
      return;
    }

    setSavingId(item.id);

    const { data: saved, error: updateError } = await supabase
      .from("requests")
      .update({ status, staff_note, price })
      .eq("id", item.id)
      .select("id")
      .maybeSingle();

    setSavingId(null);

    if (updateError) {
      alert(`ذخیره انجام نشد: ${updateError.message}`);
      return;
    }

    // اگر دیتابیس به این متصدی اجازه‌ی ویرایش ندهد، خطا نمی‌دهد و فقط چیزی ذخیره نمی‌شود
    if (!saved) {
      alert("ذخیره انجام نشد؛ این بار در محدوده‌ی شما نیست. صفحه را دوباره بارگذاری کنید.");
      return;
    }

    // پیامک کرایه یا تحویل به صاحب بار
    notifyCustomer(supabase, item.id);

    setRequests((current) =>
      current.map((row) =>
        row.id === item.id
          ? { ...row, status, staff_note, price }
          : row
      )
    );
  }

  // متصدی درون‌شهری: بار پایان‌یافته قفل است و کرایه‌ی ثبت‌شده عوض نمی‌شود (دیتابیس هم همین را کنترل می‌کند)
  function isFinishedLocked(item: ShipmentRequest) {
    return profile?.kind === "intracity" && FINISHED.includes(item.status || "جدید");
  }

  function isLockedPrice(item: ShipmentRequest) {
    return profile?.kind === "intracity" && item.price != null;
  }

  // متصدی درون‌شهری بار را با کرایه‌ی فعلی برای رانندگان می‌فرستد
  async function publishToDrivers(item: ShipmentRequest) {
    if (!profile) return;
    const price = draftPrice(item.id);

    if (price == null) {
      alert("اول کرایه را بنویسید.");
      return;
    }

    if (
      !confirm(
        `این بار برای رانندگان ارسال شود؟\nکرایه: ${formatPrice(price)}${
          item.price == null ? "\nبعد از ارسال، کرایه دیگر قابل تغییر نیست." : ""
        }`
      )
    ) {
      return;
    }

    setPublishingId(item.id);

    const { error: loadError } = await supabase.from("loads").insert({
      request_id: item.id,
      origin: item.origin,
      destination: item.destination,
      cargo_type: item.cargo_type,
      weight: item.weight || null,
      vehicle_type: item.vehicle_type || null,
      price,
      status: "available",
      driver_id: null,
      description: item.description || null,
      handled_by_staff_id: profile.id,
      load_type: "intracity",
    });

    // 23505 یعنی قبلاً برای رانندگان ارسال شده؛ فقط وضعیت هماهنگ می‌شود
    if (loadError && loadError.code !== "23505") {
      setPublishingId(null);
      alert(`ارسال برای رانندگان انجام نشد: ${loadError.message}`);
      return;
    }

    setPublishedIds((current) => new Set(current).add(item.id));
    setPublishingId(null);
    // پیامک بار جدید به رانندگانِ با ماشین مناسب
    if (!loadError) notifyDrivers(supabase);
    // کرایه همین الان تأیید شد؛ saveRequest دوباره نپرسد
    await saveRequest({ ...item, price }, "ارسال به رانندگان");
  }

  // بار درون‌شهری مستقیم به یک راننده/پیک داده می‌شود و به پنل همان راننده می‌رود
  async function assignDriver(item: ShipmentRequest, driver: DriverOption) {
    if (
      !confirm(
        `بار به «${driver.full_name ?? "راننده"}» (${driver.vehicle_type ?? ""}) داده شود؟\nبرای راننده و صاحب بار پیامک می‌رود.`
      )
    ) {
      return;
    }

    setAssigningId(item.id);
    const { error: assignError } = await supabase.rpc("assign_intracity_driver", {
      p_request_id: item.id,
      p_driver_id: driver.id,
    });
    setAssigningId(null);

    if (assignError) {
      alert(`تعیین راننده انجام نشد: ${assignError.message}`);
      return;
    }

    // پیامک «بار به شما واگذار شد» به راننده و مشخصات راننده به صاحب بار
    notifyDrivers(supabase);
    notifyCustomer(supabase, item.id);

    setPickerFor(null);
    setPublishedIds((current) => new Set(current).add(item.id));
    setAssignedDrivers((current) => ({ ...current, [item.id]: driver.full_name ?? "راننده" }));
    setRequests((current) =>
      current.map((row) => (row.id === item.id ? { ...row, status: "راننده تعیین شد" } : row))
    );
  }

  function driverPicker(item: ShipmentRequest) {
    const query = driverSearch.trim();
    const list = drivers
      .filter((driver) => showAllDrivers || vehicleFits(item.vehicle_type, driver.vehicle_type))
      .filter((driver) =>
        matchesSearch(query, [driver.full_name, driver.phone, driver.vehicle_type, driver.vehicle_plate])
      );

    return (
      <div className="mt-3 space-y-3 rounded-2xl border border-sky-400/25 bg-sky-500/[0.06] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-sky-700">👤 انتخاب راننده / پیک</p>
          <button
            type="button"
            onClick={() => setPickerFor(null)}
            className="rounded-lg px-2 py-1 text-fg/60 hover:bg-fg/10"
            aria-label="بستن"
          >
            ✕
          </button>
        </div>

        <input
          value={driverSearch}
          onChange={(event) => setDriverSearch(event.target.value)}
          placeholder="جستجو: نام، موبایل، نوع ماشین یا پلاک"
          className="w-full rounded-xl border border-fg/10 bg-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-fg/45 focus:border-sky-400"
        />

        {item.vehicle_type && (
          <label className="flex items-center gap-2 text-xs text-fg/60">
            <input
              type="checkbox"
              checked={showAllDrivers}
              onChange={(event) => setShowAllDrivers(event.target.checked)}
              className="h-4 w-4 accent-sky-500"
            />
            نمایش همه‌ی رانندگان (نه فقط «{item.vehicle_type}»)
          </label>
        )}

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {list.length === 0 && (
            <p className="py-4 text-center text-sm text-fg/45">
              {drivers.length === 0
                ? "هنوز راننده‌ی تأییدشده‌ای در سایت ثبت‌نام نکرده است."
                : "راننده‌ای با این مشخصات پیدا نشد."}
            </p>
          )}
          {list.map((driver) => (
            <button
              key={driver.id}
              type="button"
              disabled={assigningId === item.id}
              onClick={() => void assignDriver(item, driver)}
              className="flex w-full items-center gap-3 rounded-xl border border-fg/10 bg-surface-2 p-3 text-right transition hover:border-sky-400/50 disabled:opacity-50"
            >
              <span className="text-2xl">{driver.vehicle_type === "پیک موتوری" ? "🛵" : "🚚"}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{driver.full_name || "بدون نام"}</span>
                <span className="mt-0.5 block text-xs text-fg/55">
                  {[driver.vehicle_type, driver.vehicle_model].filter(Boolean).join(" · ")}
                  {driver.vehicle_plate ? ` · پلاک ${driver.vehicle_plate}` : ""}
                </span>
              </span>
              <span dir="ltr" className="shrink-0 text-xs text-fg/45">
                {driver.phone}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/employee/login");
  }

  if (loading) {
    return <PanelLoading />;
  }

  if (adminSession) {
    return <AdminSessionNotice panel="پنل متصدیان" onLogout={logout} />;
  }

  const isIntracity = profile?.kind === "intracity";
  const isOriginRep = profile?.kind === "origin";
  // همه‌ی متصدی‌ها و نماینده‌ها بار تلفنی ثبت می‌کنند (هر کدام فقط در محدوده‌ی خودشان)
  const canPhoneOrder = !!profile;
  const TEHRAN = { province: "tehran", city: "tehran" };
  const myAreas = locations.map((location) => ({
    province: location.province,
    city: location.city && location.city !== "*" ? location.city : "",
  }));
  const newCount = requests.filter((item) => (item.status || "جدید") === "جدید").length;
  const activeCount = requests.filter(
    (item) => !FINISHED.includes(item.status || "جدید")
  ).length;

  return (
    <main dir="rtl" className="min-h-screen bg-surface text-fg">
      <header className="sticky top-0 z-40 border-b border-fg/10 bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5">
          <Brand
            subtitle={isIntracity ? "پنل متصدی درون‌شهری" : isOriginRep ? "پنل نمایندگان" : "پنل متصدیان"}
          />

          <div className="flex items-center gap-3">
            {profile?.name && (
              <span className="hidden text-sm text-fg/70 sm:block">{profile.name}</span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-fg/10 bg-surface-2 px-4 py-2 text-sm font-bold transition hover:bg-fg/10"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!profile || !profile.panel_enabled ? (
          <section className="rounded-3xl border border-fg/10 bg-surface-2 p-8">
            <h2 className="text-xl font-black">دسترسی پنل فعال نیست</h2>
            <p className="mt-3 leading-7 text-fg/60">
              این حساب به‌عنوان متصدی فعال نشده است. لطفاً با مدیریت ماکان بار تماس بگیرید.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-fg/10 bg-surface-2 p-6">
              <p className="text-sm text-fg/60">شهرهای تحت پوشش شما</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {locations.length === 0 && (
                  <span className="text-sm text-fg/55">
                    هنوز شهری برای شما تعیین نشده است.
                  </span>
                )}
                {locations.map((location) => (
                  <span
                    key={location.id}
                    className="rounded-full bg-orange-500/15 px-4 py-2 text-sm font-bold text-orange-700"
                  >
                    {regionLabel(location.province, location.city)}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-6 text-fg/55">
                {isIntracity
                  ? "بارهای درون‌شهری شهرهای شما در این پنل نمایش داده می‌شوند. کرایه را تعیین کنید و بار را برای رانندگان بفرستید."
                  : isOriginRep
                    ? "خرده‌بارهایی که از شهر شما به تهران یا شهرهای دیگر ارسال می‌شوند در این پنل نمایش داده می‌شوند."
                    : "خرده‌بارهایی که از تهران به شهرهای شما ارسال می‌شوند در این پنل نمایش داده می‌شوند."}
              </p>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                ["بارهای جدید", newCount],
                ["بارهای جاری", activeCount],
                ["همه بارها", requests.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-fg/10 bg-surface-2 p-5">
                  <p className="text-sm text-fg/60">{label}</p>
                  <p className="mt-2 text-3xl font-black text-orange-700">
                    {Number(value).toLocaleString("fa-IR")}
                  </p>
                </div>
              ))}
            </section>

            {/* متصدی درون‌شهری درخواست ماشین ندارد؛ بارها را مستقیم برای رانندگان می‌فرستد */}
            <div
              className={`mt-8 grid gap-2 rounded-2xl bg-surface-2 p-1 ${isIntracity ? "grid-cols-2" : "grid-cols-3"}`}
            >
              {(isIntracity
                ? ([
                    ["loads", "🏙 بارهای شهر"],
                    ["phone", "📞 بار تلفنی"],
                  ] as const)
                : isOriginRep
                  ? ([
                      ["loads", "📦 خرده‌بارها"],
                      ["phone", "📞 بار تلفنی"],
                      ["vehicles", "🚚 درخواست ماشین"],
                    ] as const)
                  : ([
                      ["loads", "📦 خرده‌بارها"],
                      ["phone", "📞 بار تلفنی"],
                      ["vehicles", "🚚 درخواست ماشین"],
                    ] as const)
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`rounded-xl py-3 text-sm font-bold transition ${
                    view === id ? "bg-orange-500 text-white" : "text-fg/60 hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {view === "phone" && canPhoneOrder ? (
              <div className="mt-5">
                <PhoneOrderForm
                  supabase={supabase}
                  types={isIntracity ? ["intracity"] : ["partial"]}
                  areas={isIntracity || isOriginRep ? myAreas : [TEHRAN]}
                  defaultCity={isIntracity || isOriginRep ? (myAreas[0] ?? { province: "", city: "" }) : TEHRAN}
                  destinationAreas={isIntracity || isOriginRep ? undefined : myAreas}
                  defaultDestination={
                    isIntracity || isOriginRep ? { province: "", city: "" } : (myAreas[0] ?? { province: "", city: "" })
                  }
                  onCreated={(row) => {
                    setRequests((current) => [row, ...current]);
                    setPrices((current) => ({
                      ...current,
                      [row.id]: row.price != null ? String(row.price) : "",
                    }));
                    setView("loads");
                    alert(
                      isIntracity
                        ? "بار تلفنی ثبت شد. حالا می‌توانید آن را برای رانندگان بفرستید."
                        : "بار تلفنی ثبت شد."
                    );
                  }}
                  onClose={() => setView("loads")}
                />
              </div>
            ) : view === "vehicles" && !isIntracity ? (
              <VehicleRequests
                supabase={supabase}
                staff={{ id: profile.id, name: profile.name, phone: profile.phone }}
                // نماینده از شهر خودش ماشین می‌خواهد؛ متصدی تهران از تهران به شهر خودش
                defaultOrigin={isOriginRep ? (myAreas[0] ?? TEHRAN) : TEHRAN}
                defaultDestination={isOriginRep ? { province: "", city: "" } : (myAreas[0] ?? { province: "", city: "" })}
              />
            ) : (
            <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {(
                [
                  ["active", "جاری"],
                  ["done", "پایان‌یافته"],
                  ["all", "همه"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                    filter === id
                      ? "bg-fg text-white"
                      : "bg-surface-2 text-fg/70 hover:bg-fg/10"
                  }`}
                >
                  {label}
                </button>
              ))}

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجو: نام، تلفن، شهر..."
                className="min-w-0 flex-1 rounded-2xl border border-fg/10 bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-fg/45 focus:border-orange-500"
              />

              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-2xl border border-fg/10 px-4 py-3 text-sm font-bold text-fg/70 hover:bg-fg/5"
              >
                بروزرسانی
              </button>
            </div>

            <section className="mt-6 space-y-4">
              {filtered.length === 0 && (
                <div className="rounded-3xl border border-fg/10 bg-surface-2 p-10 text-center text-fg/55">
                  باری برای نمایش وجود ندارد.
                </div>
              )}

              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-fg/10 bg-surface-2 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-fg/55">
                        کد {item.id.toLocaleString("fa-IR", { useGrouping: false })} ·{" "}
                        {formatDate(item.created_at)}
                      </p>
                      <h3 className="mt-2 text-lg font-black">
                        {item.origin} ← {item.destination}
                      </h3>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          item.price != null ? "text-emerald-700" : "text-orange-700"
                        }`}
                      >
                        {item.price != null
                          ? `کرایه: ${formatPrice(item.price)}`
                          : "کرایه هنوز تعیین نشده"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(item.status)}`}
                    >
                      {item.status || "جدید"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-surface-3 p-3">
                      <p className="text-xs text-fg/55">صاحب بار</p>
                      <p className="mt-1 font-bold">{item.full_name}</p>
                      <a
                        href={`tel:${item.phone}`}
                        dir="ltr"
                        className="mt-1 block text-right text-orange-700"
                      >
                        {item.phone}
                      </a>
                    </div>
                    <div className="rounded-2xl bg-surface-3 p-3">
                      <p className="text-xs text-fg/55">نوع بار</p>
                      <p className="mt-1 font-bold">{item.cargo_type}</p>
                    </div>
                    <div className="rounded-2xl bg-surface-3 p-3">
                      <p className="text-xs text-fg/55">تعداد / وزن</p>
                      <p className="mt-1 font-bold">
                        {[item.quantity, item.weight].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {item.dimensions && (
                        <p className="mt-1 text-xs text-fg/55">ابعاد: {item.dimensions}</p>
                      )}
                    </div>
                    <div className="rounded-2xl bg-surface-3 p-3">
                      <p className="text-xs text-fg/55">{isIntracity ? "خودرو" : "روش تحویل"}</p>
                      <p className="mt-1 font-bold">
                        {isIntracity
                          ? item.vehicle_type || "فرقی نمی‌کند"
                          : item.delivery_mode
                            ? DELIVERY_MODE_LABELS[item.delivery_mode]
                            : "—"}
                      </p>
                    </div>
                  </div>

                  {(item.pickup_address || item.delivery_address || item.description) && (
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                      {item.pickup_address && (
                        <div className="rounded-2xl bg-surface-3 p-3">
                          <p className="text-xs text-fg/55">
                            {isIntracity ? "آدرس بارگیری" : "آدرس بارگیری (تهران)"}
                          </p>
                          <p className="mt-1">{item.pickup_address}</p>
                        </div>
                      )}
                      {item.delivery_address && (
                        <div className="rounded-2xl bg-surface-3 p-3">
                          <p className="text-xs text-fg/55">آدرس تخلیه</p>
                          <p className="mt-1">{item.delivery_address}</p>
                        </div>
                      )}
                      {item.description && (
                        <div className="rounded-2xl bg-surface-3 p-3">
                          <p className="text-xs text-fg/55">توضیحات صاحب بار</p>
                          <p className="mt-1 leading-7">{item.description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 md:grid-cols-[12rem_1fr_auto]">
                    <label className="relative">
                      <span className="sr-only">کرایه به تومان</span>
                      <input
                        value={prices[item.id] ?? ""}
                        onChange={(event) =>
                          setPrices((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        inputMode="numeric"
                        placeholder="کرایه"
                        disabled={isLockedPrice(item) || isFinishedLocked(item)}
                        title={isLockedPrice(item) ? "کرایه ثبت شده و قابل تغییر نیست" : undefined}
                        className={`w-full rounded-2xl border bg-surface-2 py-3 pl-14 pr-4 text-sm outline-none placeholder:text-fg/45 focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                          item.price == null ? "border-orange-400/40" : "border-fg/10"
                        }`}
                      />
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-fg/55">
                        تومان
                      </span>
                    </label>
                    <input
                      value={notes[item.id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      maxLength={500}
                      placeholder="یادداشت متصدی (اختیاری)"
                      disabled={isFinishedLocked(item)}
                      className="disabled:opacity-60 rounded-2xl border border-fg/10 bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-fg/45 focus:border-orange-500"
                    />
                    <div className="flex gap-2">
                      <select
                        value={item.status || "جدید"}
                        disabled={savingId === item.id || isFinishedLocked(item)}
                        onChange={(event) => void saveRequest(item, event.target.value)}
                        className="rounded-2xl border border-fg/10 bg-surface-2 px-4 py-3 text-sm outline-none"
                      >
                        {[
                          ...STAFF_STATUSES,
                          ...((STAFF_STATUSES as readonly string[]).includes(item.status || "جدید")
                            ? []
                            : [item.status as string]),
                        ].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={savingId === item.id || isFinishedLocked(item)}
                        onClick={() => void saveRequest(item, item.status || "جدید")}
                        className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold transition hover:bg-orange-400 disabled:opacity-50"
                      >
                        {savingId === item.id ? "..." : "ذخیره"}
                      </button>
                    </div>
                  </div>

                  {isFinishedLocked(item) ? (
                    <p className="mt-3 text-xs font-bold text-fg/60">
                      🔒 این بار پایان یافته و دیگر قابل تغییر نیست.
                    </p>
                  ) : (
                    isLockedPrice(item) && (
                      <p className="mt-3 text-xs font-bold text-fg/60">
                        🔒 کرایه ثبت شده و قابل تغییر نیست؛ برای تغییر با مدیریت تماس بگیرید.
                      </p>
                    )
                  )}

                  {isIntracity && assignedDrivers[item.id] && (
                    <p className="mt-3 rounded-xl bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-700">
                      👤 راننده: {assignedDrivers[item.id]}
                    </p>
                  )}

                  {isIntracity && !isFinishedLocked(item) && !assignedDrivers[item.id] && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.price == null && draftPrice(item.id) == null) {
                            alert("اول کرایه را بنویسید و ذخیره کنید.");
                            return;
                          }
                          if (item.price == null) {
                            alert("اول کرایه را با دکمه «ذخیره» ثبت کنید.");
                            return;
                          }
                          setDriverSearch("");
                          setShowAllDrivers(false);
                          setPickerFor(pickerFor === item.id ? null : item.id);
                        }}
                        className="rounded-xl border border-sky-400/40 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-500/10"
                      >
                        👤 انتخاب راننده / پیک
                      </button>
                      {pickerFor === item.id && driverPicker(item)}
                    </div>
                  )}

                  {isIntracity && !isFinishedLocked(item) && !assignedDrivers[item.id] && (
                    <div className="mt-3">
                      {publishedIds.has(item.id) ? (
                        <span className="inline-block rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-700">
                          ✓ برای رانندگان ارسال شده
                        </span>
                      ) : (
                        item.status !== "لغو شد" && (
                          <button
                            type="button"
                            disabled={publishingId === item.id}
                            onClick={() => void publishToDrivers(item)}
                            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-50"
                          >
                            {publishingId === item.id ? "در حال ارسال..." : "🚛 ارسال برای رانندگان"}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {!isLockedPrice(item) && draftPrice(item.id) != null && draftPrice(item.id) !== item.price && (
                    <p className="mt-2 text-xs text-emerald-700">
                      کرایه‌ی جدید: {formatPrice(draftPrice(item.id))} — برای ثبت «ذخیره» را بزنید.
                    </p>
                  )}
                </article>
              ))}
            </section>
            </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
