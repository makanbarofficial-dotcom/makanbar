"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Alert, AuthShell, ui } from "@/components/ui";

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
      email,
      password,
    });

    if (error) {
      setError("ایمیل یا رمز عبور اشتباه است.");
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
            ایمیل
          </label>
          <input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
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
