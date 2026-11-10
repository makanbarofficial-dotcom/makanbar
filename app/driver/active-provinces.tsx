"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert, ui } from "@/components/ui";
import { getProvinces } from "@/lib/shipments";

// استان‌های محل فعالیت راننده؛ بارهای آزاد بر اساس آن فیلتر می‌شوند و مدیر در پنلش می‌بیند
export function ActiveProvinces({
  supabase,
  initial,
  onSaved,
  prompt = false,
}: {
  supabase: SupabaseClient;
  initial: string[] | null;
  onSaved: (provinces: string[]) => void;
  // کارت یادآوری بالای پنل برای راننده‌ای که هنوز استانی انتخاب نکرده
  prompt?: boolean;
}) {
  const provinces = getProvinces();
  const [selected, setSelected] = useState<string[]>(initial ?? []);
  const [open, setOpen] = useState(prompt || !(initial?.length));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const allSelected = selected.length === provinces.length;

  const toggle = (value: string) => {
    setSaved(false);
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  async function save() {
    if (selected.length === 0) {
      setError("حداقل یک استان انتخاب کنید.");
      return;
    }
    setError("");
    setSaving(true);
    const { error: rpcError } = await supabase.rpc("set_my_active_provinces", { p_provinces: selected });
    setSaving(false);
    if (rpcError) {
      setError("ذخیره انجام نشد؛ دوباره تلاش کنید.");
      return;
    }
    setSaved(true);
    setOpen(false);
    onSaved(selected);
  }

  const names = provinces.filter((p) => selected.includes(p.en)).map((p) => p.fa);

  return (
    <section className={`${ui.card} p-5 ${prompt ? "border-orange-400/40 bg-orange-500/[0.06]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black">📍 استان‌های محل فعالیت</h3>
          <p className="mt-1 text-sm leading-7 text-fg/60">
            {prompt
              ? "استان‌هایی را که در آن‌ها بار می‌زنید انتخاب کنید تا بارهای همان استان‌ها را ببینید."
              : names.length
                ? allSelected
                  ? "همه‌ی استان‌ها"
                  : names.join("، ")
                : "هنوز استانی انتخاب نکرده‌اید."}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border border-fg/10 px-4 py-2 text-sm font-bold hover:bg-fg/5"
          >
            ویرایش
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setSelected(allSelected ? [] : provinces.map((p) => p.en));
              }}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                allSelected ? "bg-orange-500 text-white" : "border border-orange-400/50 text-orange-700 hover:bg-orange-500/10"
              }`}
            >
              🇮🇷 همه‌ی ایران
            </button>
            {provinces.map((province) => (
              <button
                key={province.en}
                type="button"
                onClick={() => toggle(province.en)}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                  selected.includes(province.en)
                    ? "bg-orange-500 text-white"
                    : "border border-fg/10 bg-surface-2 text-fg/70 hover:bg-fg/10"
                }`}
              >
                {province.fa}
              </button>
            ))}
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <button type="button" disabled={saving} onClick={() => void save()} className={ui.btnPrimary}>
            {saving ? "در حال ذخیره..." : `ذخیره (${selected.length.toLocaleString("fa-IR")} استان)`}
          </button>
        </div>
      )}

      {saved && !open && <p className="mt-3 text-sm font-bold text-emerald-700">✓ ذخیره شد.</p>}
    </section>
  );
}
