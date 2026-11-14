"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DriverRating = { stars: number; comment: string | null };

// صاحب بار بعد از تحویل بار به راننده ۱ تا ۵ ستاره می‌دهد (تابع rate_driver در دیتابیس)
export function RateDriver({
  supabase,
  requestId,
  initial,
  onSaved,
}: {
  supabase: SupabaseClient;
  requestId: number;
  initial: DriverRating | undefined;
  onSaved: (rating: DriverRating) => void;
}) {
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [editing, setEditing] = useState(!initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (stars < 1) {
      setError("تعداد ستاره را انتخاب کنید.");
      return;
    }
    setError("");
    setSaving(true);
    const { error: rpcError } = await supabase.rpc("rate_driver", {
      p_request_id: requestId,
      p_stars: stars,
      p_comment: comment.trim() || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message || "ثبت امتیاز انجام نشد.");
      return;
    }
    setEditing(false);
    onSaved({ stars, comment: comment.trim() || null });
  }

  if (!editing && initial) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm">
        <span>
          امتیاز شما به راننده: <b className="text-amber-600">{"★".repeat(initial.stars)}</b>
          <span className="text-fg/30">{"★".repeat(5 - initial.stars)}</span>
          {initial.comment && <span className="mr-2 text-fg/60">«{initial.comment}»</span>}
        </span>
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-fg/60 hover:text-fg">
          ویرایش
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.07] p-4">
      <p className="text-sm font-black">⭐ به راننده‌ی این بار امتیاز بدهید</p>
      <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStars(value)}
            aria-label={`${value} ستاره`}
            className={`text-3xl leading-none transition ${value <= stars ? "text-amber-500" : "text-fg/20 hover:text-amber-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder="نظر شما درباره‌ی راننده (اختیاری)"
        className="w-full resize-none rounded-xl border border-fg/10 bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-fg/40 focus:border-amber-400"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? "..." : "ثبت امتیاز"}
        </button>
        {initial && (
          <button type="button" onClick={() => setEditing(false)} className="px-3 text-sm text-fg/60">
            انصراف
          </button>
        )}
      </div>
    </div>
  );
}

// نمایش میانگین امتیاز راننده، مثلاً «★ ۴٫۵ (۱۲ نظر)»
export function RatingBadge({ average, total }: { average: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-700">
      ★ {Number(average).toLocaleString("fa-IR")}
      <span className="font-bold text-amber-700/70">({total.toLocaleString("fa-IR")} نظر)</span>
    </span>
  );
}

// میانگین امتیاز چند راننده (مدیر، متصدی یا خود راننده)
export async function loadRatingSummary(supabase: SupabaseClient, driverIds: string[]) {
  if (driverIds.length === 0) return {} as Record<string, { average: number; total: number }>;
  const { data, error } = await supabase.rpc("driver_rating_summary", { p_driver_ids: driverIds });
  if (error) {
    console.error("Rating summary error:", error.message);
    return {} as Record<string, { average: number; total: number }>;
  }
  return Object.fromEntries(
    ((data ?? []) as { driver_id: string; average: number; total: number }[]).map((row) => [
      row.driver_id,
      { average: Number(row.average), total: row.total },
    ])
  );
}
