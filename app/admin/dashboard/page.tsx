"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type RequestItem = {
  id: number;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  origin: string | null;
  destination: string | null;
  cargo_type: string | null;
  weight: string | null;
  vehicle_type: string | null;
  description: string | null;
  status: string | null;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/admin");
      return;
    }

    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("خطا در دریافت درخواست‌ها");
      setLoading(false);
      return;
    }

    setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("تغییر وضعیت انجام نشد.");
      return;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? { ...request, status }
          : request
      )
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  const filteredRequests = requests.filter((request) => {
    const text = `
      ${request.full_name || ""}
      ${request.phone || ""}
      ${request.origin || ""}
      ${request.destination || ""}
      ${request.cargo_type || ""}
      ${request.id}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const newRequests = requests.filter(
    (request) => request.status === "جدید"
  ).length;

  const checkingRequests = requests.filter(
    (request) => request.status === "در حال بررسی"
  ).length;

  const completedRequests = requests.filter(
    (request) => request.status === "تکمیل شده"
  ).length;

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#091525]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center">
              <img
                src="/logo.png"
                alt="ماکان بار"
                className="h-12 w-12 object-contain"
              />
            </div>

            <div>
              <h1 className="text-lg font-black">
                پنل مدیریت ماکان بار
              </h1>

              <p className="text-xs text-white/50">
                مدیریت هوشمند کسب‌وکار
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-orange-500 hover:text-orange-400"
            >
              مشاهده سایت
            </a>

            <button
              onClick={logout}
              className="rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-5 py-8">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="mb-4 px-3 text-xs font-bold text-white/30">
              منوی مدیریت
            </p>

            {[
              ["dashboard", "📊", "داشبورد"],
              ["requests", "📦", "درخواست‌های حمل"],
              ["customers", "👥", "مشتریان"],
              ["fleet", "🚚", "ناوگان"],
              ["services", "🛠️", "خدمات"],
              ["reports", "📈", "گزارش‌ها"],
              ["settings", "⚙️", "تنظیمات"],
            ].map(([key, icon, title]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-bold transition ${
                  activeSection === key
                    ? "bg-orange-500 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{icon}</span>
                {title}
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <section className="min-w-0 flex-1">
          {/* Dashboard */}
          {activeSection === "dashboard" && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-black">
                  داشبورد
                </h2>

                <p className="mt-2 text-white/50">
                  خلاصه وضعیت و مدیریت ماکان بار
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <span className="text-3xl">📦</span>

                  <p className="mt-5 text-sm text-white/50">
                    درخواست‌های جدید
                  </p>

                  <p className="mt-2 text-3xl font-black text-orange-400">
                    {newRequests}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <span className="text-3xl">⏳</span>

                  <p className="mt-5 text-sm text-white/50">
                    در حال بررسی
                  </p>

                  <p className="mt-2 text-3xl font-black text-orange-400">
                    {checkingRequests}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <span className="text-3xl">👥</span>

                  <p className="mt-5 text-sm text-white/50">
                    تعداد درخواست‌ها
                  </p>

                  <p className="mt-2 text-3xl font-black text-orange-400">
                    {requests.length}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <span className="text-3xl">✅</span>

                  <p className="mt-5 text-sm text-white/50">
                    تکمیل شده
                  </p>

                  <p className="mt-2 text-3xl font-black text-orange-400">
                    {completedRequests}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black">
                      آخرین درخواست‌های حمل
                    </h3>

                    <p className="mt-1 text-sm text-white/40">
                      درخواست‌های واقعی ثبت شده در سایت
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveSection("requests")}
                    className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold transition hover:bg-orange-600"
                  >
                    مشاهده همه
                  </button>
                </div>

                {requests.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="text-4xl">📦</div>

                    <p className="mt-4 font-bold">
                      هنوز درخواستی ثبت نشده
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 5).map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#091525] p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-bold">
                            {request.full_name || "بدون نام"}
                          </p>

                          <p className="mt-1 text-xs text-white/40">
                            {request.origin || "-"} ←{" "}
                            {request.destination || "-"}
                          </p>
                        </div>

                        <div className="text-sm text-white/60">
                          {request.cargo_type || "نوع بار ثبت نشده"}
                        </div>

                        <span className="w-fit rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">
                          {request.status || "جدید"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Requests */}
          {activeSection === "requests" && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-black">
                  درخواست‌های حمل
                </h2>

                <p className="mt-2 text-white/50">
                  مشاهده و مدیریت درخواست‌های واقعی مشتریان
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                  {error}
                </div>
              )}

              <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                <label className="mb-2 block text-sm font-bold">
                  جستجو در درخواست‌ها
                </label>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  type="text"
                  placeholder="نام، شماره تماس، مبدا، مقصد یا کد درخواست..."
                  className="w-full rounded-2xl border border-white/10 bg-[#091525] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-500"
                />
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                {loading ? (
                  <div className="py-20 text-center">
                    <div className="text-4xl">⏳</div>

                    <p className="mt-4 text-white/60">
                      در حال دریافت درخواست‌ها...
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-right">
                      <thead className="bg-[#091525]">
                        <tr className="text-sm text-white/50">
                          <th className="px-5 py-4">کد</th>
                          <th className="px-5 py-4">مشتری</th>
                          <th className="px-5 py-4">مسیر</th>
                          <th className="px-5 py-4">نوع بار</th>
                          <th className="px-5 py-4">وزن</th>
                          <th className="px-5 py-4">وسیله</th>
                          <th className="px-5 py-4">وضعیت</th>
                          <th className="px-5 py-4">تاریخ</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredRequests.map((request) => (
                          <tr
                            key={request.id}
                            className="border-t border-white/10 transition hover:bg-white/5"
                          >
                            <td className="px-5 py-5 font-bold text-orange-400">
                              MB-{request.id}
                            </td>

                            <td className="px-5 py-5">
                              <p className="font-bold">
                                {request.full_name || "-"}
                              </p>

                              <p className="mt-1 text-xs text-white/40">
                                {request.phone || "-"}
                              </p>
                            </td>

                            <td className="px-5 py-5">
                              <p>{request.origin || "-"}</p>

                              <p className="my-1 text-xs text-white/30">
                                ↓
                              </p>

                              <p>{request.destination || "-"}</p>
                            </td>

                            <td className="px-5 py-5 text-white/70">
                              {request.cargo_type || "-"}
                            </td>

                            <td className="px-5 py-5 text-white/70">
                              {request.weight || "-"}
                            </td>

                            <td className="px-5 py-5 text-white/70">
                              {request.vehicle_type || "-"}
                            </td>

                            <td className="px-5 py-5">
                              <select
                                value={request.status || "جدید"}
                                onChange={(event) =>
                                  updateStatus(
                                    request.id,
                                    event.target.value
                                  )
                                }
                                className="rounded-xl border border-white/10 bg-[#091525] px-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                              >
                                <option value="جدید">
                                  جدید
                                </option>

                                <option value="در حال بررسی">
                                  در حال بررسی
                                </option>

                                <option value="تکمیل شده">
                                  تکمیل شده
                                </option>

                                <option value="لغو شده">
                                  لغو شده
                                </option>
                              </select>
                            </td>

                            <td className="px-5 py-5 text-sm text-white/50">
                              {formatDate(request.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filteredRequests.length === 0 && (
                      <div className="py-16 text-center">
                        <div className="text-4xl">🔍</div>

                        <p className="mt-4 font-bold">
                          نتیجه‌ای پیدا نشد
                        </p>

                        <p className="mt-2 text-sm text-white/40">
                          هنوز درخواستی با این مشخصات وجود ندارد.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Other sections */}
          {activeSection !== "dashboard" &&
            activeSection !== "requests" && (
              <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <div className="text-center">
                  <div className="text-5xl">
                    {activeSection === "customers"
                      ? "👥"
                      : activeSection === "fleet"
                        ? "🚚"
                        : activeSection === "services"
                          ? "🛠️"
                          : activeSection === "reports"
                            ? "📈"
                            : "⚙️"}
                  </div>

                  <h2 className="mt-5 text-2xl font-black">
                    این بخش به‌زودی آماده می‌شود
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    در مرحله بعد این قسمت را کامل می‌کنیم.
                  </p>
                </div>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}