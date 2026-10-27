"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert, ui } from "@/components/ui";
import { functionErrorMessage } from "@/lib/supabase";

// ورود با کد یک‌بارمصرف پیامکی برای صاحب بار و راننده (تابع login-otp)

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

const RESEND_SECONDS = 60;

export function OtpLogin({
  supabase,
  role,
  redirectTo,
  initialPhone = "",
}: {
  supabase: SupabaseClient;
  role: "customer" | "driver";
  redirectTo: string;
  initialPhone?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  async function callLoginOtp(body: object) {
    const { data, error } = await supabase.functions.invoke("login-otp", { body: { role, ...body } });
    if (error) throw new Error(await functionErrorMessage(error));
    if (!data?.success) throw new Error(data?.error || "درخواست انجام نشد.");
    return data;
  }

  async function sendCode() {
    setError("");
    setMessage("");

    const normalized = normalizePhone(phone);
    if (!/^\+989\d{9}$/.test(normalized)) {
      setError("شماره موبایل را به‌صورت صحیح وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      await callLoginOtp({ action: "send", phone: normalized });
      setCodeSent(true);
      setCode("");
      setWait(RESEND_SECONDS);
      setMessage("کد ورود پیامک شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال کد ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError("");
    setMessage("");

    const normalizedCode = normalizeDigits(code).trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("کد ورود باید ۶ رقم باشد.");
      return;
    }

    setLoading(true);
    try {
      const data = await callLoginOtp({ action: "verify", phone: normalizePhone(phone), otp: normalizedCode });
      const { error: sessionError } = await supabase.auth.verifyOtp({ token_hash: data.tokenHash, type: "email" });
      if (sessionError) throw new Error("ورود انجام نشد؛ دوباره کد بگیرید.");
      router.replace(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ورود انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void (codeSent ? verifyCode() : sendCode());
      }}
      className="space-y-5"
    >
      <div>
        <label htmlFor="otp-phone" className={ui.label}>
          شماره موبایل
        </label>
        <input
          id="otp-phone"
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setCodeSent(false);
          }}
          placeholder="09121234567"
          className={`${ui.input} text-right`}
        />
      </div>

      {codeSent && (
        <div>
          <label htmlFor="otp-code" className={ui.label}>
            کد پیامک‌شده
          </label>
          <input
            id="otp-code"
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 6))}
            placeholder="------"
            className={`${ui.input} text-center text-2xl font-bold tracking-[0.6em]`}
          />
        </div>
      )}

      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <button type="submit" disabled={loading} className={ui.btnPrimary}>
        {loading
          ? codeSent
            ? "در حال ورود..."
            : "در حال ارسال کد..."
          : codeSent
            ? "ورود به پنل"
            : "دریافت کد ورود"}
      </button>

      {codeSent && (
        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={loading || wait > 0}
          className={ui.btnSecondary}
        >
          {wait > 0 ? `ارسال دوباره تا ${wait.toLocaleString("fa-IR")} ثانیه دیگر` : "ارسال دوباره کد"}
        </button>
      )}
    </form>
  );
}

// دو دکمه‌ی «با رمز عبور» / «با کد پیامکی» بالای فرم ورود
export function LoginModeTabs({
  mode,
  onChange,
}: {
  mode: "password" | "otp";
  onChange: (mode: "password" | "otp") => void;
}) {
  const tab = (value: "password" | "otp", label: string) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
        mode === value ? "bg-surface-2 text-fg shadow-sm" : "text-fg/55 hover:text-fg"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-5 flex gap-1 rounded-xl bg-surface-3 p-1">
      {tab("otp", "ورود با کد پیامکی")}
      {tab("password", "ورود با رمز عبور")}
    </div>
  );
}
