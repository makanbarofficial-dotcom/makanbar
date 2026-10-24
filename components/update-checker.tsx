"use client";

import { useEffect, useState } from "react";

// هر نسخه‌ی سایت شناسه‌ای روی <html data-dpl-id> دارد (deploymentId در next.config).
// وقتی کاربر به سایت یا اپ برمی‌گردد، نسخه‌ی روی هاست بررسی می‌شود؛ اگر عوض شده باشد
// صفحه خودش تازه می‌شود، مگر اینکه کاربر وسط پر کردن فرم باشد که آن‌وقت نوار «بروزرسانی» می‌آید.
const CHECK_EVERY_MS = 5 * 60_000;

function formIsDirty() {
  return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")].some(
    (field) =>
      field.type !== "checkbox" &&
      field.type !== "radio" &&
      field.type !== "hidden" &&
      field.value !== field.defaultValue
  );
}

export function UpdateChecker() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const current = document.documentElement.dataset.dplId;
    if (!current) return;

    let lastCheck = 0;

    async function check() {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < 30_000) return;
      lastCheck = Date.now();

      try {
        const response = await fetch(location.pathname, { cache: "no-store" });
        const html = await response.text();
        const latest = html.match(/data-dpl-id="([^"]+)"/)?.[1];
        if (!latest || latest === current) return;

        if (formIsDirty()) setUpdateReady(true);
        else location.reload();
      } catch {
        // اینترنت قطع است؛ دفعه‌ی بعد دوباره بررسی می‌شود
      }
    }

    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-brand/40 bg-surface-2 px-4 py-3 text-sm text-fg shadow-2xl sm:bottom-6">
      <span className="flex-1">نسخه‌ی جدید سایت آماده است.</span>
      <button
        type="button"
        onClick={() => location.reload()}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white"
      >
        بروزرسانی
      </button>
    </div>
  );
}
