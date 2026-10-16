import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site";
import { ADDRESS, PHONES } from "@/lib/contact";

const steps = [
  {
    title: "بار را ثبت کنید",
    text: "مبدا، مقصد و مشخصات بار را در پنل صاحب بار وارد کنید.",
  },
  {
    title: "کرایه تعیین می‌شود",
    text: "کارشناسان ما بار را بررسی می‌کنند و با شما هماهنگ می‌شوند.",
  },
  {
    title: "بار حرکت می‌کند",
    text: "وضعیت بار را تا رسیدن به مقصد در پنل خود دنبال کنید.",
  },
];

const shipmentTypes = [
  {
    icon: "🚛",
    title: "حمل دربستی",
    text: "کل ظرفیت یک خودرو در اختیار بار شما؛ مناسب بارهای حجیم و تجاری.",
    points: ["تریلی، کامیون، خاور و نیسان", "راننده مستقیم از مبدا تا مقصد"],
  },
  {
    icon: "📦",
    title: "حمل خرده‌بار",
    text: "بار کم‌حجم شما همراه بارهای دیگر ارسال می‌شود؛ اقتصادی و سریع.",
    points: ["از تهران به سراسر کشور", "تحویل از طریق متصدی شهر مقصد"],
  },
];

const portals = [
  {
    icon: "📦",
    title: "صاحبان بار",
    text: "ثبت و پیگیری بارها",
    href: "/customer/login",
    secondary: { label: "ثبت‌نام", href: "/customer/register" },
  },
  {
    icon: "🚚",
    title: "رانندگان",
    text: "بارهای آزاد و بارهای من",
    href: "/driver/login",
    secondary: { label: "ثبت‌نام", href: "/driver/register" },
  },
  {
    icon: "🧑‍💼",
    title: "متصدیان",
    text: "مدیریت بارهای شهر شما",
    href: "/employee/login",
  },
  {
    icon: "📍",
    title: "نمایندگی‌ها",
    text: "نشانی نمایندگان در شهرها",
    href: "/representatives",
  },
];

const vehicles = [
  { icon: "🚛", title: "تریلی", text: "بارهای حجیم و سنگین" },
  { icon: "🚚", title: "کامیون", text: "بارهای عمومی" },
  { icon: "🚐", title: "خاور", text: "بارهای حجم متوسط" },
  { icon: "🛻", title: "نیسان", text: "بارهای سبک" },
];

const eyebrow = "text-sm font-bold text-brand-2";
const heading = "mt-2 text-2xl font-black leading-[1.6] sm:text-3xl";

