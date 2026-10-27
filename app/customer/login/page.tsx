"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabase } from "@/lib/supabase";
import Link from "next/link";
import { Alert, AuthShell, ui } from "@/components/ui";
import { LoginModeTabs, OtpLogin } from "@/components/otp-login";

const supabase = createSupabase();

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

// دقیقاً مثل صفحه ثبت‌نام: 09121234567 → +989121234567
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
  } else if (value.startsWith("98")) {
    value = "+" + value;
  }

  return value;
}

// ایمیل داخلی که فقط برای ورود استفاده می‌شود (کاربر آن را نمی‌بیند).
// باید دقیقاً با قالب تابع customer-verify-otp یکی باشد.
function loginEmailFromPhone(normalizedPhone: string) {
  return `${normalizedPhone.replace("+", "")}@customers.makanbar.com`;
}

export default function CustomerLoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!phone.trim() || !password) {
      setError("شماره تماس و رمز عبور را وارد کنید.");
      return;
    }

    const normalizedPhone = normalizeIranPhone(phone);

    if (!/^\+989\d{9}$/.test(normalizedPhone)) {
      setError("شماره موبایل را به‌صورت صحیح وارد کنید.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: loginEmailFromPhone(normalizedPhone),
        password,
      });

      if (loginError) {
        console.error("Customer login error:", loginError);
        setError(
          loginError.code === "invalid_credentials"
            ? "شماره موبایل یا رمز عبور اشتباه است."
            : "ورود انجام نشد؛ اتصال اینترنت را بررسی کنید و دوباره تلاش کنید."
        );
        return;
      }

      router.replace("/customer");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      badge="پنل صاحبان بار"
      title="خوش برگشتید"
      subtitle="برای ثبت و پیگیری بارها وارد حساب خود شوید."
      footer={
        <p>
          هنوز حساب ندارید؟{" "}
          <Link href="/customer/register" className={ui.link}>
            ثبت‌نام صاحب بار
          </Link>
        </p>
      }
    >
      <LoginModeTabs mode={mode} onChange={setMode} />

      {mode === "otp" ? (
        <OtpLogin supabase={supabase} role="customer" redirectTo="/customer" initialPhone={phone} />
      ) : (
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="phone" className={ui.label}>
              شماره موبایل
            </label>
            <input
              id="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09121234567"
              className={`${ui.input} text-right`}
            />
          </div>
  
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-bold text-fg/80">
                رمز عبور
              </label>
              <Link href="/customer/forgot-password" className="text-xs text-brand-2 hover:text-brand">
                فراموش کرده‌اید؟
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="رمز عبور حساب"
              className={ui.input}
            />
          </div>
  
          {error && <Alert tone="error">{error}</Alert>}
  
          <button type="submit" disabled={loading} className={ui.btnPrimary}>
            {loading ? "در حال ورود..." : "ورود به پنل"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
