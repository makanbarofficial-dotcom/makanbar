import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata: Metadata = {
  title: "دانلود اپلیکیشن",
  description:
    "دانلود مستقیم اپلیکیشن اندروید ماکان بار برای صاحبان بار، رانندگان، پیک‌ها و متصدیان.",
};

// فایل اپ اندروید (همان نسخه‌ی کافه‌بازار) که مستقیم از سایت دانلود و نصب می‌شود
const APK = "/download/makanbar.apk";

const ANDROID_STEPS = [
  "دکمه‌ی «دانلود اپلیکیشن اندروید» را بزنید.",
  "بعد از دانلود، روی فایل makanbar.apk بزنید (از اعلان دانلود یا پوشه‌ی Download).",
  "اگر گوشی پرسید «نصب از منابع ناشناس»، گزینه‌ی «اجازه دادن» یا «Allow from this source» را بزنید.",
  "«نصب» (Install) را بزنید؛ آیکن ماکان بار روی صفحه‌ی گوشی ساخته می‌شود.",
];

export default function DownloadPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-ink text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 py-14 text-center sm:py-20">
        <div className="inline-flex rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300">
          اپلیکیشن ماکان بار
        </div>
        <h1 className="mt-6 text-3xl font-black leading-[1.5] sm:text-4xl">
          ماکان بار را روی گوشی
          <span className="block text-orange-500">نصب کنید</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl leading-8 text-slate-300">
          یک اپ برای همه: صاحبان بار، رانندگان، پیک‌های موتوری و متصدیان. ثبت بار، پذیرش بار و
          پیگیری تا تحویل، همه در یک جا.
        </p>

        <a
          href={APK}
          download="makanbar.apk"
          className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-orange-500 px-8 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
        >
          <span className="text-2xl">🤖</span>
          دانلود اپلیکیشن اندروید
        </a>
        <p className="mt-3 text-xs text-white/40">حجم حدود ۱٫۵ مگابایت · اندروید ۵ به بالا</p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-5 px-5 pb-20 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-black">🤖 نصب روی اندروید</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-white/75">
            {ANDROID_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-black text-orange-300">
                  {(index + 1).toLocaleString("fa-IR")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-black">🍎 نصب روی آیفون</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-white/75">
            {[
              "سایت makanbar.com را با مرورگر Safari باز کنید.",
              "دکمه‌ی اشتراک‌گذاری ⬆️ را بزنید.",
              "گزینه‌ی «Add to Home Screen» و بعد «Add» را بزنید.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-black text-orange-300">
                  {(index + 1).toLocaleString("fa-IR")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Link href="/app" className="mt-5 inline-block text-sm font-bold text-orange-300">
            ورود به اپ تحت وب ←
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
