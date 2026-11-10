"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { functionErrorMessage } from "@/lib/supabase";
import { STAFF_KIND_LABELS, VEHICLE_BODY_TYPES, formatDate, type StaffKind } from "@/lib/shipments";

// بخش «پیامک» پنل مدیر: پیامک دلخواه به رانندگان، صاحبان بار، متصدی‌ها یا شماره‌های دلخواه
// (ارسال با تابع admin-send-sms؛ تاریخچه در admin_sms_log)

type Preview = { count: number; parts: number; invalid: string[]; credit: number | null };
type LogRow = {
  id: number;
  created_at: string;
  message: string;
  audience: string | null;
  recipients: number;
  sent: number;
  failed: number;
  finished_at: string | null;
};

const VEHICLE_TYPES = Object.keys(VEHICLE_BODY_TYPES);
const STAFF_KINDS = Object.keys(STAFF_KIND_LABELS) as StaffKind[];

function smsParts(message: string) {
  const length = [...message].length;
  if (!length) return 0;
  return length <= 70 ? 1 : Math.ceil(length / 67);
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
        active ? "bg-orange-500 text-white" : "border border-fg/10 bg-surface-2 text-fg/70 hover:bg-fg/10"
      }`}
    >
      {children}
    </button>
  );
}

export function AdminSms({ supabase }: { supabase: SupabaseClient }) {
  const [drivers, setDrivers] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [customers, setCustomers] = useState(false);
  const [staff, setStaff] = useState(false);
  const [staffKinds, setStaffKinds] = useState<StaffKind[]>([]);
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState<(Preview & { key: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logs, setLogs] = useState<LogRow[]>([]);

  const selection = useMemo(
    () => ({ drivers, vehicleTypes, customers, staff, staffKinds, numbers }),
    [drivers, vehicleTypes, customers, staff, staffKinds, numbers]
  );

  // شمارش فقط برای همان انتخاب گیرندگان معتبر است؛ با تغییر انتخاب دوباره باید بررسی شود
  const selectionKey = JSON.stringify(selection);
  const preview = checked?.key === selectionKey ? checked : null;

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from("admin_sms_log")
      .select("id, created_at, message, audience, recipients, sent, failed, finished_at")
      .order("created_at", { ascending: false })
      .limit(15);
    setLogs((data ?? []) as LogRow[]);
  }, [supabase]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  async function call(action: "preview" | "send") {
    const { data, error: invokeError } = await supabase.functions.invoke("admin-send-sms", {
      body: { action, message, ...selection },
    });
    if (invokeError) throw new Error(await functionErrorMessage(invokeError, "ارتباط با سرور پیامک برقرار نشد."));
    if (!data?.success) throw new Error(data?.error || "درخواست انجام نشد.");
    return data;
  }

  async function check() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      setChecked({ ...((await call("preview")) as Preview), key: selectionKey });
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : String(checkError));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!preview) return;
    const total = preview.count * smsParts(message);
    if (
      !confirm(
        `پیامک برای ${preview.count.toLocaleString("fa-IR")} نفر فرستاده شود؟\n` +
          `(${smsParts(message).toLocaleString("fa-IR")} پیامک برای هر نفر؛ جمعاً ${total.toLocaleString("fa-IR")} پیامک)\n\n` +
          message
      )
    ) {
      return;
    }

    setError("");
    setBusy(true);
    try {
      const data = await call("send");
      setNotice(
        `ارسال برای ${Number(data.queued).toLocaleString("fa-IR")} نفر شروع شد. نتیجه چند دقیقه بعد در «پیامک‌های قبلی» دیده می‌شود.`
      );
      setMessage("");
      setChecked(null);
      void loadLogs();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setBusy(false);
    }
  }

  const parts = smsParts(message);
  const nothingSelected = !drivers && !customers && !staff && !numbers.trim();

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-2xl font-black">ارسال پیامک</h3>
        <p className="mt-2 text-sm text-fg/55">
          گیرندگان را انتخاب کنید، متن را بنویسید، «بررسی تعداد» را بزنید و بعد ارسال کنید.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-fg/10 bg-surface-2 p-5">
          <p className="font-black">۱. گیرندگان</p>

          <div className="space-y-2 rounded-2xl bg-surface-3 p-4">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={drivers} onChange={(e) => setDrivers(e.target.checked)} className="h-4 w-4 accent-orange-500" />
              🚚 رانندگان فعال
            </label>
            {drivers && (
              <div className="flex flex-wrap gap-2 pr-6">
                <Chip active={vehicleTypes.length === 0} onClick={() => setVehicleTypes([])}>
                  همه‌ی ماشین‌ها
                </Chip>
                {VEHICLE_TYPES.map((type) => (
                  <Chip key={type} active={vehicleTypes.includes(type)} onClick={() => setVehicleTypes((list) => toggle(list, type))}>
                    {type}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-surface-3 p-4">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={customers} onChange={(e) => setCustomers(e.target.checked)} className="h-4 w-4 accent-orange-500" />
              👥 همه‌ی صاحبان بار
            </label>
          </div>

          <div className="space-y-2 rounded-2xl bg-surface-3 p-4">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={staff} onChange={(e) => setStaff(e.target.checked)} className="h-4 w-4 accent-orange-500" />
              👤 متصدی‌ها و نماینده‌ها
            </label>
            {staff && (
              <div className="flex flex-wrap gap-2 pr-6">
                <Chip active={staffKinds.length === 0} onClick={() => setStaffKinds([])}>
                  همه
                </Chip>
                {STAFF_KINDS.map((kind) => (
                  <Chip key={kind} active={staffKinds.includes(kind)} onClick={() => setStaffKinds((list) => toggle(list, kind))}>
                    {STAFF_KIND_LABELS[kind]}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">📱 شماره‌های دلخواه (اختیاری)</p>
            <textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              rows={3}
              dir="ltr"
              placeholder={"09121234567\n09351234567"}
              className="w-full rounded-2xl border border-fg/10 bg-surface-3 px-4 py-3 text-sm outline-none placeholder:text-fg/40 focus:border-orange-500"
            />
            <p className="mt-1 text-xs text-fg/50">هر شماره در یک خط (یا با فاصله جدا کنید).</p>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-fg/10 bg-surface-2 p-5">
          <p className="font-black">۲. متن پیامک</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            maxLength={500}
            placeholder="مثلاً: سلام، ماکان بار ..."
            className="w-full rounded-2xl border border-fg/10 bg-surface-3 px-4 py-3 leading-7 outline-none placeholder:text-fg/40 focus:border-orange-500"
          />
          <p className="text-xs text-fg/55">
            {[...message].length.toLocaleString("fa-IR")} حرف · {parts.toLocaleString("fa-IR")} پیامک برای هر نفر
            {parts > 1 && " (متن بیشتر از ۷۰ حرف، چند پیامک حساب می‌شود)"}
          </p>

          <button
            type="button"
            disabled={busy || nothingSelected}
            onClick={() => void check()}
            className="w-full rounded-2xl border border-orange-400/50 py-3 font-bold text-orange-700 transition hover:bg-orange-500/10 disabled:opacity-50"
          >
            {busy && !preview ? "در حال بررسی..." : "بررسی تعداد گیرندگان"}
          </button>

          {preview && (
            <div className="space-y-1 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-800">
              <p className="font-black">گیرندگان: {preview.count.toLocaleString("fa-IR")} نفر</p>
              {parts > 0 && (
                <p>جمع پیامک‌ها: {(preview.count * parts).toLocaleString("fa-IR")}</p>
              )}
              {preview.credit != null && <p>اعتبار پنل پیامک: {preview.credit.toLocaleString("fa-IR")}</p>}
              {preview.invalid.length > 0 && (
                <p className="text-red-700">شماره‌های نادرست (فرستاده نمی‌شوند): {preview.invalid.join("، ")}</p>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={busy || !preview || preview.count === 0 || !message.trim()}
            onClick={() => void send()}
            className="w-full rounded-2xl bg-orange-500 py-4 font-black text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            📨 ارسال پیامک
          </button>

          {error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-800">{notice}</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-fg/10 bg-surface-2 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-black">پیامک‌های قبلی</p>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="rounded-xl border border-fg/10 px-3 py-2 text-xs font-bold text-fg/70 hover:bg-fg/5"
          >
            بروزرسانی
          </button>
        </div>
        {logs.length === 0 && <p className="py-4 text-center text-sm text-fg/50">هنوز پیامکی از این بخش فرستاده نشده است.</p>}
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl bg-surface-3 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg/55">
                <span>
                  {formatDate(log.created_at)} · {log.audience}
                </span>
                <span className={log.finished_at ? "font-bold text-emerald-700" : "font-bold text-orange-700"}>
                  {log.finished_at ? "تمام شد" : "در حال ارسال"} · موفق {log.sent.toLocaleString("fa-IR")} از{" "}
                  {log.recipients.toLocaleString("fa-IR")}
                  {log.failed > 0 && ` · ناموفق ${log.failed.toLocaleString("fa-IR")}`}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line leading-7">{log.message}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
