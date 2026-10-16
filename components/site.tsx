"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/ui";
import { ADDRESS, PHONES } from "@/lib/contact";

const NAV = [
  { label: "خانه", href: "/" },
  { label: "خدمات", href: "/services" },
  { label: "ناوگان", href: "/vehicles" },
  { label: "نمایندگان", href: "/representatives" },
  { label: "درباره ما", href: "/about" },
];


// سربرگ مشترک همه صفحه‌های عمومی سایت
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6">
        <Brand subtitle="حمل‌ونقل و جابه‌جایی بار" />

        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/customer"
            className="hidden rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 sm:inline-flex"
          >
            ثبت بار
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "بستن منو" : "باز کردن منو"}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl lg:hidden"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="ناوبری موبایل"
          className="border-t border-white/10 bg-ink px-4 pb-5 pt-2 lg:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3.5 text-base text-white/80 transition hover:bg-white/5"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/customer"
              className="rounded-xl bg-brand py-3 text-center font-bold text-white"
            >
              ثبت بار
            </Link>
            <Link
              href="/#portals"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/15 py-3 text-center font-bold text-white"
            >
              ورود کاربران
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

// پاورقی مشترک همه صفحه‌های عمومی سایت
export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink-2/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <Brand subtitle="حمل‌ونقل و جابه‌جایی بار" />
          <p className="mt-4 max-w-xs text-sm leading-7 text-white/50">
            حمل بار دربستی و خرده‌بار بین تهران و شهرستان‌ها. هر روز از ۷ صبح تا ۱۰ شب
            پاسخگوی شما هستیم.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white/80">تماس با ما</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-1">
            {PHONES.map((phone) => (
              <li key={phone}>
                <a
                  href={`tel:${phone}`}
                  dir="ltr"
                  className="text-sm text-white/55 transition hover:text-brand-2"
                >
                  {phone}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white/80">نشانی</h2>
          <p className="mt-3 text-sm leading-7 text-white/55">{ADDRESS}</p>
          <a
            href="https://instagram.com/maknbar_com"
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="mt-3 inline-block text-sm font-bold text-brand-2 hover:text-brand"
          >
            @maknbar_com ↗
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-white/40 sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} ماکان بار — تمامی حقوق محفوظ است.</span>
          <span>طراحی شده توسط مهندس فراهانی</span>
        </div>
      </div>
    </footer>
  );
}
