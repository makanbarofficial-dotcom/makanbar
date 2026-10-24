"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand, Logo } from "@/components/ui";
import { ADDRESS, PHONES, formatPhone } from "@/lib/contact";

const NAV = [
  { label: "خانه", href: "/" },
  { label: "خدمات", href: "/services" },
  { label: "ناوگان", href: "/vehicles" },
  { label: "نمایندگان", href: "/representatives" },
  { label: "درباره ما", href: "/about" },
  { label: "دانلود اپ", href: "/download" },
];


// سربرگ مشترک همه صفحه‌های عمومی سایت
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-fg/10 bg-white/90 shadow-sm shadow-fg/[0.03] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6">
        <Brand subtitle="حمل‌ونقل و جابه‌جایی بار" />

        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-bold text-fg/65 transition hover:bg-surface-3 hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/customer"
            className="hidden rounded-xl bg-brand px-5 py-2.5 text-sm font-black text-white shadow-md shadow-brand/20 transition hover:bg-brand-2 sm:inline-flex"
          >
            ثبت بار
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "بستن منو" : "باز کردن منو"}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-fg/10 bg-surface-2 text-xl lg:hidden"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="ناوبری موبایل"
          className="border-t border-fg/10 bg-white px-4 pb-5 pt-2 shadow-lg lg:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3.5 text-base font-bold text-fg/80 transition hover:bg-surface-3"
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
              className="rounded-xl border border-fg/15 py-3 text-center font-bold text-fg"
            >
              ورود کاربران
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

// پاورقی مشترک همه صفحه‌های عمومی سایت (سرمه‌ای)
export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="leading-tight">
              <span className="block text-base font-black">ماکان بار</span>
              <span className="block text-[11px] text-white/55">حمل‌ونقل و جابه‌جایی بار</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-7 text-white/65">
            حمل دربستی، خرده‌بار، درون‌شهری و پیک موتوری در سراسر ایران. هر روز از ۷ صبح تا ۱۰ شب
            پاسخگوی شما هستیم.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-black text-white">دسترسی سریع</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              ...NAV.filter((item) => item.href !== "/"),
              { label: "ثبت بار", href: "/customer" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/65 transition hover:text-orange-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* data-nosnippet: گوگل این فهرست شماره‌ها را به‌عنوان متن نتیجه‌ی جستجو برندارد */}
        <div data-nosnippet>
          <h2 className="text-sm font-black text-white">تماس با ما</h2>
          <ul className="mt-4 space-y-2.5">
            {PHONES.map((phone) => (
              <li key={phone}>
                <a
                  href={`tel:${phone}`}
                  dir="ltr"
                  className="text-sm text-white/65 transition hover:text-orange-300"
                >
                  {formatPhone(phone)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-black text-white">نشانی</h2>
          <p className="mt-4 text-sm leading-7 text-white/65">{ADDRESS}</p>
          <a
            href="https://instagram.com/maknbar_com"
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
          >
            @maknbar_com ↗
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-white/50 sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} ماکان بار — تمامی حقوق محفوظ است.</span>
          <span>طراحی شده توسط مهندس فراهانی</span>
        </div>
      </div>
    </footer>
  );
}
