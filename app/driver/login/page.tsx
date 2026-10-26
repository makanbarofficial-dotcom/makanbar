"use client";

import { useState } from "react";
import { createSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AuthShell, ui } from "@/components/ui";
import { normalizeDigits } from "@/lib/shipments";

const supabase = createSupabase();

function normalizeIranPhone(phone: string) {
  let value = normalizeDigits(phone).trim().replace(/[\s\-()]/g, "");

  if (value.startsWith("0098")) {
    value = "+98" + value.slice(4);
  } else if (value.startsWith("09")) {
    value = "+98" + value.slice(1);
  } else if (value.startsWith("9")) {
    value = "+98" + value;
  }

  return value;
}

// ورود با موبایل در Supabase خاموش است. راننده‌ی جدید با ایمیل ساختگی
// تابع driver-verify-otp ساخته می‌شود؛ راننده‌ای که قبلاً صاحب بار بوده
// با همان حساب صاحب بار وارد می‌شود.
function loginEmails(normalizedPhone: string) {
  const digits = normalizedPhone.replace("+", "");
  return [`${digits}@drivers.makanbar.com`, `${digits}@customers.makanbar.com`];
}

export default function DriverLoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    const normalizedPhone = normalizeIranPhone(phone);

    if (!/^\+989\d{9}$/.test(normalizedPhone) || !password) {
      setError("شماره موبایل و رمز عبور را درست وارد کنید.");
      return;
    }

    setLoading(true);

    try {
      for (const email of loginEmails(normalizedPhone)) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!loginError) {
          router.replace("/driver");
          return;
        }
      }

      setError("شماره موبایل یا رمز عبور اشتباه است.");
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      badge="پنل رانندگان"
      title="ورود رانندگان"
      subtitle="بارهای آزاد را ببینید و بار مسیر خود را بپذیرید."
      footer={
        <p>
          هنوز ثبت‌نام نکرده‌اید؟{" "}
          <Link href="/driver/register" className={ui.link}>
            ثبت‌نام راننده
          </Link>
        </p>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleLogin();
        }}
        className="space-y-5"
      >
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
            <Link href="/driver/forgot-password" className="text-xs text-brand-2 hover:text-brand">
              فراموش کرده‌اید؟
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="رمز عبور"
            className={ui.input}
          />
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <button type="submit" disabled={loading} className={ui.btnPrimary}>
          {loading ? "در حال ورود..." : "ورود به پنل رانندگان"}
        </button>
      </form>
    </AuthShell>
  );
}
