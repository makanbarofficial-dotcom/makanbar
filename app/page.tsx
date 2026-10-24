import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site";
import { ADDRESS, PHONES, formatPhone } from "@/lib/contact";

const services = [
  {
    icon: "🚛",
    tone: "bg-orange-100 text-orange-700",
    title: "حمل دربستی",
    text: "کل ظرفیت یک خودرو برای بار شما؛ مستقیم از مبدا تا مقصد.",
  },
  {
    icon: "📦",
    tone: "bg-sky-100 text-sky-700",
    title: "حمل خرده‌بار",
    text: "بار کم‌حجم همراه بارهای دیگر؛ اقتصادی، با متصدی در شهر مقصد.",
  },
  {
    icon: "🏙",
    tone: "bg-violet-100 text-violet-700",
    title: "حمل درون‌شهری",
    text: "جابه‌جایی بار داخل شهر، از باربری یا هر آدرسی که بخواهید.",
  },
  {
    icon: "🛵",
    tone: "bg-emerald-100 text-emerald-700",
    title: "پیک موتوری",
    text: "ارسال فوری بسته‌ها و مدارک کوچک داخل شهر.",
  },
];

const steps = [
  { title: "ثبت بار", text: "مبدا، مقصد و مشخصات بار را در چند دقیقه ثبت کنید." },
  { title: "تعیین کرایه", text: "کرایه را بررسی و برایتان پیامک می‌کنیم." },
  { title: "تعیین راننده", text: "راننده‌ی مناسب بار را می‌پذیرد و مشخصاتش برایتان می‌آید." },
  { title: "تحویل بار", text: "تا رسیدن بار به مقصد، وضعیت آن جلوی چشم شماست." },
];

const highlights = [
  { value: "سراسر کشور", label: "پوشش حمل" },
  { value: "۴ نوع", label: "خدمت حمل" },
  { value: "پیامکی", label: "اطلاع‌رسانی لحظه‌ای" },
  { value: "۷ تا ۲۲", label: "پشتیبانی هر روز" },
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
    title: "رانندگان و پیک‌ها",
    text: "دیدن و پذیرش بار",
    href: "/driver/login",
    secondary: { label: "ثبت‌نام", href: "/driver/register" },
  },
  {
    icon: "🏢",
    title: "متصدیان و نمایندگان",
    text: "مدیریت بارهای شهر",
    href: "/employee/login",
  },
  {
    icon: "📍",
    title: "نمایندگی‌ها",
    text: "نشانی و تلفن شهرها",
    href: "/representatives",
  },
];

const eyebrow = "text-sm font-black text-brand-2";
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

