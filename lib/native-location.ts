"use client";

import { registerPlugin } from "@capacitor/core";

// موقعیت در پس‌زمینه، فقط داخل اپ اندروید ماکان بار.
// یک اعلان ثابت «اشتراک موقعیت روشن است» نشان داده می‌شود و تا وقتی اپ کاملاً بسته نشده،
// حتی با صفحه‌ی خاموش هم موقعیت می‌رسد. در مرورگر معمولی این فایل اصلاً بارگذاری نمی‌شود.

type NativeLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  time: number | null;
};

type NativeLocationError = { code?: string; message: string };

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (location?: NativeLocation, error?: NativeLocationError) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

export async function startNativeWatch(
  onFix: (fix: { lat: number; lng: number; accuracy: number | null }) => void,
  onError: (message: string, notAuthorized: boolean) => void
) {
  return BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: "ماکان بار · اشتراک موقعیت روشن است",
      backgroundMessage: "برای خاموش کردن، وارد پنل راننده شوید.",
      requestPermissions: true,
      stale: false,
      // هر ۵۰ متر جابه‌جایی یک موقعیت تازه
      distanceFilter: 50,
    },
    (location, error) => {
      if (error) {
        const notAuthorized = error.code === "NOT_AUTHORIZED";
        onError(
          notAuthorized
            ? "اجازه‌ی موقعیت به اپ داده نشده. در تنظیمات گوشی، «موقعیت مکانی» را برای ماکان بار روی «همیشه» یا «فقط هنگام استفاده» بگذارید."
            : "موقعیت پیدا نشد. GPS (موقعیت مکانی) گوشی را روشن کنید.",
          notAuthorized
        );
        return;
      }
      if (!location) return;
      onFix({
        lat: location.latitude,
        lng: location.longitude,
        accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null,
      });
    }
  );
}

export async function stopNativeWatch(id: string) {
  await BackgroundGeolocation.removeWatcher({ id });
}

export async function openAppSettings() {
  await BackgroundGeolocation.openSettings();
}
