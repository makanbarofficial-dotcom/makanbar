"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_ROLES, isStandalone, setAppRole, type AppRole } from "@/lib/app-role";

// فقط داخل اپلیکیشن نصب‌شده: نقش فعلی را به خاطر می‌سپارد و گزینه «تغییر نوع حساب» را نشان می‌دهد
export function AppRoleBar({ role }: { role: AppRole }) {
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    if (!isStandalone()) return;
    setAppRole(role);
    setInApp(true);
  }, [role]);

  if (!inApp) return null;

  const current = APP_ROLES.find((item) => item.id === role)!;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-ink-2 px-4 py-2 text-xs text-white/60">
      <span>
        {current.icon} حساب: <b className="text-white">{current.label}</b>
      </span>
      <Link
        href="/app/?choose=1"
        className="rounded-lg border border-white/10 px-3 py-1 font-bold text-white/80 transition hover:bg-white/10"
      >
        تغییر نوع حساب
      </Link>
    </div>
  );
}
