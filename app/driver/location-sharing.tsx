"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ui } from "@/components/ui";

// «اشتراک موقعیت» پنل راننده: فقط با اجازه‌ی خود راننده و فقط تا وقتی پنل باز است؛
// آخرین موقعیت را فقط مدیر در بخش رانندگان پنلش می‌بیند. خاموش کردن، موقعیت ذخیره‌شده را هم پاک می‌کند.
const MIN_SEND_MS = 15_000; // زودتر از این دوباره نمی‌فرستیم
const MAX_SEND_MS = 60_000; // حتی اگر حرکت نکرده، هر یک دقیقه یک بار
const MOVE_METERS = 300; // با این مقدار جابه‌جایی زودتر می‌فرستیم

type Fix = { lat: number; lng: number; at: number };

function distanceMeters(a: Fix, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function geoErrorText(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "اجازه‌ی موقعیت داده نشد. از تنظیمات مرورگر یا گوشی، دسترسی «موقعیت مکانی» را برای ماکان بار روشن کنید و دوباره امتحان کنید.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "موقعیت پیدا نشد. GPS (موقعیت مکانی) گوشی را روشن کنید.";
  }
  return "گرفتن موقعیت طول کشید؛ دوباره امتحان می‌شود.";
}

export function LocationSharing({ supabase }: { supabase: SupabaseClient }) {
  const [sharing, setSharing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastSent, setLastSent] = useState<number | null>(null);
  const lastFix = useRef<Fix | null>(null);
  const watchId = useRef<number | null>(null);
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  const send = useCallback(
    async (position: GeolocationPosition, force = false) => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      const now = Date.now();
      const prev = lastFix.current;
      if (!force && prev) {
        const elapsed = now - prev.at;
        if (elapsed < MIN_SEND_MS) return;
        if (elapsed < MAX_SEND_MS && distanceMeters(prev, { lat, lng }) < MOVE_METERS) return;
      }
      lastFix.current = { lat, lng, at: now };
      const { error: rpcError } = await supabase.rpc("report_my_location", {
        p_lat: lat,
        p_lng: lng,
        p_accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
      });
      if (rpcError) {
        lastFix.current = prev;
        return;
      }
      setError("");
      setLastSent(now);
    },
    [supabase]
  );

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const startWatch = useCallback(() => {
    if (!supported || watchId.current !== null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (position) => void send(position),
      (geoError) => setError(geoErrorText(geoError)),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 }
    );
  }, [send, supported]);

  // وضعیت فعلی اشتراک را از سرور می‌خوانیم
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("driver_locations").select("sharing, located_at").maybeSingle();
      if (cancelled) return;
      setSharing(!!data?.sharing);
      if (data?.sharing && data.located_at) setLastSent(new Date(data.located_at).getTime());
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // تا وقتی روشن است و پنل باز است موقعیت را دنبال می‌کنیم
  useEffect(() => {
    if (!sharing) return;
    startWatch();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      navigator.geolocation.getCurrentPosition((position) => void send(position, true), () => undefined, {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 30_000,
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      stopWatch();
    };
  }, [sharing, send, startWatch, stopWatch]);

  async function turnOn() {
    if (!supported) {
      setError("این گوشی یا مرورگر موقعیت مکانی را پشتیبانی نمی‌کند.");
      return;
    }
    setBusy(true);
    setError("");
    // اول اجازه‌ی گوشی را می‌گیریم؛ اگر راننده اجازه نداد، چیزی روشن نمی‌شود
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { error: rpcError } = await supabase.rpc("set_my_location_sharing", { p_on: true });
        if (rpcError) {
          setBusy(false);
          setError("روشن کردن انجام نشد؛ دوباره تلاش کنید.");
          return;
        }
        await send(position, true);
        setBusy(false);
        setSharing(true);
      },
      (geoError) => {
        setBusy(false);
        setError(geoErrorText(geoError));
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 }
    );
  }

  async function turnOff() {
    setBusy(true);
    const { error: rpcError } = await supabase.rpc("set_my_location_sharing", { p_on: false });
    setBusy(false);
    if (rpcError) {
      setError("خاموش کردن انجام نشد؛ دوباره تلاش کنید.");
      return;
    }
    stopWatch();
    lastFix.current = null;
    setLastSent(null);
    setError("");
    setSharing(false);
  }

  if (sharing === null) return null;

  return (
    <section
      className={`${ui.card} p-4 sm:p-5 ${sharing ? "border-emerald-400/40 bg-emerald-500/[0.06]" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-black">📍 اشتراک موقعیت {sharing ? "روشن است" : ""}</h3>
          <p className="mt-1 text-xs leading-6 text-fg/60">
            {sharing
              ? `تا وقتی این پنل باز است، موقعیت شما فقط برای مدیریت ماکان بار فرستاده می‌شود.${
                  lastSent
                    ? ` آخرین ارسال: ${new Date(lastSent).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`
                    : ""
                }`
              : "با روشن کردن، مدیریت ماکان بار می‌تواند موقعیت شما را ببیند و بار نزدیک‌تری برایتان پیدا کند. هر وقت بخواهید خاموشش می‌کنید."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void (sharing ? turnOff() : turnOn())}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black transition disabled:opacity-50 ${
            sharing
              ? "border border-fg/15 text-fg/70 hover:bg-fg/5"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {busy ? "صبر کنید..." : sharing ? "خاموش کردن" : "روشن کردن"}
        </button>
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs leading-6 text-red-700">{error}</p>}
    </section>
  );
}
