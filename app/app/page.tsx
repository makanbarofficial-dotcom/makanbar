"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { APP_ROLES, getAppRole, setAppRole, type AppRole } from "@/lib/app-role";

// صفحه شروع اپلیکیشن: بار اول نوع حساب انتخاب می‌شود، دفعه‌های بعد مستقیم پنل همان نقش باز می‌شود.
// با ‎/app/?choose=1 دوباره صفحه انتخاب نمایش داده می‌شود.
function AppStart() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const choosing = searchParams.get("choose") === "1";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = getAppRole();
    if (saved && !choosing) {
      router.replace(APP_ROLES.find((role) => role.id === saved)!.href);
      return;
    }
    setReady(true);
  }, [choosing, router]);

  function choose(role: AppRole) {
    setAppRole(role);
    router.replace(APP_ROLES.find((item) => item.id === role)!.href);
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Logo size="lg" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="flex justify-center">
        <Logo size="lg" />
      </div>

      <h1 className="mt-8 text-center text-2xl font-black">به ماکان بار خوش آمدید</h1>
      <p className="mt-2 text-center text-sm text-fg/55">
        برای ادامه، نوع حساب خود را انتخاب کنید
      </p>

      <div className="mt-8 space-y-3">
        {APP_ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => choose(role.id)}
            className="flex w-full items-center gap-4 rounded-3xl border border-fg/10 bg-surface-2 p-5 text-right transition hover:border-brand/60 hover:bg-fg/10 active:scale-[0.99]"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-3xl">
              {role.icon}
            </span>
            <span className="flex-1">
              <span className="block text-lg font-black">{role.label}</span>
              <span className="mt-1 block text-sm text-fg/55">{role.hint}</span>
            </span>
            <span className="text-xl text-fg/45">‹</span>
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-fg/55">
        انتخاب شما ذخیره می‌شود و دفعه بعد مستقیم وارد پنل خود می‌شوید.
      </p>

      {/* مدیران نوع حساب جدا در اپ ندارند؛ از اینجا مستقیم به پنل مدیریت می‌روند */}
      <a href="/admin/" className="mt-4 block text-center text-sm font-bold text-fg/60 hover:text-brand-2">
        🛡️ ورود مدیران
      </a>
    </main>
  );
}

export default function AppStartPage() {
  return (
    <Suspense fallback={null}>
      <AppStart />
    </Suspense>
  );
}
