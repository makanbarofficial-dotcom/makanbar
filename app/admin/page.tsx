"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Alert, AuthShell, ui } from "@/components/ui";
import { normalizeDigits } from "@/lib/shipments";

// مدیر با ایمیل یا شماره موبایل وارد می‌شود؛ شماره به ایمیل ساختگی تابع create-admin-user تبدیل می‌شود
function loginEmail(identifier: string) {
  const value = normalizeDigits(identifier).trim();
  if (value.includes("@")) return value;

  let phone = value.replace(/[\s()-]/g, "");
  if (phone.startsWith("0098")) phone = phone.slice(2);
  else if (phone.startsWith("+98")) phone = phone.slice(1);
  else if (phone.startsWith("09")) phone = "98" + phone.slice(1);
  else if (phone.startsWith("9")) phone = "98" + phone;

  return `${phone}@admins.makanbar.com`;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function AdminPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail(email),
      password,
    });

    if (error) {
      setError("ایمیل/شماره موبایل یا رمز عبور اشتباه است.");
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <AuthShell badge="پنل مدیریت" title="ورود مدیر" subtitle="فقط برای مدیران ماکان بار">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleLogin();
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="email" className={ui.label}>
            ایمیل یا شماره موبایل
          </label>
          <input
            id="email"
            type="text"
            dir="ltr"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {loading ? "در حال ورود..." : "ورود به پنل مدیریت"}
        </button>
      </form>
    </AuthShell>
  );
}