// نمونه‌ی کارت پیگیری بار در هیرو؛ نشان می‌دهد صاحب بار در پنل چه می‌بیند
function TrackingPreview() {
  const timeline = [
    { label: "بار ثبت شد", done: true },
    { label: "کرایه تعیین شد", done: true },
    { label: "راننده در راه است", done: true, active: true },
    { label: "تحویل به مقصد", done: false },
  ];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand/20 via-orange-100 to-sky-100 blur-2xl" />
      <div className="relative rounded-3xl border border-fg/10 bg-white p-5 shadow-2xl shadow-fg/10">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
            دربستی · تریلی
          </span>
          <span className="text-xs text-fg/45">کد ۱۲۸۴</span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="text-center">
            <p className="text-xs text-fg/45">مبدا</p>
            <p className="font-black">تهران</p>
          </div>
          <div className="relative h-0.5 flex-1 bg-gradient-to-l from-brand to-fg/15">
            <span className="absolute -top-3 right-1/2 text-xl">🚛</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-fg/45">مقصد</p>
            <p className="font-black">مشهد</p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          {timeline.map((step) => (
            <li key={step.label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                  step.active
                    ? "bg-brand text-white ring-4 ring-brand/20"
                    : step.done
                      ? "bg-emerald-500 text-white"
                      : "bg-surface-3 text-fg/40"
                }`}
              >
                {step.done && !step.active ? "✓" : ""}
              </span>
              <span className={step.done ? "font-bold" : "text-fg/45"}>{step.label}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
          <span className="text-sm text-emerald-800">کرایه</span>
          <span className="font-black text-emerald-700">۱۵٬۰۰۰٬۰۰۰ تومان</span>
        </div>
      </div>
    </div>
  );
}

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
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-orange-50/60 to-surface">
          <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3 py-1.5 text-xs font-black text-brand-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                ثبت آنلاین بار، ۷ روز هفته
              </span>

              <h1 className="mt-5 text-4xl font-black leading-[1.45] text-navy sm:text-5xl sm:leading-[1.4]">
                بار شما،
                <span className="block text-brand">مأموریت ماست.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-8 text-fg/65 sm:text-lg sm:leading-9">
                حمل دربستی، خرده‌بار، درون‌شهری و پیک موتوری در سراسر ایران. بار را آنلاین ثبت کنید و
                از تعیین کرایه تا تحویل، همه‌چیز را پیامکی دنبال کنید.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/customer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 text-base font-black text-white shadow-xl shadow-brand/25 transition hover:-translate-y-0.5 hover:bg-brand-2"
                >
                  ثبت بار <span aria-hidden="true">←</span>
                </Link>
                <Link
                  href="/driver/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fg/15 bg-white px-8 py-4 text-base font-bold text-fg shadow-sm transition hover:border-fg/25"
                >
                  🚚 راننده یا پیک هستم
                </Link>
              </div>

              <a
                href={`tel:${PHONES[0]}`}
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-fg/60 transition hover:text-brand-2"
              >
                📞 مشاوره و ثبت تلفنی:{" "}
                <span dir="ltr" className="text-fg">
                  {formatPhone(PHONES[0])}
                </span>
              </a>
            </div>

            <TrackingPreview />
          </div>

          {/* نکته‌های کلیدی */}
          <div className="relative mx-auto max-w-6xl px-4 pb-12 sm:px-6">
            <dl className="grid grid-cols-2 gap-3 rounded-3xl border border-fg/10 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-6">
              {highlights.map((item) => (
                <div key={item.label} className="text-center">
                  <dt className="text-lg font-black text-navy sm:text-xl">{item.value}</dt>
                  <dd className="mt-1 text-xs text-fg/55 sm:text-sm">{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* خدمات */}
        <section id="services" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="text-center">
              <p className={eyebrow}>خدمات ماکان بار</p>
              <h2 className={heading}>برای هر باری، روش مناسبش</h2>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {services.map((service) => (
                <article
                  key={service.title}
                  className="group rounded-3xl border border-fg/10 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-fg/5 sm:p-6"
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl sm:h-14 sm:w-14 sm:text-3xl ${service.tone}`}>
                    {service.icon}
                  </span>
                  <h3 className="mt-4 font-black sm:mt-5 sm:text-lg">{service.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-fg/60 sm:text-sm sm:leading-7">{service.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/services" className="text-sm font-black text-brand-2 hover:text-brand">
                آشنایی با همه خدمات ←
              </Link>
            </div>
          </div>
        </section>

        {/* مراحل */}
        <section className="border-y border-fg/10 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="text-center">
              <p className={eyebrow}>چطور کار می‌کند؟</p>
              <h2 className={heading}>از ثبت تا تحویل، در چهار قدم</h2>
            </div>

            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="relative text-center">
                  {index < steps.length - 1 && (
                    <span className="absolute left-0 top-7 hidden h-px w-[calc(50%-2rem)] bg-fg/10 lg:block" />
                  )}
                  {index > 0 && (
                    <span className="absolute right-0 top-7 hidden h-px w-[calc(50%-2rem)] bg-fg/10 lg:block" />
                  )}
                  <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-lg font-black text-white shadow-lg shadow-navy/20">
                    {(index + 1).toLocaleString("fa-IR")}
                  </span>
                  <h3 className="mt-4 font-black">{step.title}</h3>
                  <p className="mx-auto mt-2 max-w-60 text-sm leading-7 text-fg/60">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ورود کاربران */}
        <section id="portals" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="text-center">
              <p className={eyebrow}>ورود کاربران</p>
              <h2 className={heading}>پنل خود را انتخاب کنید</h2>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {portals.map((portal) => (
                <div
                  key={portal.title}
                  className="flex flex-col overflow-hidden rounded-3xl border border-fg/10 bg-white shadow-sm transition hover:border-brand/40 hover:shadow-md"
                >
                  <Link href={portal.href} className="flex-1 p-4 sm:p-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 text-2xl" aria-hidden="true">
                      {portal.icon}
                    </span>
                    <h3 className="mt-4 text-sm font-black sm:text-base">{portal.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-fg/55 sm:text-sm">{portal.text}</p>
                    <span className="mt-3 inline-block text-sm font-black text-brand-2">ورود ←</span>
                  </Link>
                  {portal.secondary && (
                    <Link
                      href={portal.secondary.href}
                      className="border-t border-fg/10 bg-surface/60 px-4 py-3 text-center text-xs font-bold text-fg/65 transition hover:text-brand-2 sm:px-6"
                    >
                      {portal.secondary.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* اپلیکیشن */}
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-navy p-7 text-white sm:p-10">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-black text-orange-300">اپلیکیشن ماکان بار</p>
                <h2 className="mt-2 text-2xl font-black leading-[1.6] sm:text-3xl">همه‌چیز در جیب شما</h2>
                <p className="mt-3 max-w-lg leading-8 text-white/75">
                  ثبت بار، پذیرش بار برای رانندگان و پیگیری لحظه‌ای؛ یک اپ برای صاحبان بار، رانندگان،
                  پیک‌ها و متصدیان.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 font-black text-white transition hover:bg-brand-2"
                >
                  🤖 دانلود برای اندروید
                </Link>
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-bold text-white transition hover:bg-white/15"
                >
                  🍎 نصب روی آیفون
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* دعوت به ثبت */}
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
          <div className="flex flex-col items-start gap-5 rounded-[2rem] bg-gradient-to-l from-brand to-orange-600 p-7 text-white shadow-xl shadow-brand/20 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="text-2xl font-black">آماده ارسال بار هستید؟</h2>
              <p className="mt-2 text-white/85">ثبت بار کمتر از دو دقیقه طول می‌کشد.</p>
            </div>
            <Link
              href="/customer"
              className="rounded-2xl bg-white px-8 py-4 font-black text-orange-600 shadow-lg transition hover:bg-orange-50"
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
