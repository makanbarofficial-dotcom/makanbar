import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site";
import { ADDRESS, PHONES, formatPhone } from "@/lib/contact";
import { ROUTE_CITIES, SERVICE_PAGES, routeSlug } from "@/lib/seo-pages";

// قالب مشترک صفحه‌های مسیر و خدمت؛ داده‌ی ساختاریافته‌ی پرسش‌وپاسخ را هم برای گوگل می‌گذارد
export function SeoLanding({
  badge,
  heading,
  intro,
  points,
  faq,
  breadcrumb,
}: {
  badge: string;
  heading: string;
  intro: string;
  points: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  breadcrumb: { name: string; url: string }[];
}) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumb.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    },
  ];

  return (
    <div className="min-h-screen overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />

      <main>
        <section className="bg-gradient-to-b from-white via-orange-50/60 to-surface">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <nav aria-label="مسیر صفحه" className="text-xs text-fg/55">
              {breadcrumb.map((item, index) => (
                <span key={item.url}>
                  {index > 0 && " / "}
                  {index < breadcrumb.length - 1 ? (
                    <Link href={new URL(item.url).pathname} className="hover:text-brand-2">
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </span>
              ))}
            </nav>

            <span className="mt-5 inline-flex rounded-full border border-brand/20 bg-white px-3 py-1.5 text-xs font-black text-brand-2 shadow-sm">
              {badge}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-[1.5] text-navy sm:text-4xl">{heading}</h1>
            <p className="mt-4 max-w-3xl leading-8 text-fg/70">{intro}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/customer"
                className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3.5 font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-2"
              >
                ثبت آنلاین بار
              </Link>
              <a
                href={`tel:${PHONES[0]}`}
                dir="ltr"
                className="inline-flex items-center justify-center rounded-xl border border-fg/15 bg-surface-2 px-6 py-3.5 font-bold transition hover:bg-surface-3"
              >
                {formatPhone(PHONES[0])}
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {points.map((point) => (
              <div key={point.title} className="rounded-2xl border border-fg/10 bg-surface-2 p-5 shadow-sm">
                <h2 className="font-black text-navy">{point.title}</h2>
                <p className="mt-2 text-sm leading-7 text-fg/65">{point.text}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-12 text-2xl font-black text-navy">مراحل ثبت بار</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-fg/70">
            <li>۱. در پنل صاحبان بار ثبت‌نام کنید یا با کد پیامکی وارد شوید.</li>
            <li>۲. مبدا، مقصد، نوع بار و ماشین مورد نیاز را وارد کنید.</li>
            <li>۳. متصدی مسیر کرایه را اعلام می‌کند و برایتان پیامک می‌شود.</li>
            <li>۴. راننده بار را می‌پذیرد و مشخصاتش برایتان پیامک می‌شود؛ وضعیت را تا تحویل در پنل ببینید.</li>
          </ol>

          <h2 className="mt-12 text-2xl font-black text-navy">پرسش‌های پرتکرار</h2>
          <div className="mt-4 space-y-3">
            {faq.map((item) => (
              <details key={item.q} className="rounded-2xl border border-fg/10 bg-surface-2 p-5">
                <summary className="cursor-pointer font-bold">{item.q}</summary>
                <p className="mt-3 text-sm leading-7 text-fg/65">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-navy p-6 text-white">
            <h2 className="text-xl font-black">دفتر مرکزی ماکان بار</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">{ADDRESS}</p>
            <p className="mt-1 text-sm text-white/70">هر روز از ۷ صبح تا ۱۰ شب</p>
          </div>

          <h2 className="mt-12 text-xl font-black text-navy">خدمات ماکان بار</h2>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {SERVICE_PAGES.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/services/${page.slug}/`}
                  className="inline-block rounded-full border border-fg/10 bg-surface-2 px-4 py-2 hover:border-brand/40 hover:text-brand-2"
                >
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-xl font-black text-navy">ارسال بار از تهران به شهرهای دیگر</h2>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {ROUTE_CITIES.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/haml-bar/${routeSlug(city)}/`}
                  className="inline-block rounded-full border border-fg/10 bg-surface-2 px-4 py-2 hover:border-brand/40 hover:text-brand-2"
                >
                  تهران به {city.fa}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