// اطلاعات کسب‌وکار برای گوگل: نام سایت، لوگو، تلفن‌ها و نشانی
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ماکان بار",
    alternateName: ["Makan Bar", "makanbar"],
    url: "https://makanbar.com/",
  },
  {
    "@context": "https://schema.org",
    "@type": "MovingCompany",
    name: "ماکان بار",
    alternateName: "Makan Bar",
    url: "https://makanbar.com/",
    logo: "https://makanbar.com/icon.png",
    image: "https://makanbar.com/logo.png",
    telephone: PHONES[0],
    contactPoint: PHONES.map((telephone) => ({
      "@type": "ContactPoint",
      telephone,
      contactType: "customer service",
      availableLanguage: "fa",
    })),
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS,
      addressLocality: "تهران",
      addressCountry: "IR",
    },
    openingHours: "Mo-Su 07:00-22:00",
    areaServed: "IR",
    sameAs: ["https://instagram.com/maknbar_com"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />

      <main>
        {/* معرفی */}
        <section className="relative">
          <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-bold text-brand-2">
                حمل بار بین تهران و شهرستان‌ها
              </span>

              <h1 className="mt-5 text-4xl font-black leading-[1.45] sm:text-5xl">
                بار شما،
                <span className="block text-brand">مأموریت ماست.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-8 text-white/65">
                بار دربستی یا خرده‌بار خود را آنلاین ثبت کنید؛ بقیه‌اش با ما.
                از ثبت تا تحویل، وضعیت بار همیشه جلوی چشم شماست.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/customer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-7 py-4 text-base font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-2"
                >
                  ثبت بار <span aria-hidden="true">←</span>
                </Link>
                <Link
                  href="/driver/login"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-7 py-4 text-base font-bold text-white transition hover:bg-white/[0.09]"
                >
                  راننده هستم
                </Link>
              </div>
            </div>

            <ol className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <li className="mb-5 text-sm font-bold text-white/50">چطور کار می‌کند؟</li>
              {steps.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < steps.length - 1 && (
                    <span className="absolute right-5 top-11 h-[calc(100%-2.75rem)] w-px bg-white/10" />
                  )}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-black">
                    {(index + 1).toLocaleString("fa-IR")}
                  </span>
                  <div>
                    <h2 className="font-bold">{step.title}</h2>
                    <p className="mt-1 text-sm leading-7 text-white/55">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* نوع حمل */}
        <section id="services" className="scroll-mt-24 border-y border-white/10 bg-ink-2/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <p className={eyebrow}>خدمات ما</p>
            <h2 className={heading}>دو روش ساده برای ارسال بار</h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {shipmentTypes.map((type) => (
                <article
                  key={type.title}
                  className="rounded-2xl border border-white/10 bg-ink p-6 transition hover:border-brand/40"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-2xl">
                    {type.icon}
                  </span>
                  <h3 className="mt-4 text-xl font-black">{type.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/60">{type.text}</p>
                  <ul className="mt-4 space-y-2 text-sm text-white/75">
                    {type.points.map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <span className="text-brand">✓</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <Link href="/services" className="mt-6 inline-block text-sm font-bold text-brand-2 hover:text-brand">
              همه خدمات ←
            </Link>
          </div>
        </section>

        {/* ورود کاربران */}
        <section id="portals" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <p className={eyebrow}>ورود کاربران</p>
            <h2 className={heading}>پنل خود را انتخاب کنید</h2>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {portals.map((portal) => (
                <div
                  key={portal.title}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-brand/40"
                >
                  <Link href={portal.href} className="flex-1 p-4 sm:p-5">
                    <span className="text-3xl" aria-hidden="true">
                      {portal.icon}
                    </span>
                    <h3 className="mt-3 font-black">{portal.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-white/55 sm:text-sm">
                      {portal.text}
                    </p>
                    <span className="mt-3 inline-block text-sm font-bold text-brand-2">
                      ورود ←
                    </span>
                  </Link>
                  {portal.secondary && (
                    <Link
                      href={portal.secondary.href}
                      className="border-t border-white/10 px-4 py-3 text-center text-xs font-bold text-white/60 transition hover:text-white sm:px-5"
                    >
                      {portal.secondary.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ناوگان */}
        <section className="border-t border-white/10 bg-ink-2/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <p className={eyebrow}>ناوگان حمل</p>
            <h2 className={heading}>خودروی مناسب بار شما</h2>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.title}
                  className="rounded-2xl border border-white/10 bg-ink p-4 text-center sm:p-6"
                >
                  <div className="text-4xl sm:text-5xl" aria-hidden="true">
                    {vehicle.icon}
                  </div>
                  <h3 className="mt-3 font-black">{vehicle.title}</h3>
                  <p className="mt-1 text-xs text-white/55 sm:text-sm">{vehicle.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* دعوت به ثبت */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-col items-start gap-5 rounded-3xl bg-gradient-to-l from-brand to-orange-600 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="text-2xl font-black">آماده ارسال بار هستید؟</h2>
              <p className="mt-2 text-white/85">ثبت بار کمتر از دو دقیقه طول می‌کشد.</p>
            </div>
            <Link
              href="/customer"
              className="rounded-xl bg-white px-7 py-4 font-black text-orange-600 transition hover:bg-orange-50"
            >
              ثبت بار ←
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
