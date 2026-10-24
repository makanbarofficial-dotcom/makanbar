"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Brand, Logo } from "@/components/ui";
import { ADDRESS, PHONES, formatPhone } from "@/lib/contact";

const NAV = [
  { label: "خانه", href: "/", icon: "🏠" },
  { label: "خدمات", href: "/services", icon: "🚛" },
  { label: "ناوگان", href: "/vehicles", icon: "🚚" },
  { label: "نمایندگان", href: "/representatives", icon: "📍" },
  { label: "درباره ما", href: "/about", icon: "ℹ️" },
  { label: "دانلود اپ", href: "/download", icon: "📲" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// آیکن منو: سه خط که با باز شدن منو به ضربدر تبدیل می‌شود
function MenuIcon({ open }: { open: boolean }) {
  const line = "absolute right-0 h-0.5 w-5 rounded-full bg-fg transition-all duration-300";
  return (
    <span className="relative block h-4 w-5" aria-hidden="true">
      <span className={`${line} ${open ? "top-[7px] rotate-45" : "top-0"}`} />
      <span className={`${line} top-[7px] ${open ? "opacity-0" : "opacity-100"}`} />
      <span className={`${line} ${open ? "top-[7px] -rotate-45" : "top-[14px] w-3.5"}`} />
    </span>
  );
}

// سربرگ مشترک همه صفحه‌های عمومی سایت
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // وقتی منوی موبایل باز است صفحه‌ی پشت آن اسکرول نشود
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-fg/10 bg-white/90 shadow-sm shadow-fg/[0.03] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6">
        <Brand subtitle="حمل‌ونقل و جابه‌جایی بار" />

        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-surface-3 hover:text-fg ${
                isActive(pathname, item.href) ? "bg-surface-3 text-fg" : "text-fg/65"
              }`}
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
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-fg/10 bg-white shadow-sm transition active:scale-95 lg:hidden"
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>
    </header>

      {/* منوی موبایل: کشوی کناری از سمت راست؛ بیرون از header چون blur هدر جای fixed را به خودش محدود می‌کند */}
      <div
        className={`fixed inset-0 top-16 z-40 sm:top-[72px] lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="بستن منو"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-navy/30 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <nav
          aria-label="ناوبری موبایل"
          className={`absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3.5 text-base font-bold transition ${
                  isActive(pathname, item.href)
                    ? "bg-orange-50 text-brand-2"
                    : "text-fg/80 hover:bg-surface-3"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-3 text-lg">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="space-y-2 border-t border-fg/10 p-4">
            <Link
              href="/customer"
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className="block rounded-2xl bg-brand py-3.5 text-center font-black text-white shadow-md shadow-brand/20"
            >
              ثبت بار
            </Link>
            <Link
              href="/#portals"
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className="block rounded-2xl border border-fg/15 py-3.5 text-center font-bold text-fg"
            >
              ورود کاربران
            </Link>
            <a
              href={`tel:${PHONES[0]}`}
              tabIndex={open ? 0 : -1}
              className="block pt-2 text-center text-sm font-bold text-fg/60"
            >
              📞 <span dir="ltr">{formatPhone(PHONES[0])}</span>
            </a>
          </div>
        </nav>
      </div>
    </>
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
