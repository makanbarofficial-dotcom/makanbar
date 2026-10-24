"use client";

import { createClient } from "@supabase/supabase-js";
import { SiteFooter, SiteHeader } from "@/components/site";
import { RepresentativesList } from "@/components/representatives-list";
import { PHONES, formatPhone } from "@/lib/contact";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function RepresentativesPage() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-bold text-brand-2">
            شبکه نمایندگان ماکان بار
          </span>
          <h1 className="mt-4 mb-3 text-3xl font-black sm:text-4xl">نمایندگی‌ها</h1>
        </div>

        <RepresentativesList supabase={supabase} />

        <section className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-fg/10 bg-surface-2 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black">می‌خواهید نماینده ماکان بار شوید؟</h2>
            <p className="mt-1 text-sm text-fg/60">با دفتر مرکزی تماس بگیرید.</p>
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
