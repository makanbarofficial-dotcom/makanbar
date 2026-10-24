
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Alert, AuthShell, ui } from "@/components/ui";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function normalizePhone(value: string) {
  let phone = normalizeDigits(value).replace(/[\s()-]/g, "");
  if (phone.startsWith("0098")) phone = "+" + phone.slice(2);
  if (phone.startsWith("98")) phone = "+" + phone;
  if (phone.startsWith("09")) phone = "+98" + phone.slice(1);
  if (phone.startsWith("9") && phone.length === 10) phone = "+98" + phone;
  return phone;
}

// هر نقش، توابع ارسال کد و تغییر رمز خودش را دارد؛ تأیید کد برای همه یکی است
const AUDIENCES = {
  customer: {
    badge: "بازیابی رمز صاحب بار",
    loginHref: "/customer/login",
    sendFunction: "customer-send-reset-otp",
    resetFunction: "customer-reset-password",
    minPassword: 8,
  },
  driver: {
    badge: "بازیابی رمز راننده",
    loginHref: "/driver/login",
    sendFunction: "driver-send-reset-otp",
    resetFunction: "driver-reset-password",
    minPassword: 6,
  },
} as const;

export function ForgotPassword({ audience }: { audience: keyof typeof AUDIENCES }) {
  const config = AUDIENCES[audience];
  const minLabel = config.minPassword.toLocaleString("fa-IR");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function callFunction(name: string, body: object) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
      // پیام فارسی تابع داخل بدنه‌ی پاسخ خطاست
      let details = "";
      try {
        const payload = await (error as { context?: Response }).context?.json();
        details = payload?.error || payload?.message || "";
      } catch {
        // بدنه قابل خواندن نبود
      }
      throw new Error(details || "ارتباط با سرور ناموفق بود.");
    }
    if (!data?.success) {
      throw new Error(data?.error || "درخواست انجام نشد.");
    }
    return data;
  }

  async function sendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    const normalizedPhone = normalizePhone(phone);
    if (!/^\+989\d{9}$/.test(normalizedPhone)) {
      setError("شماره موبایل معتبر ایران وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      await callFunction(config.sendFunction, {
        phone: normalizedPhone,
      });
      setPhone(normalizedPhone);
      setStep(2);
      setMessage("اگر شماره ثبت شده باشد، کد بازیابی ارسال می‌شود.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال کد ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    const normalizedOtp = normalizeDigits(otp).trim();
    if (!/^\d{6}$/.test(normalizedOtp)) {
      setError("کد پیامک‌شده باید ۶ رقم باشد.");
      return;
    }

    setLoading(true);
    try {
      const data = await callFunction("customer-verify-reset-otp", {
        phone,
        otp: normalizedOtp,
      });
      setResetToken(data.resetToken);
      setStep(3);
      setMessage("شماره تأیید شد؛ رمز جدید را وارد کنید.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تأیید کد ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < config.minPassword) {
      setError(`رمز عبور باید حداقل ${minLabel} کاراکتر باشد.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("تکرار رمز عبور مطابقت ندارد.");
      return;
    }

    setLoading(true);
    try {
      await callFunction(config.resetFunction, {
        phone,
        resetToken,
        newPassword,
      });
      setStep(4);
      setMessage("رمز عبور با موفقیت تغییر کرد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تغییر رمز ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      badge={config.badge}
      title={
        step === 1
          ? "رمزتان را فراموش کرده‌اید؟"
          : step === 2
            ? "کد تأیید را وارد کنید"
            : step === 3
              ? "رمز جدید بسازید"
              : "رمز شما تغییر کرد"
      }
      subtitle={
        step === 1
          ? "شماره‌ای که با آن ثبت‌نام کرده‌اید را وارد کنید."
          : step === 2
            ? `کد ۶ رقمی پیامک‌شده به ${phone}`
            : undefined
      }
      footer={
        step !== 4 && (
          <Link href={config.loginHref} className={ui.link}>
            بازگشت به ورود
          </Link>
        )
      }
    >
      <div className="space-y-4">
        {step === 1 && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className={ui.label}>
                شماره موبایل
              </label>
              <input
                id="phone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09121234567"
                className={`${ui.input} text-right`}
              />
            </div>
            <button disabled={loading} className={ui.btnPrimary}>
              {loading ? "در حال ارسال..." : "ارسال کد پیامکی"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <input
              aria-label="کد تأیید"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="------"
              className={`${ui.input} text-center text-2xl font-bold tracking-[0.6em]`}
            />
            <button disabled={loading} className={ui.btnPrimary}>
              {loading ? "در حال بررسی..." : "تأیید کد"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setStep(1);
                setOtp("");
                setError("");
                setMessage("");
              }}
              className={ui.btnSecondary}
            >
              تغییر شماره موبایل
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className={ui.label}>
                رمز عبور جدید
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={config.minPassword}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`حداقل ${minLabel} کاراکتر`}
                className={ui.input}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className={ui.label}>
                تکرار رمز عبور جدید
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={config.minPassword}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="رمز عبور را دوباره وارد کنید"
                className={ui.input}
              />
            </div>
            <button disabled={loading} className={ui.btnPrimary}>
              {loading ? "در حال تغییر رمز..." : "ثبت رمز جدید"}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center">
            <div className="text-5xl">✓</div>
            <p className="text-sm text-fg/70">
              حالا می‌توانید با رمز جدید وارد حساب خود شوید.
            </p>
            <Link href={config.loginHref} className={ui.btnPrimary}>
              ورود به حساب
            </Link>
          </div>
        )}

        {message && <Alert tone="success">{message}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </AuthShell>
  );
}
