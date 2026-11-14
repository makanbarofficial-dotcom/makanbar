"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// بخش «تنظیمات» پنل مدیر؛ مقدارها در جدول app_settings ذخیره می‌شوند
// و توابع پیامک و ثبت‌نام راننده آن‌ها را می‌خوانند.

type Settings = {
  sms_driver_broadcast: boolean;
  sms_driver_assigned: boolean;
  sms_welcome: boolean;
  sms_customer: boolean;
  sms_new_request: boolean;
  sms_new_request_staff: boolean;
  admin_notify_phones: string[];
  welcome_message_customer: string;
  welcome_message_driver: string;
  driver_auto_approve: boolean;
};

const DEFAULT_WELCOME =
  "سلام، ممنونیم که عضو خانواده ماکان بار شدید. هر وقت کاری داشتید در خدمتیم.\nmakanbar.com";

const DEFAULTS: Settings = {
  sms_driver_broadcast: false,
  sms_driver_assigned: true,
  sms_welcome: true,
  sms_customer: true,
  sms_new_request: true,
  sms_new_request_staff: true,
  admin_notify_phones: ["09125573776"],
  welcome_message_customer: DEFAULT_WELCOME,
  welcome_message_driver: DEFAULT_WELCOME,
  driver_auto_approve: true,
};

const SMS_SWITCHES: { key: keyof Settings; title: string; hint: string }[] = [
  {
    key: "sms_new_request",
    title: "پیامک بار جدید برای مدیر",
    hint: "با ثبت هر بار، به شماره‌های مدیر (پایین همین صفحه) پیامک می‌رود.",
  },
  {
    key: "sms_new_request_staff",
    title: "پیامک بار جدید برای متصدی‌ها",
    hint: "با ثبت هر بار، متصدی یا نماینده‌ی همان شهر و متصدی دربستی پیامک می‌گیرند.",
  },
  {
    key: "sms_driver_broadcast",
    title: "پیامک بار جدید برای رانندگان",
    hint: "هر بار یا درخواست ماشین تازه برای همه‌ی رانندگانِ با ماشین مناسب پیامک می‌شود.",
  },
  {
    key: "sms_driver_assigned",
    title: "پیامک «بار به شما واگذار شد»",
    hint: "وقتی متصدی بار را مستقیم به یک راننده می‌دهد، برای همان راننده پیامک می‌رود.",
  },
  {
    key: "sms_customer",
    title: "پیامک‌های صاحب بار",
    hint: "اعلام کرایه، نام و شماره‌ی راننده و تحویل بار برای صاحب بار پیامک می‌شود.",
  },
  {
    key: "sms_welcome",
    title: "پیامک خوش‌آمد بعد از ثبت‌نام",
    hint: "صاحب بار یا راننده‌ی تازه پیامک خوش‌آمد می‌گیرد (متن‌ها پایین همین صفحه).",
  },
];

const WELCOME_FIELDS = [
  ["welcome_message_customer", "✉️ پیامک خوش‌آمد صاحب بار", "بعد از ثبت‌نام صاحب بار تازه فرستاده می‌شود."],
  ["welcome_message_driver", "✉️ پیامک خوش‌آمد راننده", "بعد از ثبت‌نام راننده‌ی تازه فرستاده می‌شود."],
] as const;

function smsParts(text: string) {
  const length = [...text].length;
  return length <= 70 ? 1 : Math.ceil(length / 67);
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-fg/20"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "right-1" : "right-6"}`}
      />
    </button>
  );
}

