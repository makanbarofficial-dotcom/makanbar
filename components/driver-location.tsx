"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// آخرین موقعیتی که راننده با اجازه‌ی خودش فرستاده (فقط مدیر می‌بیند)
export type DriverLocation = {
  driver_id: string;
  sharing: boolean;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  located_at: string | null;
};

export async function loadDriverLocations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("driver_locations")
    .select("driver_id, sharing, lat, lng, accuracy, located_at");
  if (error) {
    console.error("Driver locations error:", error.message);
    return {};
  }
  return Object.fromEntries(((data ?? []) as DriverLocation[]).map((row) => [row.driver_id, row])) as Record<
    string,
    DriverLocation
  >;
}

function timeAgo(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  return `${Math.round(hours / 24).toLocaleString("fa-IR")} روز پیش`;
}

export function DriverLocationBox({ location }: { location?: DriverLocation }) {
  // زمان باز شدن کارت؛ با «بروزرسانی» رانندگان دوباره ساخته می‌شود
  const [now] = useState(() => Date.now());
  if (!location?.sharing) {
    return (
      <div className="mt-3 rounded-2xl bg-surface-3 p-4 text-sm">
        <p className="text-xs text-fg/55">🛰 موقعیت راننده</p>
        <p className="mt-1 font-bold text-fg/50">اشتراک موقعیت را روشن نکرده</p>
      </div>
    );
  }

  if (location.lat === null || location.lng === null || !location.located_at) {
    return (
      <div className="mt-3 rounded-2xl bg-surface-3 p-4 text-sm">
        <p className="text-xs text-fg/55">🛰 موقعیت راننده</p>
        <p className="mt-1 font-bold">روشن است؛ هنوز موقعیتی نرسیده</p>
      </div>
    );
  }

  const fresh = now - new Date(location.located_at).getTime() < 10 * 60000;
  const coords = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;

  return (
    <div className="mt-3 rounded-2xl bg-surface-3 p-4 text-sm">
      <p className="text-xs text-fg/55">🛰 موقعیت راننده</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">
          <span
            className={`ml-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle ${fresh ? "bg-emerald-500" : "bg-fg/30"}`}
          />
          آخرین موقعیت: {timeAgo(location.located_at, now)}
          {location.accuracy ? (
            <span className="mr-1 text-xs font-normal text-fg/50">
              (دقت حدود {Math.round(location.accuracy).toLocaleString("fa-IR")} متر)
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.google.com/maps?q=${coords}`}
            target="_blank"
            rel="noopener"
            className="rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-500/20"
          >
            🗺 نمایش روی نقشه
          </a>
          {/* روی گوشی برنامه‌ی نقشه (نشان، بلد، ...) را باز می‌کند */}
          <a
            href={`geo:${coords}?q=${coords}`}
            className="rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 sm:hidden"
          >
            📱 مسیریابی
          </a>
        </div>
      </div>
    </div>
  );
}
