"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type * as Leaflet from "leaflet";
import { CallButton } from "@/components/call-button";

// بخش «🗺 نقشه‌ی رانندگان» پنل مدیر:
//   ۱) آخرین موقعیت همه‌ی رانندگانی که خودشان اشتراک موقعیت را روشن کرده‌اند
//   ۲) مسیر جابه‌جایی یک راننده در یک روز، با مسافت و ساعت شروع و پایان
// نقشه از OpenStreetMap است (رایگان، در ایران باز می‌شود).

type DriverRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  vehicle_type: string | null;
  vehicle_model: string | null;
};

type LocationRow = {
  driver_id: string;
  sharing: boolean;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  located_at: string | null;
};

type HistoryPoint = { lat: number; lng: number; accuracy: number | null; recorded_at: string };

type Pin = DriverRow & { lat: number; lng: number; located_at: string; accuracy: number | null };

const IRAN_CENTER: [number, number] = [32.4, 53.7];
const HOUR = 3600_000;
// فاصله‌ی بیش از این بین دو نقطه یعنی پنل راننده بسته بوده؛ با خط‌چین کشیده می‌شود
const GAP_MS = 10 * 60_000;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function timeAgo(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  return `${Math.round(hours / 24).toLocaleString("fa-IR")} روز پیش`;
}