export function AdminSettings({ supabase }: { supabase: SupabaseClient }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [phonesText, setPhonesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("app_settings")
      .select("key, value")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMessage({ tone: "error", text: "دریافت تنظیمات انجام نشد. صفحه را دوباره باز کنید." });
          return;
        }
        const saved = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
        const loaded = { ...DEFAULTS, ...saved } as Settings;
        // اگر متن جدا هنوز ذخیره نشده بود، متن مشترک قدیمی جایش می‌نشیند
        if (!saved.welcome_message_customer && saved.welcome_message) loaded.welcome_message_customer = String(saved.welcome_message);
        if (!saved.welcome_message_driver && saved.welcome_message) loaded.welcome_message_driver = String(saved.welcome_message);
        setSettings(loaded);
        setPhonesText(loaded.admin_notify_phones.join("\n"));
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (!settings) {
    return (
      <div className="rounded-3xl border border-fg/10 bg-surface-2 p-10 text-center text-fg/55">
        {message?.text ?? "در حال دریافت..."}
      </div>
    );
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    setMessage(null);
  };

  async function save() {
    if (!settings) return;
    const phones = phonesText
      .split(/[\s,،]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const invalid = phones.filter(
      (phone) => !/^(\+98|0098|0)?9\d{9}$/.test(phone.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))))
    );

    if (invalid.length) {
      setMessage({ tone: "error", text: `این شماره‌ها درست نیستند: ${invalid.join("، ")}` });
      return;
    }
    if (!settings.welcome_message_customer.trim() || !settings.welcome_message_driver.trim()) {
      setMessage({ tone: "error", text: "متن پیامک خوش‌آمد خالی است." });
      return;
    }

    setSaving(true);
    const rows = (Object.keys(DEFAULTS) as (keyof Settings)[]).map((key) => {
      const value = settings[key];
      return {
        key,
        value: key === "admin_notify_phones" ? phones : typeof value === "string" ? value.trim() : value,
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    setSaving(false);

    if (error) {
      setMessage({ tone: "error", text: `ذخیره انجام نشد: ${error.message}` });
      return;
    }
    setSettings({ ...settings, admin_notify_phones: phones });
    setMessage({ tone: "ok", text: "تنظیمات ذخیره شد و از همین الان اعمال می‌شود." });
  }

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-2xl font-black">تنظیمات</h3>
        <p className="mt-2 text-sm text-fg/55">تغییرات بعد از زدن «ذخیره» از همان لحظه اعمال می‌شوند.</p>
      </div>

      <div className="rounded-3xl border border-fg/10 bg-surface-2 p-5">
        <p className="mb-4 font-black">📨 پیامک‌ها</p>
        <div className="divide-y divide-fg/10">
          {SMS_SWITCHES.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-bold">{item.title}</p>
                <p className="mt-1 text-xs leading-6 text-fg/55">{item.hint}</p>
              </div>
              <Switch
                checked={Boolean(settings[item.key])}
                onChange={(value) => update(item.key, value as never)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-fg/10 bg-surface-2 p-5">
        <p className="font-black">📱 شماره‌های مدیر برای پیامک بار جدید</p>
        <p className="mt-1 text-xs leading-6 text-fg/55">هر شماره در یک خط. برای هر بار تازه به این شماره‌ها پیامک می‌رود.</p>
        <textarea
          value={phonesText}
          onChange={(e) => {
            setPhonesText(e.target.value);
            setMessage(null);
          }}
          rows={3}
          dir="ltr"
          className="mt-3 w-full rounded-2xl border border-fg/10 bg-surface-3 px-4 py-3 text-sm outline-none focus:border-orange-500"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {WELCOME_FIELDS.map(([key, title, hint]) => (
          <div key={key} className="rounded-3xl border border-fg/10 bg-surface-2 p-5">
            <p className="font-black">{title}</p>
            <p className="mt-1 text-xs leading-6 text-fg/55">{hint}</p>
            <textarea
              value={settings[key]}
              onChange={(e) => update(key, e.target.value)}
              rows={4}
              maxLength={300}
              className="mt-3 w-full rounded-2xl border border-fg/10 bg-surface-3 px-4 py-3 text-sm leading-7 outline-none focus:border-orange-500"
            />
            <p className="mt-1 text-xs text-fg/50">
              {[...settings[key]].length.toLocaleString("fa-IR")} حرف · {smsParts(settings[key]).toLocaleString("fa-IR")} پیامک
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-fg/10 bg-surface-2 p-5">
        <p className="mb-4 font-black">🚚 ثبت‌نام راننده</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold">راننده‌ی تازه خودکار فعال شود</p>
            <p className="mt-1 text-xs leading-6 text-fg/55">
              روشن: راننده بلافاصله بعد از ثبت‌نام می‌تواند بار بپذیرد. خاموش: راننده در «در انتظار تأیید» بخش رانندگان
              می‌ماند تا شما فعالش کنید.
            </p>
          </div>
          <Switch checked={settings.driver_auto_approve} onChange={(value) => update("driver_auto_approve", value)} />
        </div>
      </div>

      {message && (
        <p
          className={`rounded-2xl p-4 text-sm font-bold ${
            message.tone === "ok" ? "bg-emerald-500/10 text-emerald-800" : "bg-red-500/10 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="w-full rounded-2xl bg-orange-500 py-4 font-black text-white transition hover:bg-orange-600 disabled:opacity-50 sm:w-auto sm:px-12"
      >
        {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
      </button>
    </section>
  );
}
