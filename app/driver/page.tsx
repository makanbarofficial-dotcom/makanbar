"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand, ui } from "@/components/ui";
import { formatPrice } from "@/lib/shipments";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type LoadStatus = "available" | "assigned" | "in_transit" | "delivered" | "cancelled";

type Load = {
  id: string;
  request_id: number | null;
  origin: string;
  destination: string;
  cargo_type: string;
  weight: string | null;
  vehicle_type: string | null;
  price: number | null;
  status: LoadStatus;
  description: string | null;
  created_at: string;
  pickup_address: string | null;
  delivery_address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
};

// جزئیات کار که فقط بعد از پذیرش بار به راننده نشان داده می‌شود
type JobDetails = {
  id: number;
  full_name: string;
  phone: string;
  pickup_address: string | null;
  delivery_address: string | null;
};

type DriverProfile = {
  id: string;
  full_name: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  vehicle_type: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
};

type Tab = "available" | "mine" | "profile";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "available", icon: "📋", label: "بارهای آزاد" },
  { id: "mine", icon: "🚚", label: "بارهای من" },
  { id: "profile", icon: "👤", label: "پروفایل" },
];

const STATUS_LABELS: Record<LoadStatus, string> = {
  available: "آزاد",
  assigned: "در انتظار بارگیری",
  in_transit: "در مسیر",
  delivered: "تحویل شد",
  cancelled: "لغو شد",
};

const STATUS_TONES: Record<LoadStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-300",
  assigned: "bg-sky-500/15 text-sky-300",
  in_transit: "bg-orange-500/15 text-orange-300",
  delivered: "bg-white/10 text-white/60",
  cancelled: "bg-red-500/15 text-red-300",
};

// دکمه‌ی قدم بعدی برای راننده
const NEXT_STEP: Partial<Record<LoadStatus, { status: LoadStatus; label: string }>> = {
  assigned: { status: "in_transit", label: "بار را تحویل گرفتم، حرکت کردم" },
  in_transit: { status: "delivered", label: "بار را به مقصد تحویل دادم" },
};

const LOAD_COLUMNS =
  "id, request_id, origin, destination, cargo_type, weight, vehicle_type, price, status, description, created_at, pickup_address, delivery_address, contact_name, contact_phone";

function errorMessage(error: unknown, fallback: string) {
  const message = (error as { message?: string })?.message;
  return message ? `${fallback}: ${message}` : fallback;
}

