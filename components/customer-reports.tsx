"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate } from "@/lib/shipments";

// بخش «گزارش و شکایت» پنل صاحب بار؛ مدیر در بخش «📣 گزارش‌ها» پنل مدیر جواب می‌دهد
export type ReportStatus = "new" | "reviewing" | "done";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  new: "ثبت شد",
  reviewing: "در حال بررسی",
  done: "رسیدگی شد",
};

export const REPORT_STATUS_TONES: Record<ReportStatus, string> = {
  new: "bg-orange-500/15 text-orange-700",
  reviewing: "bg-sky-500/15 text-sky-700",
  done: "bg-emerald-500/15 text-emerald-700",
};

export const REPORT_SUBJECTS = [
  "تأخیر در بارگیری یا تحویل",
  "رفتار راننده",
  "خسارت یا کسری بار",
  "کرایه و پرداخت",
  "مشکل در سایت",
  "پیشنهاد",
  "سایر",
];

type Report = {
  id: number;
  created_at: string;
  request_id: number | null;
  subject: string;
  message: string;
  status: ReportStatus;
  admin_reply: string | null;
};

export function CustomerReports({
  supabase,
  profile,
  requests,
}: {
  supabase: SupabaseClient;
  profile: { full_name: string | null; phone: string | null } | null;
  requests: { id: number; origin: string; destination: string }[];
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(REPORT_SUBJECTS[0]);
  const [requestId, setRequestId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("customer_reports")
      .select("id, created_at, request_id, subject, message, status, admin_reply")
      .order("created_at", { ascending: false });
    setReports((data ?? []) as Report[]);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (message.trim().length < 5) {
      setError("توضیح گزارش را کامل‌تر بنویسید.");
      return;
    }
    setError("");
    setSaving(true);
    const { error: insertError } = await supabase.from("customer_reports").insert({
      full_name: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      request_id: requestId ? Number(requestId) : null,
      subject,
      message: message.trim(),
    });
    setSaving(false);
    if (insertError) {
      setError("ثبت گزارش انجام نشد؛ دوباره تلاش کنید.");
      return;
    }
    setMessage("");
    setRequestId("");
    setOpen(false);
    setNotice("گزارش شما ثبت شد. پاسخ مدیریت همین‌جا نمایش داده می‌شود.");
    void load();
  }

  return (
    <section className="rounded-2xl border border-fg/10 bg-surface-2 p-4 sm:rounded-3xl sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black">📣 گزارش و شکایت</h3>
          <p className="mt-1 text-xs leading-6 text-fg/55">
            اگر از راننده، بار یا خدمات ماکان بار گلایه یا پیشنهادی دارید، اینجا بنویسید.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setNotice("");
            }}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white transition hover:bg-orange-600"
          >
            ثبت گزارش تازه
          </button>
        )}
      </div>

      {notice && <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-800">{notice}</p>}

      {open && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-fg/70">
            موضوع
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-2 w-full rounded-xl border border-fg/10 bg-surface-3 px-3 py-2.5 text-sm outline-none focus:border-orange-500"
            >
              {REPORT_SUBJECTS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          {requests.length > 0 && (
            <label className="block text-sm text-fg/70">
              مربوط به کدام بار؟ (اختیاری)
              <select
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-fg/10 bg-surface-3 px-3 py-2.5 text-sm outline-none focus:border-orange-500"
              >
                <option value="">هیچ‌کدام</option>
                {requests.map((item) => (
                  <option key={item.id} value={item.id}>
                    کد {item.id.toLocaleString("fa-IR", { useGrouping: false })} · {item.origin} ← {item.destination}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm text-fg/70">
            توضیحات
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="ماجرا را بنویسید..."
              className="mt-2 w-full resize-none rounded-xl border border-fg/10 bg-surface-3 px-3 py-2.5 text-sm leading-7 outline-none placeholder:text-fg/40 focus:border-orange-500"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "در حال ثبت..." : "ثبت گزارش"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-fg/60">
              انصراف
            </button>
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="mt-4 space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl bg-surface-3 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{report.subject}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${REPORT_STATUS_TONES[report.status]}`}>
                  {REPORT_STATUS_LABELS[report.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-fg/50">
                {formatDate(report.created_at)}
                {report.request_id ? ` · بار کد ${report.request_id.toLocaleString("fa-IR", { useGrouping: false })}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-line leading-7 text-fg/80">{report.message}</p>
              {report.admin_reply && (
                <p className="mt-2 whitespace-pre-line rounded-lg bg-sky-500/10 p-2.5 leading-7 text-sky-900">
                  <b>پاسخ ماکان بار: </b>
                  {report.admin_reply}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
