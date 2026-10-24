"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHONES } from "@/lib/contact";
import { ui } from "@/components/ui";
import { cityFa, matchesSearch, provinceFa } from "@/lib/shipments";

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

// فهرست نمایندگان با جستجو، نشانی و شماره‌ها؛ در صفحه‌ی «نمایندگان» و پنل صاحب بار استفاده می‌شود
export function RepresentativesList({ supabase }: { supabase: SupabaseClient }) {
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
  }, [supabase]);

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

  const results = useMemo(
    () =>
      sorted.filter((rep) => {
        const { city, province } = names(rep);
        return matchesSearch(query, [city, province, rep.name, rep.address, rep.phone, rep.mobile]);
      }),
    [sorted, query]
  );

  const provinceCount = new Set(representatives.map((rep) => rep.province)).size;

  return (
    <div>
      {!loading && representatives.length > 0 && (
        <p className="text-center text-sm text-fg/60">
          {representatives.length.toLocaleString("fa-IR")} نمایندگی در{" "}
          {provinceCount.toLocaleString("fa-IR")} استان
        </p>
      )}

      <div className="relative mx-auto mt-4 max-w-xl">
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-fg/55">
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
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-fg/60 hover:bg-fg/10"
          >
            ✕
          </button>
        )}
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {loading &&
          [0, 1].map((key) => (
            <div key={key} className={`${ui.card} h-52 animate-pulse bg-surface-3`} />
          ))}

        {!loading &&
          results.map((rep) => {
            const { city, province } = names(rep);
            const isHeadOffice = rep.city === "tehran";
            const numbers = [rep.mobile, rep.phone].filter((value): value is string => !!value);

            return (
              <article
                key={rep.id}
                className={`flex flex-col rounded-2xl border p-5 shadow-sm sm:p-6 ${
                  isHeadOffice ? "border-brand/40 bg-orange-50" : "border-fg/10 bg-surface-2"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{city}</h2>
                    <p className="mt-1 text-sm text-fg/60">استان {province}</p>
                    {rep.name && <p className="mt-2 text-sm font-bold text-brand-2">{rep.name}</p>}
                  </div>
                  {isHeadOffice && (
                    <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                      دفتر مرکزی
                    </span>
                  )}
                </div>

                {rep.address && (
                  <p className="mt-4 flex gap-2 text-sm leading-7 text-fg/75">
                    <span aria-hidden="true">📍</span>
                    {rep.address}
                  </p>
                )}

                {numbers.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {numbers.map((number) => (
                      <li key={number} className="flex items-center gap-2 text-sm">
                        <span aria-hidden="true">☎️</span>
                        <a href={`tel:${number}`} dir="ltr" className="font-bold text-fg hover:text-brand-2">
                          {number}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                  {numbers[0] && (
                    <a href={`tel:${numbers[0]}`} className={`${ui.btnPrimary} py-3 text-sm`}>
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
              </article>
            );
          })}
      </section>

      {!loading && results.length === 0 && (
        <div className={`${ui.card} mx-auto mt-6 max-w-xl p-8 text-center`}>
          <div className="text-4xl">🏙️</div>
          <h2 className="mt-3 text-lg font-black">
            {query ? `در «${query}» هنوز نمایندگی نداریم` : "هنوز نمایندگی ثبت نشده است"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-fg/60">
            بار شما را از دفتر مرکزی تهران هماهنگ می‌کنیم؛ کافی است تماس بگیرید یا بار را آنلاین
            ثبت کنید.
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
    </div>
  );
}
