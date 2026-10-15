"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/ui";
import { VehicleRequests } from "./vehicle-requests";
import {
  DELIVERY_MODE_LABELS,
  STAFF_STATUSES,
  formatPrice,
  normalizeDigits,
  type ShipmentRequest,
  formatDate,
  regionLabel,
  statusTone,
} from "@/lib/shipments";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type StaffProfile = {
  id: number;
  name: string;
  phone: string;
  panel_enabled: boolean | null;
};

type StaffLocation = {
  id: number;
  province: string;
  city: string | null;
};

type Filter = "active" | "done" | "all";

const FINISHED = ["انجام شد", "لغو شد"];

export default function EmployeePanelPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [locations, setLocations] = useState<StaffLocation[]>([]);
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [view, setView] = useState<"loads" | "vehicles">("loads");
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
      .select("id, name, phone, panel_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (staffError) {
      console.error("Staff profile error:", staffError);
      setError("دریافت اطلاعات متصدی انجام نشد.");
      setLoading(false);
      return;
    }

    setProfile(staff as StaffProfile | null);

    if (!staff || !staff.panel_enabled) {
      setLoading(false);
      return;
    }

    // دیتابیس فقط خرده‌بارهای «تهران ← شهرهای این متصدی» را برمی‌گرداند
    const [{ data: locationRows }, { data: rows, error: requestsError }] =
      await Promise.all([
        supabase
          .from("staff_locations")
          .select("id, province, city")
          .eq("staff_id", staff.id),
        supabase
          .from("requests")
          .select("*")
          .eq("shipment_type", "partial")
          .eq("direction", "from_tehran")
          .order("created_at", { ascending: false }),
      ]);

    setLocations((locationRows ?? []) as StaffLocation[]);

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
      if (!query) return true;

      return [item.full_name, item.phone, item.destination, item.cargo_type]
        .filter(Boolean)
        .some((value) => String(value).includes(query));
    });
  }, [requests, filter, search]);

  async function saveRequest(item: ShipmentRequest, status: string) {
    const digits = normalizeDigits(prices[item.id] ?? "").replace(/\D/g, "");
    const price = digits ? Number(digits) : null;
    const staff_note = notes[item.id]?.trim() || null;

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

    setRequests((current) =>
      current.map((row) =>
        row.id === item.id
          ? { ...row, status, staff_note, price }
          : row
      )
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/employee/login");
  }

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

  const newCount = requests.filter((item) => (item.status || "جدید") === "جدید").length;
  const activeCount = requests.filter(
    (item) => !FINISHED.includes(item.status || "جدید")
  ).length;

  return (
    <main dir="rtl" className="min-h-screen bg-ink text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5">
          <Brand subtitle="پنل متصدیان" />

          <div className="flex items-center gap-3">
            {profile?.name && (
              <span className="hidden text-sm text-white/70 sm:block">{profile.name}</span>
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

      <div className="mx-auto max-w-6xl px-5 py-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!profile || !profile.panel_enabled ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black">دسترسی پنل فعال نیست</h2>
            <p className="mt-3 leading-7 text-white/60">
              این حساب به‌عنوان متصدی فعال نشده است. لطفاً با مدیریت ماکان بار تماس بگیرید.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-white/50">شهرهای تحت پوشش شما</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {locations.length === 0 && (
                  <span className="text-sm text-white/40">
                    هنوز شهری برای شما تعیین نشده است.
                  </span>
                )}
                {locations.map((location) => (
                  <span
                    key={location.id}
                    className="rounded-full bg-orange-500/15 px-4 py-2 text-sm font-bold text-orange-300"
                  >
                    {regionLabel(location.province, location.city)}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-6 text-white/40">
                خرده‌بارهایی که از تهران به شهرهای شما ارسال می‌شوند در این پنل نمایش داده می‌شوند.
              </p>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                ["بارهای جدید", newCount],
                ["بارهای جاری", activeCount],
                ["همه بارها", requests.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/50">{label}</p>
                  <p className="mt-2 text-3xl font-black text-orange-400">
                    {Number(value).toLocaleString("fa-IR")}
                  </p>
                </div>
              ))}
            </section>

            <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
              {(
                [
                  ["loads", "📦 خرده‌بارها"],
                  ["vehicles", "🚚 درخواست ماشین"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`rounded-xl py-3 text-sm font-bold transition ${
                    view === id ? "bg-orange-500 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {view === "vehicles" ? (
              <VehicleRequests
                supabase={supabase}
                staff={{ id: profile.id, name: profile.name, phone: profile.phone }}
                defaultDestination={{
                  province: locations[0]?.province ?? "",
                  city: locations[0]?.city ?? "",
                }}
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
                      ? "bg-white text-[#07111f]"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجو: نام، تلفن، شهر..."
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-orange-500"
              />

              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/5"
              >
                بروزرسانی
              </button>
            </div>

            <section className="mt-6 space-y-4">
              {filtered.length === 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/40">
                  باری برای نمایش وجود ندارد.
                </div>
              )}

              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-white/40">
                        کد {item.id.toLocaleString("fa-IR", { useGrouping: false })} ·{" "}
                        {formatDate(item.created_at)}
                      </p>
                      <h3 className="mt-2 text-lg font-black">
                        {item.origin} ← {item.destination}
                      </h3>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          item.price != null ? "text-emerald-300" : "text-orange-300"
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
                    <div className="rounded-2xl bg-black/10 p-3">
                      <p className="text-xs text-white/40">صاحب بار</p>
                      <p className="mt-1 font-bold">{item.full_name}</p>
                      <a
                        href={`tel:${item.phone}`}
                        dir="ltr"
                        className="mt-1 block text-right text-orange-300"
                      >
                        {item.phone}
                      </a>
                    </div>
                    <div className="rounded-2xl bg-black/10 p-3">
                      <p className="text-xs text-white/40">نوع بار</p>
                      <p className="mt-1 font-bold">{item.cargo_type}</p>
                    </div>
                    <div className="rounded-2xl bg-black/10 p-3">
                      <p className="text-xs text-white/40">تعداد / وزن</p>
                      <p className="mt-1 font-bold">
                        {[item.quantity, item.weight].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {item.dimensions && (
                        <p className="mt-1 text-xs text-white/55">ابعاد: {item.dimensions}</p>
                      )}
                    </div>
                    <div className="rounded-2xl bg-black/10 p-3">
                      <p className="text-xs text-white/40">روش تحویل</p>
                      <p className="mt-1 font-bold">
                        {item.delivery_mode ? DELIVERY_MODE_LABELS[item.delivery_mode] : "—"}
                      </p>
                    </div>
                  </div>

                  {(item.pickup_address || item.delivery_address || item.description) && (
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                      {item.pickup_address && (
                        <div className="rounded-2xl bg-black/10 p-3">
                          <p className="text-xs text-white/40">آدرس بارگیری (تهران)</p>
                          <p className="mt-1">{item.pickup_address}</p>
                        </div>
                      )}
                      {item.delivery_address && (
                        <div className="rounded-2xl bg-black/10 p-3">
                          <p className="text-xs text-white/40">آدرس تخلیه</p>
                          <p className="mt-1">{item.delivery_address}</p>
                        </div>
                      )}
                      {item.description && (
                        <div className="rounded-2xl bg-black/10 p-3">
                          <p className="text-xs text-white/40">توضیحات صاحب بار</p>
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
                        className={`w-full rounded-2xl border bg-white/5 py-3 pl-14 pr-4 text-sm outline-none placeholder:text-white/30 focus:border-orange-500 ${
                          item.price == null ? "border-orange-400/40" : "border-white/10"
                        }`}
                      />
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/40">
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
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-orange-500"
                    />
                    <div className="flex gap-2">
                      <select
                        value={item.status || "جدید"}
                        disabled={savingId === item.id}
                        onChange={(event) => void saveRequest(item, event.target.value)}
                        className="rounded-2xl border border-white/10 bg-ink-2 px-4 py-3 text-sm outline-none"
                      >
                        {STAFF_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => void saveRequest(item, item.status || "جدید")}
                        className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold transition hover:bg-orange-400 disabled:opacity-50"
                      >
                        {savingId === item.id ? "..." : "ذخیره"}
                      </button>
                    </div>
                  </div>
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
