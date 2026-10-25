"use client";

import { useEffect, useState } from "react";

// صفحه‌ی «در حال بارگذاری» پنل‌ها. اگر اینترنت ارتباط با سرور را قطع کند و جوابی نیاید،
// بعد از چند ثانیه به‌جای گیر کردن، پیغام و دکمه‌ی «تلاش دوباره» نشان داده می‌شود.
const SLOW_AFTER_MS = 12_000;

export function PanelLoading() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-surface px-4 text-fg">
      {!slow ? (
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
          <p className="font-bold">در حال بارگذاری پنل...</p>
        </div>
      ) : (
        <section className="w-full max-w-sm rounded-2xl border border-fg/10 bg-surface-2 p-6 text-center shadow-sm">
          <div className="text-4xl">📶</div>
          <h1 className="mt-3 text-lg font-black">اتصال به سرور برقرار نشد</h1>
          <p className="mt-2 text-sm leading-7 text-fg/60">
            احتمالاً اینترنت شما ضعیف است یا ارتباط با سرور قطع شده. اینترنت را عوض کنید (وای‌فای یا
            اینترنت سیم‌کارت) و دوباره امتحان کنید.
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-5 w-full rounded-xl bg-brand py-3 font-bold text-white transition hover:bg-brand-2"
          >
            تلاش دوباره
          </button>
        </section>
      )}
    </main>
  );
}
