"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Alert, AuthShell, ui } from "@/components/ui";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    );
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

export default function EmployeeLoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    const normalizedPhone = normalizeIranPhone(phone);

    if (!phone.trim() || !password) {
      setError("لطفاً شماره موبایل و رمز عبور را وارد کنید.");
      return;
    }

    if (
      !normalizedPhone.startsWith("+98") ||
      normalizedPhone.length !== 13
    ) {
      setError("شماره موبایل را به‌صورت صحیح وارد کنید.");
      return;
    }

    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        // ورود با موبایل در Supabase خاموش است؛ همان ایمیل ساختگی تابع create-staff-user
        email: `${normalizedPhone.replace("+", "")}@staff.makanbar.com`,
        password,
      });

    if (loginError) {
      console.error("Employee login error:", loginError);

      setError(
        "شماره موبایل یا رمز عبور اشتباه است."
      );

      setLoading(false);
      return;
    }

    router.push("/employee");
  }

  return (
    <AuthShell
      badge="پنل متصدیان"
      title="ورود متصدیان"
      subtitle="با شماره موبایل و رمزی که مدیریت برایتان ساخته وارد شوید."
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
            inputMode="numeric"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09121234567"
            className={`${ui.input} text-right`}
          />
        </div>

        <div>
          <label htmlFor="password" className={ui.label}>
            رمز عبور
          </label>
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
          {loading ? "در حال ورود..." : "ورود به پنل"}
        </button>
      </form>
    </AuthShell>
  );
}
