import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site";
import { ROUTE_CITIES, routeSlug } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "مسیرهای حمل بار از تهران",
  description:
    "حمل بار، خرده‌بار و بار دربستی از تهران به مشهد، تبریز، اصفهان، شیراز، اهواز و همه‌ی مراکز استان‌ها با ماکان بار.",
  alternates: { canonical: "/haml-bar/" },
};

export default function RoutesIndexPage() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-black leading-[1.5] text-navy sm:text-4xl">
          حمل بار از تهران به همه‌ی شهرها
        </h1>
        <p className="mt-4 max-w-3xl leading-8 text-fg/70">
          ماکان بار خرده‌بار و بار دربستی را از تهران به مراکز همه‌ی استان‌ها و شهرهای اطرافشان
          می‌فرستد. مسیر خود را انتخاب کنید.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ROUTE_CITIES.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/haml-bar/${routeSlug(city)}/`}
                className="block rounded-2xl border border-fg/10 bg-surface-2 p-4 shadow-sm transition hover:border-brand/40"
              >
                <span className="block font-black text-navy">تهران به {city.fa}</span>
                <span className="mt-1 block text-xs text-fg/55">{city.province}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
