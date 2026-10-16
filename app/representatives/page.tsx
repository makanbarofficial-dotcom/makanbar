"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site";
import { PHONES, formatPhone } from "@/lib/contact";
import { ui } from "@/components/ui";
import { cityFa, matchesSearch, provinceFa } from "@/lib/shipments";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Representative = {
  id: number;
  name: string | null;
  province: string;
  city: string;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  location_url: string | null;
};

// استان و شهر در دیتابیس با کلید انگلیسی ذخیره می‌شوند؛ برای نمایش و جستجو به فارسی تبدیل می‌شوند
function names(rep: Representative) {
  return {
    city: cityFa(rep.province, rep.city),
    province: provinceFa(rep.province),
  };
}

export default function RepresentativesPage() {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("representatives")
      .select("id, name, province, city, address, phone, mobile, location_url")
      .then(({ data, error }) => {
        if (error) console.error("خطا در دریافت نمایندگان:", error);
        setRepresentatives((data ?? []) as Representative[]);
        setLoading(false);
      });
  }, []);

  const sorted = useMemo(
    () =>
      [...representatives].sort((a, b) => {
        // دفتر مرکزی تهران همیشه اول
        if (a.city === "tehran") return -1;
        if (b.city === "tehran") return 1;
        return names(a).province.localeCompare(names(b).province, "fa");
      }),
    [representatives]
  );

  const query = search.trim();

  const results = useMemo(() => {
    return sorted.filter((rep) => {
      const { city, province } = names(rep);
      return matchesSearch(query, [city, province, rep.name, rep.address]);
    });
  }, [sorted, query]);

  const provinceCount = new Set(representatives.map((rep) => rep.province)).size;

  return (
    <div className="min-h-screen overflow-x-clip">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-bold text-brand-2">
            شبکه نمایندگان ماکان بار
          </span>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">نمایندگی‌ها</h1>
          {!loading && representatives.length > 0 && (
            <p className="mt-3 text-white/60">
              {representatives.length.toLocaleString("fa-IR")} نمایندگی در{" "}
              {provinceCount.toLocaleString("fa-IR")} استان
            </p>
          )}
        </div>

        <div className="relative mx-auto mt-8 max-w-xl">
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-white/40">
            🔍
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="نام شهر یا استان را بنویسید..."
            aria-label="جستجوی نمایندگی"
            className={`${ui.input} py-4 pr-12`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="پاک کردن جستجو"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-white/50 hover:bg-white/10"
            >
              ✕
            </button>
          )}
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {loading &&
            [0, 1].map((key) => (
              <div key={key} className={`${ui.card} h-52 animate-pulse`} />
            ))}

          {!loading &&
            results.map((rep) => {
              const { city, province } = names(rep);
              const isHeadOffice = rep.city === "tehran";

              return (
                <article
                  key={rep.id}
                  className={`flex flex-col rounded-2xl border p-5 sm:p-6 ${
                    isHeadOffice
                      ? "border-brand/40 bg-brand/[0.07]"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{city}</h2>
                      <p className="mt-1 text-sm text-white/50">استان {province}</p>
                      {rep.name && (
                        <p className="mt-2 text-sm font-bold text-brand-2">{rep.name}</p>
                      )}
                    </div>
                    {isHeadOffice && (
                      <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-bold">
                        دفتر مرکزی
                      </span>
                    )}
                  </div>

                  {rep.address && (
                    <p className="mt-4 flex gap-2 text-sm leading-7 text-white/75">
                      <span aria-hidden="true">📍</span>
                      {rep.address}
                    </p>
                  )}

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                    {(rep.mobile || rep.phone) && (
                      <a
                        href={`tel:${rep.mobile || rep.phone}`}
                        className={`${ui.btnPrimary} py-3 text-sm`}
                      >
                        📞 تماس
                      </a>
                    )}
                    {rep.location_url && (
                      <a
                        href={rep.location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${ui.btnSecondary} py-3 text-sm`}
                      >
                        🧭 مسیریابی
                      </a>
                    )}
                  </div>

                  {rep.phone && rep.mobile && (
                    <p className="mt-3 text-center text-xs text-white/45">
                      تلفن ثابت:{" "}
                      <a href={`tel:${rep.phone}`} dir="ltr" className="hover:text-brand-2">
                        {rep.phone}
                      </a>
                    </p>
                  )}
                </article>
              );
            })}
        </section>

        {!loading && results.length === 0 && (
          <div className={`${ui.card} mx-auto max-w-xl p-8 text-center`}>
            <div className="text-4xl">🏙️</div>
            <h2 className="mt-3 text-lg font-black">
              {query ? `در «${query}» هنوز نمایندگی نداریم` : "هنوز نمایندگی ثبت نشده است"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-white/60">
              بار شما را از دفتر مرکزی تهران هماهنگ می‌کنیم؛ کافی است تماس بگیرید یا بار را
              آنلاین ثبت کنید.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <a href={`tel:${PHONES[0]}`} className={`${ui.btnPrimary} py-3 text-sm`}>
                📞 تماس با دفتر مرکزی
              </a>
              <Link href="/customer" className={`${ui.btnSecondary} py-3 text-sm`}>
                ثبت بار
              </Link>
            </div>
          </div>
        )}

        <section className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-ink-2/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black">می‌خواهید نماینده ماکان بار شوید؟</h2>
            <p className="mt-1 text-sm text-white/60">با دفتر مرکزی تماس بگیرید.</p>
          </div>
          <a href={`tel:${PHONES[0]}`} dir="ltr" className="font-black text-brand-2 hover:text-brand">
            {formatPhone(PHONES[0])}
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
