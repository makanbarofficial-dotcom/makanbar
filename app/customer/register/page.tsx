"use client";

import { useState } from "react";
import { createSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AuthShell, ui } from "@/components/ui";
import {
  EMPTY_BIRTH_DATE,
  IdentityFields,
  formatBirthDate,
  identityError,
} from "@/components/identity-fields";

const supabase = createSupabase();

const MIN_PASSWORD_LENGTH = 8;

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeIranPhone(phone: string) {
  let value = normalizeDigits(phone)
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (value.startsWith("09")) {
    value = "+98" + value.slice(1);
  } else if (value.startsWith("9")) {
    value = "+98" + value;
  } else if (value.startsWith("0098")) {
    value = "+" + value.slice(2);
  }

  return value;
}

// ایمیل داخلی که فقط برای ورود استفاده می‌شود (کاربر آن را نمی‌بیند).
// باید دقیقاً با قالب تابع customer-verify-otp یکی باشد.
function loginEmailFromPhone(normalizedPhone: string) {
  return `${normalizedPhone.replace("+", "")}@customers.makanbar.com`;
}

// پیام واقعی تابع (مثلاً «این شماره قبلاً ثبت‌نام کرده است») را برمی‌گرداند
async function getFunctionError(error: unknown, fallback: string) {
  try {
    const response = (error as { context?: Response }).context;
    const body = await response?.json();

    if (body?.error) return String(body.error);
    if (body?.message) return String(body.message);
  } catch {
    // اگر پاسخ خوانده نشد، پیام پیش‌فرض نمایش داده می‌شود
  }

  return fallback;
}

export default function CustomerRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [birth, setBirth] = useState(EMPTY_BIRTH_DATE);

  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister() {
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("لطفاً نام و نام خانوادگی را وارد کنید.");
      return;
    }

    if (!phone.trim()) {
      setError("لطفاً شماره موبایل را وارد کنید.");
      return;
    }

    const identityProblem = identityError(nationalCode, birth);
    if (identityProblem) {
      setError(identityProblem);
      return;
    }

    if (!password) {
      setError("لطفاً رمز عبور را وارد کنید.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`);
      return;
    }

    const normalizedPhone = normalizeIranPhone(phone);

    if (
      !normalizedPhone.startsWith("+98") ||
      normalizedPhone.length !== 13
    ) {
      setError("شماره موبایل را به‌صورت صحیح وارد کنید.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "customer-send-otp",
        {
          body: {
            fullName: fullName.trim(),
            phone: normalizedPhone,
            companyName: companyName.trim(),
            address: address.trim(),
            nationalCode,
            birthDate: formatBirthDate(birth),
            password: normalizeDigits(password),
          },
        }
      );

      if (invokeError) {
        console.error("Customer OTP function error:", invokeError);

        setError(
          await getFunctionError(
            invokeError,
            "ارسال کد تأیید انجام نشد. لطفاً دوباره تلاش کنید."
          )
        );

        return;
      }

      if (!data?.success) {
        setError(
          data?.message || data?.error || "ارسال کد تأیید انجام نشد."
        );

        return;
      }

      setOtpStep(true);
      setSuccess("کد تأیید به شماره موبایل شما ارسال شد.");
    } catch (err) {
      console.error(err);
      setError("خطای غیرمنتظره‌ای هنگام ارسال کد رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setSuccess("");

    const normalizedOtp = normalizeDigits(otp).replace(/\s+/g, "").trim();

    if (!normalizedOtp) {
      setError("لطفاً کد تأیید را وارد کنید.");
      return;
    }

    if (!/^\d{6}$/.test(normalizedOtp)) {
      setError("کد تأیید باید ۶ رقمی باشد.");
      return;
    }

    const normalizedPhone = normalizeIranPhone(phone);

    setLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "customer-verify-otp",
        {
          body: {
            phone: normalizedPhone,
            otp: normalizedOtp,
          },
        }
      );

      if (invokeError) {
        console.error("Customer verify OTP error:", invokeError);

        setError(
          await getFunctionError(
            invokeError,
            "تأیید کد انجام نشد. لطفاً دوباره تلاش کنید."
          )
        );

        return;
      }

      if (!data?.success) {
        setError(data?.message || data?.error || "کد تأیید صحیح نیست.");

        return;
      }

      // ورود خودکار بعد از ثبت‌نام
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: loginEmailFromPhone(normalizedPhone),
        password: normalizeDigits(password),
      });

      if (loginError) {
        console.error("Customer auto login error:", loginError);

        setSuccess("ثبت‌نام با موفقیت انجام شد. لطفاً وارد حساب خود شوید.");

        setTimeout(() => {
          router.push("/customer/login");
        }, 1200);

        return;
      }

      setSuccess("ثبت‌نام و ورود با موفقیت انجام شد.");

      setTimeout(() => {
        router.push("/customer");
      }, 500);
    } catch (err) {
      console.error(err);
      setError("خطای غیرمنتظره‌ای هنگام تأیید کد رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      badge="پنل صاحبان بار"
      title={otpStep ? "تأیید شماره موبایل" : "ساخت حساب صاحب بار"}
      subtitle={
        otpStep
          ? "کد ۶ رقمی پیامک‌شده را وارد کنید."
          : "چند ثانیه بیشتر طول نمی‌کشد."
      }
      footer={
        !otpStep && (
          <p>
            قبلاً حساب دارید؟{" "}
            <Link href="/customer/login" className={ui.link}>
              ورود
            </Link>
          </p>
        )
      }
    >
      {!otpStep ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleRegister();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="fullName" className={ui.label}>
              نام و نام خانوادگی
            </label>
            <input
              id="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="مثلاً علی رضایی"
              className={ui.input}
            />
          </div>

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
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="09121234567"
              className={`${ui.input} text-right`}
            />
          </div>

          <IdentityFields
            nationalCode={nationalCode}
            onNationalCodeChange={setNationalCode}
            birth={birth}
            onBirthChange={setBirth}
          />

          <div>
            <label htmlFor="password" className={ui.label}>
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`حداقل ${MIN_PASSWORD_LENGTH} کاراکتر`}
              className={ui.input}
            />
          </div>

          <details className="group rounded-xl border border-fg/10 bg-surface-2 px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-bold text-fg/70">
              <span className="group-open:hidden">＋</span>
              <span className="hidden group-open:inline">－</span> نام شرکت و آدرس
              (اختیاری)
            </summary>
            <div className="mt-4 space-y-4">
              <input
                aria-label="نام شرکت"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="نام شرکت"
                className={ui.input}
              />
              <textarea
                aria-label="آدرس"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="آدرس"
                rows={2}
                className={`${ui.input} resize-none`}
              />
            </div>
          </details>

          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <button type="submit" disabled={loading} className={ui.btnPrimary}>
            {loading ? "در حال ارسال کد..." : "دریافت کد تأیید"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleVerifyOtp();
          }}
          className="space-y-4"
        >
          <p className="text-center text-sm text-fg/60">
            ارسال‌شده به{" "}
            <span dir="ltr" className="font-bold text-brand-2">
              {phone}
            </span>
          </p>

          <input
            aria-label="کد تأیید"
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="------"
            className={`${ui.input} text-center text-2xl font-bold tracking-[0.6em]`}
          />

          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <button type="submit" disabled={loading} className={ui.btnPrimary}>
            {loading ? "در حال بررسی..." : "تأیید و ساخت حساب"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOtpStep(false);
              setOtp("");
              setError("");
              setSuccess("");
            }}
            className={ui.btnSecondary}
          >
            تغییر شماره موبایل
          </button>
        </form>
      )}
    </AuthShell>
  );
}