function pinColor(iso: string, now: number) {
  const age = now - new Date(iso).getTime();
  if (age < 15 * 60_000) return "#059669"; // سبز: همین الان
  if (age < 3 * HOUR) return "#f59e0b"; // نارنجی: چند ساعت اخیر
  return "#94a3b8"; // خاکستری: قدیمی
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

// ۳۰ روز اخیر، با تاریخ شمسی
function recentDays() {
  const days: { key: string; label: string; start: Date; end: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i += 1) {
    const start = new Date(today);
    start.setDate(today.getDate() - i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const date = start.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" });
    days.push({
      key: start.toISOString(),
      label: i === 0 ? `امروز (${date})` : i === 1 ? `دیروز (${date})` : date,
      start,
      end,
    });
  }
  return days;
}

function pinIcon(L: typeof Leaflet, color: string, emoji: string, size = 34) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.5)}px">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function AdminDriverMap({ supabase }: { supabase: SupabaseClient }) {
  const mapBox = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  // نقشه فقط با عوض شدن فیلتر دوباره بزرگ‌نمایی می‌شود، نه با تازه شدن خودکار هر دقیقه
  const fittedKey = useRef("");

  const [mapReady, setMapReady] = useState(false);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<"live" | "route">("live");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [recentOnly, setRecentOnly] = useState(false);

  const days = useMemo(() => recentDays(), []);
  const [routeDriver, setRouteDriver] = useState("");
  const [routeDay, setRouteDay] = useState(0);
  const [route, setRoute] = useState<HistoryPoint[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // دریافت رانندگان و آخرین موقعیت‌ها
  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: driverData, error: driverError }, { data: locationData, error: locationError }] =
      await Promise.all([
        supabase.from("driver_profiles").select("id, full_name, phone, vehicle_type, vehicle_model"),
        supabase.from("driver_locations").select("driver_id, sharing, lat, lng, accuracy, located_at"),
      ]);
    setLoading(false);
    if (driverError || locationError) {
      setError("دریافت موقعیت‌ها انجام نشد؛ «بروزرسانی» را بزنید.");
      return;
    }
    setError("");
    setDrivers((driverData ?? []) as DriverRow[]);
    setLocations((locationData ?? []) as LocationRow[]);
    setNow(Date.now());
  }, [supabase]);

  useEffect(() => {
    void load();
    // هر یک دقیقه خودکار تازه می‌شود
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  // ساختن نقشه (فقط یک بار)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapBox.current || mapRef.current) return;
      const map = L.map(mapBox.current, { center: IRAN_CENTER, zoom: 5, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      leafletRef.current = L;
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const driverById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);

  const pins: Pin[] = useMemo(
    () =>
      locations
        .filter((row) => row.sharing && row.lat !== null && row.lng !== null && row.located_at)
        .map((row) => {
          const driver = driverById.get(row.driver_id);
          return {
            id: row.driver_id,
            full_name: driver?.full_name ?? "راننده",
            phone: driver?.phone ?? null,
            vehicle_type: driver?.vehicle_type ?? null,
            vehicle_model: driver?.vehicle_model ?? null,
            lat: row.lat as number,
            lng: row.lng as number,
            accuracy: row.accuracy,
            located_at: row.located_at as string,
          };
        }),
    [locations, driverById]
  );

  const vehicleTypes = useMemo(
    () => Array.from(new Set(pins.map((pin) => pin.vehicle_type || "سایر"))),
    [pins]
  );

  const visiblePins = useMemo(
    () =>
      pins.filter(
        (pin) =>
          (vehicleFilter === "all" || (pin.vehicle_type || "سایر") === vehicleFilter) &&
          (!recentOnly || now - new Date(pin.located_at).getTime() < HOUR)
      ),
    [pins, vehicleFilter, recentOnly, now]
  );

  const sharingCount = locations.filter((row) => row.sharing).length;
  const activeHourCount = pins.filter((pin) => now - new Date(pin.located_at).getTime() < HOUR).length;

  // نمای «الان کجا هستند»
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!mapReady || !L || !map || !layer || mode !== "live") return;
    layer.clearLayers();
    for (const pin of visiblePins) {
      const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon(L, pinColor(pin.located_at, now), "🚚") });
      const vehicle = [pin.vehicle_type, pin.vehicle_model].filter(Boolean).join(" · ");
      marker.bindPopup(
        `<div dir="rtl" style="font-family:inherit;min-width:160px;line-height:1.9">
          <b>${escapeHtml(pin.full_name || "راننده")}</b><br/>
          ${vehicle ? `${escapeHtml(vehicle)}<br/>` : ""}
          <span style="color:#64748b">${timeAgo(pin.located_at, now)}</span><br/>
          ${pin.phone ? `<a href="tel:${escapeHtml(pin.phone)}" style="color:#059669;font-weight:700">📞 تماس</a> · ` : ""}
          <a href="https://www.google.com/maps?q=${pin.lat},${pin.lng}" target="_blank" rel="noopener">مسیریابی</a>
        </div>`
      );
      marker.addTo(layer);
    }
    const fitKey = `${vehicleFilter}|${recentOnly}|${visiblePins.length > 0}`;
    if (fittedKey.current === fitKey) return;
    fittedKey.current = fitKey;
    if (visiblePins.length > 0) {
      map.fitBounds(L.latLngBounds(visiblePins.map((pin) => [pin.lat, pin.lng] as [number, number])), {
        padding: [40, 40],
        maxZoom: 12,
      });
    } else {
      map.setView(IRAN_CENTER, 5);
    }
  }, [mapReady, mode, visiblePins, now, vehicleFilter, recentOnly]);

  // دریافت مسیر یک راننده در یک روز (صفحه‌به‌صفحه، چون هر بار حداکثر ۱۰۰۰ ردیف می‌آید)
  const loadRoute = useCallback(async () => {
    if (!routeDriver) {
      setRoute(null);
      return;
    }
    setRouteLoading(true);
    const day = days[routeDay];
    const points: HistoryPoint[] = [];
    for (let from = 0; from < 20_000; from += 1000) {
      const { data, error: routeError } = await supabase
        .from("driver_location_history")
        .select("lat, lng, accuracy, recorded_at")
        .eq("driver_id", routeDriver)
        .gte("recorded_at", day.start.toISOString())
        .lt("recorded_at", day.end.toISOString())
        .order("recorded_at", { ascending: true })
        .range(from, from + 999);
      if (routeError) {
        setError("دریافت مسیر انجام نشد؛ دوباره تلاش کنید.");
        break;
      }
      points.push(...((data ?? []) as HistoryPoint[]));
      if (!data || data.length < 1000) break;
    }
    setRouteLoading(false);
    setRoute(points);
  }, [supabase, routeDriver, routeDay, days]);

  useEffect(() => {
    if (mode === "route") void loadRoute();
  }, [mode, loadRoute]);

  // نقطه‌های خیلی نادقیق را کنار می‌گذاریم تا مسیر و مسافت بی‌خودی زیاد نشود
  const cleanRoute = useMemo(
    () => (route ?? []).filter((point) => point.accuracy === null || point.accuracy <= 500),
    [route]
  );

  const routeStats = useMemo(() => {
    if (cleanRoute.length === 0) return null;
    let km = 0;
    let gaps = 0;
    for (let i = 1; i < cleanRoute.length; i += 1) {
      km += distanceKm(cleanRoute[i - 1], cleanRoute[i]);
      if (new Date(cleanRoute[i].recorded_at).getTime() - new Date(cleanRoute[i - 1].recorded_at).getTime() > GAP_MS) {
        gaps += 1;
      }
    }
    return {
      km,
      gaps,
      start: cleanRoute[0].recorded_at,
      end: cleanRoute[cleanRoute.length - 1].recorded_at,
      count: cleanRoute.length,
    };
  }, [cleanRoute]);

  // نمای «مسیر»
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!mapReady || !L || !map || !layer || mode !== "route") return;
    layer.clearLayers();
    fittedKey.current = "";
    if (cleanRoute.length === 0) {
      map.setView(IRAN_CENTER, 5);
      return;
    }
    // تکه‌های پیوسته با خط پر، فاصله‌های بی‌خبر (پنل بسته) با خط‌چین
    let segment: [number, number][] = [[cleanRoute[0].lat, cleanRoute[0].lng]];
    for (let i = 1; i < cleanRoute.length; i += 1) {
      const prev = cleanRoute[i - 1];
      const point = cleanRoute[i];
      const gap = new Date(point.recorded_at).getTime() - new Date(prev.recorded_at).getTime() > GAP_MS;
      if (gap) {
        if (segment.length > 1) L.polyline(segment, { color: "#ea580c", weight: 5, opacity: 0.85 }).addTo(layer);
        L.polyline(
          [
            [prev.lat, prev.lng],
            [point.lat, point.lng],
          ],
          { color: "#64748b", weight: 3, opacity: 0.7, dashArray: "6 8" }
        ).addTo(layer);
        segment = [[point.lat, point.lng]];
      } else {
        segment.push([point.lat, point.lng]);
      }
    }
    if (segment.length > 1) L.polyline(segment, { color: "#ea580c", weight: 5, opacity: 0.85 }).addTo(layer);

    const first = cleanRoute[0];
    const last = cleanRoute[cleanRoute.length - 1];
    L.marker([first.lat, first.lng], { icon: pinIcon(L, "#059669", "▶", 28) })
      .bindPopup(`<div dir="rtl">شروع: ${clock(first.recorded_at)}</div>`)
      .addTo(layer);
    L.marker([last.lat, last.lng], { icon: pinIcon(L, "#dc2626", "🚚", 34) })
      .bindPopup(`<div dir="rtl">آخرین نقطه: ${clock(last.recorded_at)}</div>`)
      .addTo(layer);

    map.fitBounds(L.latLngBounds(cleanRoute.map((point) => [point.lat, point.lng] as [number, number])), {
      padding: [40, 40],
      maxZoom: 15,
    });
  }, [mapReady, mode, cleanRoute]);

  const sharingDrivers = useMemo(
    () =>
      locations
        .filter((row) => row.sharing)
        .map((row) => driverById.get(row.driver_id))
        .filter((driver): driver is DriverRow => !!driver)
        .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "fa")),
    [locations, driverById]
  );

  const selectedDriver = routeDriver ? driverById.get(routeDriver) : undefined;

  const chip = (active: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-bold transition ${
      active ? "bg-fg text-white" : "border border-fg/10 bg-surface-2 text-fg/70 hover:bg-fg/10"
    }`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black">🗺 نقشه‌ی رانندگان</h3>
          <p className="mt-2 text-sm leading-7 text-fg/55">
            فقط رانندگانی که خودشان «اشتراک موقعیت» را روشن کرده‌اند دیده می‌شوند؛ موقعیت وقتی پنل راننده باز است
            به‌روز می‌شود.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void (mode === "live" ? load() : loadRoute())}
          disabled={loading || routeLoading}
          className="rounded-2xl border border-fg/10 px-4 py-2.5 text-sm font-bold text-fg/70 hover:bg-fg/5 disabled:opacity-50"
        >
          {loading || routeLoading ? "..." : "بروزرسانی"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["موقعیت روشن", sharingCount],
          ["فعال در یک ساعت اخیر", activeHourCount],
          ["کل رانندگان", drivers.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-fg/10 bg-surface-2 p-3 sm:p-4">
            <p className="text-xs text-fg/55">{label}</p>
            <p className="mt-1 text-2xl font-black">{Number(value).toLocaleString("fa-IR")}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("live")} className={chip(mode === "live")}>
          📍 الان کجا هستند
        </button>
        <button type="button" onClick={() => setMode("route")} className={chip(mode === "route")}>
          〰 مسیر جابه‌جایی
        </button>
      </div>

      {mode === "live" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setVehicleFilter("all")} className={chip(vehicleFilter === "all")}>
            همه ({pins.length.toLocaleString("fa-IR")})
          </button>
          {vehicleTypes.map((type) => (
            <button key={type} type="button" onClick={() => setVehicleFilter(type)} className={chip(vehicleFilter === type)}>
              {type} ({pins.filter((pin) => (pin.vehicle_type || "سایر") === type).length.toLocaleString("fa-IR")})
            </button>
          ))}
          <label className="flex items-center gap-2 rounded-xl border border-fg/10 bg-surface-2 px-3 py-2 text-sm font-bold text-fg/70">
            <input type="checkbox" checked={recentOnly} onChange={(event) => setRecentOnly(event.target.checked)} />
            فقط یک ساعت اخیر
          </label>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={routeDriver}
            onChange={(event) => setRouteDriver(event.target.value)}
            className="w-full rounded-2xl border border-fg/10 bg-surface-2 px-4 py-3 text-sm outline-none focus:border-orange-500"
          >
            <option value="">انتخاب راننده...</option>
            {sharingDrivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name || "راننده"}
                {driver.vehicle_type ? ` · ${driver.vehicle_type}` : ""}
              </option>
            ))}
          </select>
          <select
            value={routeDay}
            onChange={(event) => setRouteDay(Number(event.target.value))}
            className="w-full rounded-2xl border border-fg/10 bg-surface-2 px-4 py-3 text-sm outline-none focus:border-orange-500"
          >
            {days.map((day, index) => (
              <option key={day.key} value={index}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      {mode === "route" && routeDriver && !routeLoading && route && (
        <div className="rounded-2xl border border-fg/10 bg-surface-2 p-4">
          {routeStats ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black">{selectedDriver?.full_name || "راننده"}</p>
                {selectedDriver?.phone && <CallButton phone={selectedDriver.phone} />}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ["مسافت تقریبی", `${Math.round(routeStats.km).toLocaleString("fa-IR")} کیلومتر`],
                  ["اولین موقعیت", clock(routeStats.start)],
                  ["آخرین موقعیت", clock(routeStats.end)],
                  ["تعداد نقطه‌ها", routeStats.count.toLocaleString("fa-IR")],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-surface-3 p-3">
                    <p className="text-xs text-fg/55">{label}</p>
                    <p className="mt-1 font-bold">{value}</p>
                  </div>
                ))}
              </div>
              {routeStats.gaps > 0 && (
                <p className="mt-3 text-xs leading-6 text-fg/55">
                  خط‌چین خاکستری یعنی آن وقت پنل راننده بسته بوده و مسیر دقیقش معلوم نیست (
                  {routeStats.gaps.toLocaleString("fa-IR")} بار).
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-fg/55">در این روز موقعیتی از این راننده ثبت نشده است.</p>
          )}
        </div>
      )}

      {mode === "route" && !routeDriver && (
        <p className="rounded-2xl border border-fg/10 bg-surface-2 p-4 text-sm text-fg/55">
          یک راننده و یک روز انتخاب کنید تا مسیرش روی نقشه کشیده شود.
        </p>
      )}

      <div
        ref={mapBox}
        dir="ltr"
        className="relative z-0 h-[60vh] min-h-[360px] w-full overflow-hidden rounded-3xl border border-fg/10 bg-surface-3"
      />

      {mode === "live" && (
        <div className="flex flex-wrap gap-4 text-xs text-fg/60">
          <span>
            <span className="ml-1 inline-block h-3 w-3 rounded-full bg-[#059669] align-middle" />
            کمتر از ۱۵ دقیقه پیش
          </span>
          <span>
            <span className="ml-1 inline-block h-3 w-3 rounded-full bg-[#f59e0b] align-middle" />
            تا ۳ ساعت پیش
          </span>
          <span>
            <span className="ml-1 inline-block h-3 w-3 rounded-full bg-[#94a3b8] align-middle" />
            قدیمی‌تر
          </span>
        </div>
      )}
    </section>
  );
}
