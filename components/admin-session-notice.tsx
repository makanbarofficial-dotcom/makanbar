"use client";

import Link from "next/link";
import { ui } from "@/components/ui";

// وقتی مدیر (مثلاً از اپ) وارد پنل صاحب بار، راننده یا متصدی شده؛ به‌جای پرش خودکار،
// انتخاب می‌کند به پنل مدیریت برود یا خارج شود و با حساب همین پنل وارد شود.
export function AdminSessionNotice({ panel, onLogout }: { panel: string; onLogout: () => void }) {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-surface px-4 text-fg">
      <section className={`${ui.card} w-full max-w-md p-8 text-center`}>
        <div className="text-4xl">🛡️</div>
        <h1 className="mt-4 text-xl font-black">با حساب مدیر وارد شده‌اید</h1>
        <p className="mt-3 text-sm leading-7 text-fg/60">
          این صفحه {panel} است. برای دیدن آن باید با حساب {panel.replace("پنل ", "")} وارد شوید.
        </p>
        <div className="mt-6 grid gap-2">
          <Link href="/admin/dashboard" className={ui.btnPrimary}>
            رفتن به پنل مدیریت
          </Link>
          <button type="button" onClick={onLogout} className={ui.btnSecondary}>
            خروج و ورود با حساب دیگر
          </button>
        </div>
      </section>
    </main>
  );
}
