"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPrice } from "@/lib/shipments";

// گزارش ماهانه‌ی پنل مدیر: بارها، کرایه‌ی بارهای انجام‌شده و رانندگان فعال، به ماه شمسی
type RequestRow = { created_at: string; shipment_type: string | null; status: string | null; price: number | null };
type LoadRow = { created_at: string; driver_id: string | null };
type DriverRow = { created_at: string };

type Month = {
  key: string;
  label: string;
  total: number;
  partial: number;
  full: number;
  intracity: number;
  done: number;
  canceled: number;
  revenue: number;
  activeDrivers: number;
  newDrivers: number;
};

const MONTHS_SHOWN = 6;

// کلید و نام ماه شمسی، مثلاً «۱۴۰۵/۰۸» و «آبان ۱۴۰۵»
function persianMonth(date: string | Date) {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric", month: "2-digit" }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return {
    key: `${year}-${month}`,
    label: d.toLocaleDateString("fa-IR-u-ca-persian", { year: "numeric", month: "long" }),
  };
}

function buildMonths(requests: RequestRow[], loads: LoadRow[], drivers: DriverRow[]) {
  const months = new Map<string, Month & { driverIds: Set<string> }>();

  // شش ماه اخیر، حتی اگر باری نداشته باشند
  // با گام ۱۰ روزه عقب می‌رویم تا هیچ ماه شمسی (۲۹ تا ۳۱ روزه) جا نیفتد
  const cursor = new Date();
  while (months.size < MONTHS_SHOWN) {
    const { key, label } = persianMonth(cursor);
    if (!months.has(key)) {
      months.set(key, {
        key, label, total: 0, partial: 0, full: 0, intracity: 0, done: 0, canceled: 0,
        revenue: 0, activeDrivers: 0, newDrivers: 0, driverIds: new Set(),
      });
    }
    cursor.setDate(cursor.getDate() - 10);
  }

  for (const row of requests) {
    const month = months.get(persianMonth(row.created_at).key);
    if (!month) continue;
    month.total++;
    if (row.shipment_type === "partial") month.partial++;
    else if (row.shipment_type === "full") month.full++;
    else if (row.shipment_type === "intracity") month.intracity++;
    if (row.status === "انجام شد") {
      month.done++;
      month.revenue += Number(row.price ?? 0);
    }
    if (row.status === "لغو شد") month.canceled++;
  }

  for (const row of loads) {
    const month = months.get(persianMonth(row.created_at).key);
    if (month && row.driver_id) month.driverIds.add(row.driver_id);
  }

  for (const row of drivers) {
    const month = months.get(persianMonth(row.created_at).key);
    if (month) month.newDrivers++;
  }

  return [...months.values()].map(({ driverIds, ...month }) => ({
    ...month,
    activeDrivers: driverIds.size,
  }));
}

export function MonthlyReport({ supabase }: { supabase: SupabaseClient }) {
  const [months, setMonths] = useState<Month[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    // کمی بیشتر از شش ماه؛ برای مرز ماه‌ها
    const since = new Date(Date.now() - (MONTHS_SHOWN + 1) * 31 * 86_400_000).toISOString();

    void Promise.all([
      supabase.from("requests").select("created_at, shipment_type, status, price").gte("created_at", since),
      supabase.from("loads").select("created_at, driver_id").gte("created_at", since),
      supabase.from("driver_profiles").select("created_at").gte("created_at", since),
    ]).then(([requests, loads, drivers]) => {
      if (cancelled) return;
      if (requests.error || loads.error || drivers.error) {
        setError("دریافت اطلاعات گزارش انجام نشد. دوباره تلاش کنید.");
        return;
      }
      setMonths(
        buildMonths(
          (requests.data ?? []) as RequestRow[],
          (loads.data ?? []) as LoadRow[],
          (drivers.data ?? []) as DriverRow[],
        )
      );
    });

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (error) {
    return <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-700">{error}</div>;
  }

  if (!months) {
    return <div className="rounded-3xl border border-fg/10 bg-surface-2 p-10 text-center text-fg/55">در حال دریافت...</div>;
  }

  const current = months[0];

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [`بارهای ${current.label}`, current.total.toLocaleString("fa-IR")],
          ["انجام شده", current.done.toLocaleString("fa-IR")],
          ["جمع کرایه‌ی بارهای انجام‌شده", formatPrice(current.revenue)],
          ["رانندگان فعال این ماه", current.activeDrivers.toLocaleString("fa-IR")],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-fg/10 bg-surface-2 p-5">
            <p className="text-sm text-fg/55">{label}</p>
            <p className="mt-3 text-2xl font-black text-orange-700">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-fg/10 bg-surface-2">
        <table className="w-full min-w-[760px] text-right text-sm">
          <thead className="bg-surface-3 text-xs text-fg/60">
            <tr>
              {["ماه", "همه‌ی بارها", "خرده‌بار", "دربستی", "درون‌شهری", "انجام شد", "لغو شد", "جمع کرایه (انجام‌شده)", "رانندگان فعال", "راننده‌ی جدید"].map(
                (title) => (
                  <th key={title} className="px-4 py-3 font-bold">
                    {title}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.key} className="border-t border-fg/10">
                <td className="px-4 py-3 font-black">{month.label}</td>
                {[month.total, month.partial, month.full, month.intracity, month.done, month.canceled].map((value, i) => (
                  <td key={i} className="px-4 py-3">
                    {value.toLocaleString("fa-IR")}
                  </td>
                ))}
                <td className="px-4 py-3 font-bold text-emerald-700">{formatPrice(month.revenue)}</td>
                <td className="px-4 py-3">{month.activeDrivers.toLocaleString("fa-IR")}</td>
                <td className="px-4 py-3">{month.newDrivers.toLocaleString("fa-IR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-6 text-fg/55">
        جمع کرایه فقط بارهایی را حساب می‌کند که وضعیتشان «انجام شد» است. «رانندگان فعال» یعنی رانندگانی که در آن ماه
        باری پذیرفته‌اند یا بار به آن‌ها داده شده است.
      </p>
    </section>
  );
}