export default function DriverPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [availableLoads, setAvailableLoads] = useState<Load[]>([]);
  const [myLoads, setMyLoads] = useState<Load[]>([]);
  const [jobs, setJobs] = useState<Record<number, JobDetails>>({});
  const [activeTab, setActiveTab] = useState<Tab>("available");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    setError("");
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/driver/login");
      return;
    }

    const { data: driver, error: profileError } = await supabase
      .from("driver_profiles")
      .select("id, full_name, phone, status, vehicle_type, vehicle_model, vehicle_plate")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      setError(errorMessage(profileError, "دریافت پروفایل انجام نشد"));
      setLoading(false);
      return;
    }

    setProfile(driver as DriverProfile | null);

    if (!driver || driver.status !== "approved") {
      setLoading(false);
      return;
    }

    const [{ data: available, error: availableError }, { data: mine, error: mineError }] =
      await Promise.all([
        supabase
          .from("loads")
          .select(LOAD_COLUMNS)
          .eq("status", "available")
          .order("created_at", { ascending: false }),
        supabase
          .from("loads")
          .select(LOAD_COLUMNS)
          .eq("driver_id", driver.id)
          .order("created_at", { ascending: false }),
      ]);

    if (availableError || mineError) {
      setError(errorMessage(availableError ?? mineError, "دریافت بارها انجام نشد"));
    }

    const myList = (mine ?? []) as Load[];
    setAvailableLoads((available ?? []) as Load[]);
    setMyLoads(myList);

    const requestIds = myList
      .map((load) => load.request_id)
      .filter((id): id is number => id != null);

    if (requestIds.length > 0) {
      const { data: details } = await supabase
        .from("requests")
        .select("id, full_name, phone, pickup_address, delivery_address")
        .in("id", requestIds);

      setJobs(
        Object.fromEntries(((details ?? []) as JobDetails[]).map((job) => [job.id, job]))
      );
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function acceptLoad(load: Load) {
    if (!confirm(`بار ${load.origin} ← ${load.destination} را می‌پذیرید؟`)) return;

    setBusyId(load.id);
    const { data: accepted, error: acceptError } = await supabase.rpc("accept_load", {
      p_load_id: load.id,
    });
    setBusyId(null);

    if (acceptError) {
      alert(errorMessage(acceptError, "پذیرش بار انجام نشد"));
      return;
    }

    if (!accepted) {
      alert("این بار همین الان توسط راننده‌ی دیگری پذیرفته شد.");
    }

    await refresh();
    if (accepted) setActiveTab("mine");
  }

  async function advanceLoad(load: Load) {
    const next = NEXT_STEP[load.status];
    if (!next || !confirm(`${next.label}؟`)) return;

    setBusyId(load.id);
    const { error: updateError } = await supabase.rpc("update_my_load_status", {
      p_load_id: load.id,
      p_status: next.status,
    });
    setBusyId(null);

    if (updateError) {
      alert(errorMessage(updateError, "ثبت وضعیت انجام نشد"));
      return;
    }

    await refresh();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/driver/login");
  }

  function loadCard(load: Load, mine: boolean) {
    const job: JobDetails | undefined =
      load.request_id != null
        ? jobs[load.request_id]
        : load.contact_phone
          ? {
              id: 0,
              full_name: load.contact_name ?? "متصدی ماکان بار",
              phone: load.contact_phone,
              pickup_address: load.pickup_address,
              delivery_address: load.delivery_address,
            }
          : undefined;
    const next = NEXT_STEP[load.status];

    return (
      <article
        key={load.id}
        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-black leading-7 sm:text-lg">
            {load.origin} ← {load.destination}
          </h3>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[load.status]}`}
          >
            {STATUS_LABELS[load.status]}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
          <span className="text-sm text-white/60">کرایه</span>
          <span className="text-lg font-black text-emerald-300">{formatPrice(load.price)}</span>
        </div>

        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-black/15 p-3">
            <dt className="text-xs text-white/40">نوع بار</dt>
            <dd className="mt-1 font-bold">{load.cargo_type}</dd>
          </div>
          <div className="rounded-xl bg-black/15 p-3">
            <dt className="text-xs text-white/40">وزن</dt>
            <dd className="mt-1 font-bold">{load.weight || "—"}</dd>
          </div>
          <div className="col-span-2 rounded-xl bg-black/15 p-3">
            <dt className="text-xs text-white/40">خودرو</dt>
            <dd className="mt-1 font-bold">{load.vehicle_type || "فرقی نمی‌کند"}</dd>
          </div>
        </dl>

        {load.description && (
          <p className="mt-2 rounded-xl bg-black/15 p-3 text-sm leading-7 text-white/70">
            {load.description}
          </p>
        )}

        {mine && job && (
          <div className="mt-3 space-y-2 rounded-xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm">
            <p className="font-bold text-sky-200">اطلاعات کار</p>
            <p>
              <span className="text-white/50">
                {load.request_id != null ? "صاحب بار: " : "هماهنگی با: "}
              </span>
              {job.full_name}{" "}
              <a href={`tel:${job.phone}`} dir="ltr" className="font-bold text-brand-2">
                {job.phone}
              </a>
            </p>
            {job.pickup_address && (
              <p>
                <span className="text-white/50">بارگیری: </span>
                {job.pickup_address}
              </p>
            )}
            {job.delivery_address && (
              <p>
                <span className="text-white/50">تخلیه: </span>
                {job.delivery_address}
              </p>
            )}
          </div>
        )}

        {!mine && (
          <button
            type="button"
            disabled={busyId === load.id}
            onClick={() => void acceptLoad(load)}
            className={`${ui.btnPrimary} mt-4`}
          >
            {busyId === load.id ? "در حال ثبت..." : "پذیرش این بار"}
          </button>
        )}

        {mine && next && (
          <button
            type="button"
            disabled={busyId === load.id}
            onClick={() => void advanceLoad(load)}
            className={`${ui.btnPrimary} mt-4`}
          >
            {busyId === load.id ? "در حال ثبت..." : next.label}
          </button>
        )}
      </article>
    );
  }

  function emptyState(text: string) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
        {text}
      </div>
    );
  }

  if (loading) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center">
        <p className="font-bold">در حال بارگذاری پنل...</p>
      </main>
    );
  }

  const approved = profile?.status === "approved";
  const activeJobs = myLoads.filter((load) => load.status !== "delivered").length;

  return (
    <main dir="rtl" className={`min-h-screen ${approved ? "pb-24 sm:pb-0" : ""}`}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-5">
          <Brand subtitle="پنل رانندگان" />
          <div className="flex items-center gap-3">
            {profile && (
              <span className="hidden text-sm text-white/70 sm:block">{profile.full_name}</span>
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

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-5 sm:py-8">
        {error && (
          <div className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!profile ? (
          <section className={`${ui.card} p-8 text-center`}>
            <h2 className="text-xl font-black">پروفایل راننده پیدا نشد</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              این حساب هنوز ثبت‌نام رانندگی ندارد.
            </p>
            <Link href="/driver/register" className={`${ui.btnPrimary} mt-6 sm:w-auto`}>
              ثبت‌نام راننده
            </Link>
          </section>
        ) : profile.status === "pending" ? (
          <section className={`${ui.card} p-8 text-center`}>
            <div className="text-5xl">⏳</div>
            <h2 className="mt-4 text-xl font-black">حساب شما در انتظار تأیید است</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              مدیریت ماکان بار اطلاعات شما را بررسی می‌کند. بعد از تأیید، بارهای آزاد
              اینجا نمایش داده می‌شوند.
            </p>
          </section>
        ) : profile.status === "rejected" ? (
          <section className={`${ui.card} p-8 text-center`}>
            <h2 className="text-xl font-black">حساب رانندگی شما غیرفعال است</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              برای پیگیری با پشتیبانی ماکان بار تماس بگیرید.
            </p>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("available")}
                className={`${ui.card} p-4 text-right sm:p-5`}
              >
                <p className="text-sm text-white/50">بارهای آزاد</p>
                <p className="mt-1 text-2xl font-black text-brand sm:text-3xl">
                  {availableLoads.length.toLocaleString("fa-IR")}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mine")}
                className={`${ui.card} p-4 text-right sm:p-5`}
              >
                <p className="text-sm text-white/50">کارهای جاری من</p>
                <p className="mt-1 text-2xl font-black sm:text-3xl">
                  {activeJobs.toLocaleString("fa-IR")}
                </p>
              </button>
            </section>

            <nav className="mt-6 hidden gap-2 sm:flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                    activeTab === tab.id
                      ? "bg-white text-ink"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void refresh()}
                className="mr-auto rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/5"
              >
                بروزرسانی
              </button>
            </nav>

            <section className="mt-5 space-y-3">
              {activeTab === "available" &&
                (availableLoads.length === 0
                  ? emptyState("فعلاً بار آزادی نیست. کمی بعد دوباره سر بزنید.")
                  : availableLoads.map((load) => loadCard(load, false)))}

              {activeTab === "mine" &&
                (myLoads.length === 0
                  ? emptyState("هنوز باری نپذیرفته‌اید.")
                  : myLoads.map((load) => loadCard(load, true)))}

              {activeTab === "profile" && (
                <dl className={`${ui.card} divide-y divide-white/10 text-sm`}>
                  {[
                    ["نام", profile.full_name],
                    ["موبایل", profile.phone],
                    ["نوع خودرو", profile.vehicle_type],
                    ["بارگیر", profile.vehicle_model],
                    ["پلاک", profile.vehicle_plate],
                    ["وضعیت حساب", "تأیید شده ✓"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 p-4">
                      <dt className="text-white/50">{label}</dt>
                      <dd className="font-bold" dir={label === "موبایل" ? "ltr" : undefined}>
                        {value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          </>
        )}
      </div>

      {approved && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-white/10 bg-ink-2/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs ${
                activeTab === tab.id ? "bg-white/10 font-bold text-brand-2" : "text-white/55"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}
