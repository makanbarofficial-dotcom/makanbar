import type { CapacitorConfig } from "@capacitor/cli";

// اپ اندروید ماکان بار: خود سایت makanbar.com را باز می‌کند (هر تغییری روی سایت، همان لحظه در اپ هم هست)
// و امکانات گوشی مثل موقعیت در پس‌زمینه را به سایت می‌دهد.
// شناسه همان اپ قبلی بازار و مایکت است تا نسخه‌ی جدید «آپدیت» حساب شود.
const config: CapacitorConfig = {
  appId: "com.makanbar.app",
  appName: "ماکان بار",
  // صفحه‌ی ساده‌ای که فقط وقتی اینترنت نیست دیده می‌شود
  webDir: "mobile-shell",
  server: {
    url: "https://makanbar.com/app/",
    androidScheme: "https",
    allowNavigation: ["makanbar.com", "*.makanbar.com"],
    errorPath: "offline.html",
  },
  android: {
    backgroundColor: "#07111f",
  },
};

export default config;
