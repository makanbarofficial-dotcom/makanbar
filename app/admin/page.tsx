"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <img
                src="/logo.png"
                alt="ماکان بار"
                className="h-20 w-20 object-contain"
              />
            </div>

            <h1 className="text-2xl font-black">
              پنل مدیریت ماکان بار
            </h1>

            <p className="mt-2 text-sm text-white/60">
              ورود به مدیریت سایت
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                ایمیل
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ایمیل خود را وارد کنید"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right text-white outline-none transition placeholder:text-white/30 focus:border-orange-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                رمز عبور
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور خود را وارد کنید"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right text-white outline-none transition placeholder:text-white/30 focus:border-orange-500"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Login button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-2xl bg-orange-500 py-3.5 font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "در حال ورود..." : "ورود به پنل"}
            </button>
          </div>

          {/* Back */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-white/50 transition hover:text-orange-400"
            >
              بازگشت به سایت
            </a>
          </div>

        </div>
      </div>
    </main>
  );
}