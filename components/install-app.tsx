"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isStandalone } from "@/lib/app-role";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "makanbar-install-dismissed";

const APP_NAME = "ماکان بار";

// بعد از بستن نوار، تا چند روز دوباره نشان داده نمی‌شود
const DISMISS_DAYS = 3;

// نوار «نصب اپلیکیشن» بالای صفحه‌های سایت (به‌جز پنل مدیریت). روی گوشی همیشه دیده می‌شود:
// اگر مرورگر پنجره نصب را آماده کرده باشد همان باز می‌شود، وگرنه راهنمای نصب دستی
// (آیفون: Add to Home Screen، اندروید: منوی مرورگر) نشان داده می‌شود.
export function InstallApp() {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [help, setHelp] = useState<"ios" | "android" | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (isStandalone()) return;

    let dismissed = false;
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY));
      dismissed = until > Date.now();
    } catch {}
    if (dismissed) return;

    const ua = navigator.userAgent;
    const ios =
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) setIsIos(true);
    if (ios || /Android|Mobi/i.test(ua)) setHidden(false);

    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      setHidden(false);
    }

    function onInstalled() {
      setHidden(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 86400000),
      );
    } catch {}
    setHidden(true);
  }

  async function install() {
    if (isIos) {
      setHelp("ios");
      return;
    }
    if (!prompt) {
      setHelp("android");
      return;
    }

    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    if (choice.outcome === "accepted") setHidden(true);
  }

  if (hidden || pathname.startsWith("/admin")) return null;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-fg/10 bg-surface-2 px-4 py-2.5 text-sm text-fg">
        <span className="text-lg">📲</span>
        <p className="flex-1 leading-6">
          اپلیکیشن <b>{APP_NAME}</b> را روی گوشی نصب کنید
        </p>
        <button
          type="button"
          onClick={() => void install()}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-2"
        >
          نصب اپلیکیشن
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="بستن"
          className="rounded-lg px-2 py-1 text-fg/60 transition hover:bg-fg/10 hover:text-fg"
        >
          ✕
        </button>
      </div>

      {help && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setHelp(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-surface-2 p-6 text-fg shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-black">
              نصب {APP_NAME} روی {help === "ios" ? "آیفون" : "گوشی"}
            </h2>
            {help === "android" ? (
              <ol className="mt-4 space-y-3 text-sm leading-7 text-fg/80">
                <li>
                  ۱. این صفحه را با مرورگر <b>Chrome</b> باز کنید.
                </li>
                <li>
                  ۲. دکمه منو{" "}
                  <span className="inline-block rounded bg-fg/10 px-1.5">
                    ⋮
                  </span>{" "}
                  (سه نقطه بالای صفحه) را بزنید.
                </li>
                <li>
                  ۳. گزینه <b>نصب برنامه</b> (<b dir="ltr">Install app</b>) یا{" "}
                  <b>افزودن به صفحه اصلی</b> (
                  <b dir="ltr">Add to Home screen</b>) را بزنید.
                </li>
                <li>
                  ۴. <b>نصب</b> را تأیید کنید؛ آیکن ماکان بار روی صفحه گوشی
                  ساخته می‌شود.
                </li>
                <li className="text-fg/55">
                  در مرورگر سامسونگ: منو <b>☰</b> ←{" "}
                  <b dir="ltr">Add page to</b> ← <b dir="ltr">Home screen</b>
                </li>
                <li>
                  یا فایل نصبی اپ اندروید را مستقیم دانلود کنید:{" "}
                  <a href="/download/" className="font-bold text-orange-700">
                    صفحه دانلود اپ ←
                  </a>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm leading-7 text-fg/80">
                <li>
                  ۱. این صفحه را با مرورگر <b>Safari</b> باز کنید.
                </li>
                <li>
                  ۲. دکمه <b>اشتراک‌گذاری</b> را بزنید (مربع با فلش رو به بالا{" "}
                  <span className="inline-block rounded bg-fg/10 px-1.5">
                    ⬆️
                  </span>
                  ) پایین یا بالای صفحه.
                </li>
                <li>
                  ۳. گزینه <b dir="ltr">Add to Home Screen</b> را بزنید.
                </li>
                <li>
                  ۴. در پایان <b dir="ltr">Add</b> را بزنید؛ آیکن اپلیکیشن روی
                  صفحه گوشی ساخته می‌شود.
                </li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setHelp(null)}
              className="mt-6 w-full rounded-xl bg-brand py-3 font-bold text-white"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
