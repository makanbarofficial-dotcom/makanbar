"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "makanbar-install-dismissed";

// نوار «نصب اپلیکیشن» بالای هر پنل؛ در اندروید پنجره نصب مرورگر را باز می‌کند
// و در آیفون (که دکمه نصب ندارد) راهنمای «Add to Home Screen» را نشان می‌دهد.
export function InstallApp({ appName }: { appName: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(`${DISMISS_KEY}:${appName}`) === "1";
    } catch {}
    if (dismissed) return;

    const ua = navigator.userAgent;
    const ios =
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) {
      setIsIos(true);
      setHidden(false);
    }

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
  }, [appName]);

  function dismiss() {
    try {
      localStorage.setItem(`${DISMISS_KEY}:${appName}`, "1");
    } catch {}
    setHidden(true);
  }

  async function install() {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }
    if (!prompt) return;

    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    if (choice.outcome === "accepted") setHidden(true);
  }

  if (hidden) return null;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 bg-ink-2 px-4 py-2.5 text-sm text-white">
        <span className="text-lg">📲</span>
        <p className="flex-1 leading-6">
          اپلیکیشن <b>{appName}</b> را روی گوشی نصب کنید
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
          className="rounded-lg px-2 py-1 text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-ink-2 p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-black">نصب {appName} روی آیفون</h2>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-white/80">
              <li>
                ۱. این صفحه را با مرورگر <b>Safari</b> باز کنید.
              </li>
              <li>
                ۲. دکمه <b>اشتراک‌گذاری</b> را بزنید (مربع با فلش رو به بالا{" "}
                <span className="inline-block rounded bg-white/10 px-1.5">⬆️</span>) پایین یا
                بالای صفحه.
              </li>
              <li>
                ۳. گزینه <b dir="ltr">Add to Home Screen</b> را بزنید.
              </li>
              <li>
                ۴. در پایان <b dir="ltr">Add</b> را بزنید؛ آیکن اپلیکیشن روی صفحه گوشی
                ساخته می‌شود.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
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
