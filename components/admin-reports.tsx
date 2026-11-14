"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CallButton } from "@/components/call-button";
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONES, type ReportStatus } from "@/components/customer-reports";
import { formatDate } from "@/lib/shipments";

// بخش «📣 گزارش‌ها» پنل مدیر: گزارش و شکایت صاحبان بار؛ پاسخ مدیر در پنل همان صاحب بار دیده می‌شود
type Report = {
  id: number;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  request_id: number | null;
  subject: string;
  message: string;
  status: ReportStatus;
  admin_reply: string | null;
};

const FILTERS: { id: ReportStatus | "open" | "all"; label: string }[] = [
  { id: "open", label: "رسیدگی‌نشده" },
  { id: "done", label: "رسیدگی‌شده" },
  { id: "all", label: "همه" },
];

export function AdminReports({ supabase }: { supabase: SupabaseClient }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<ReportStatus | "open" | "all">("open");
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("customer_reports")
      .select("id, created_at, full_name, phone, request_id, subject, message, status, admin_reply")
      .order("created_at", { ascending: false });
    if (error) console.error("Reports error:", error.message);
    const list = (data ?? []) as Report[];
    setReports(list);
    setReplies(Object.fromEntries(list.map((report) => [report.id, report.admin_reply ?? ""])));
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(report: Report, status: ReportStatus) {
    setSavingId(report.id);
    const admin_reply = replies[report.id]?.trim() || null;
    const { error } = await supabase
      .from("customer_reports")
      .update({ status, admin_reply, updated_at: new Date().toISOString() })
      .eq("id", report.id);
    setSavingId(null);
    if (error) {
      alert(`ذخیره انجام نشد: ${error.message}`);
      return;
    }
    setReports((current) =>
      (current ?? []).map((item) => (item.id === report.id ? { ...item, status, admin_reply } : item))
    );
  }

  if (!reports) {
    return <div className="rounded-3xl border border-fg/10 bg-surface-2 p-10 text-center text-fg/55">در حال دریافت...</div>;
  }

  const visible = reports.filter((report) =>
    filter === "all" ? true : filter === "open" ? report.status !== "done" : report.status === filter
  );
  const openCount = reports.filter((report) => report.status !== "done").length;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black">گزارش و شکایت صاحبان بار</h3>
          <p className="mt-2 text-sm text-fg/55">
            {openCount.toLocaleString("fa-IR")} گزارش رسیدگی‌نشده. پاسخ شما در پنل همان صاحب بار نمایش داده می‌شود.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-2xl border border-fg/10 px-4 py-2.5 text-sm font-bold text-fg/70 hover:bg-fg/5"
        >
          بروزرسانی
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              filter === item.id ? "bg-fg text-white" : "border border-fg/10 bg-surface-2 text-fg/70 hover:bg-fg/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="rounded-3xl border border-fg/10 bg-surface-2 p-10 text-center text-fg/55">گزارشی در این بخش نیست.</div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((report) => (
          <article key={report.id} className="rounded-3xl border border-fg/10 bg-surface-2 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-black">{report.subject}</p>
                <p className="mt-1 text-xs text-fg/50">
                  {formatDate(report.created_at)}
                  {report.request_id
                    ? ` · بار کد ${report.request_id.toLocaleString("fa-IR", { useGrouping: false })}`
                    : ""}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${REPORT_STATUS_TONES[report.status]}`}>
                {REPORT_STATUS_LABELS[report.status]}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold">{report.full_name || "صاحب بار"}</span>
              {report.phone && <CallButton phone={report.phone} />}
            </div>

            <p className="mt-3 whitespace-pre-line rounded-2xl bg-surface-3 p-3 text-sm leading-7">{report.message}</p>

            <textarea
              value={replies[report.id] ?? ""}
              onChange={(event) => setReplies((current) => ({ ...current, [report.id]: event.target.value }))}
              rows={2}
              maxLength={2000}
              placeholder="پاسخ به صاحب بار (اختیاری)"
              className="mt-3 w-full resize-none rounded-2xl border border-fg/10 bg-surface-3 px-3 py-2 text-sm leading-7 outline-none placeholder:text-fg/40 focus:border-orange-500"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingId === report.id}
                onClick={() => void save(report, "reviewing")}
                className="rounded-xl border border-sky-400/40 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-500/10 disabled:opacity-50"
              >
                در حال بررسی
              </button>
              <button
                type="button"
                disabled={savingId === report.id}
                onClick={() => void save(report, "done")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                ✓ رسیدگی شد
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
