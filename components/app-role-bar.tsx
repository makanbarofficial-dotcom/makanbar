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
    <div className="flex items-center justify-between gap-3 border-b border-fg/10 bg-surface-2 px-4 py-2 text-xs text-fg/60">
      <span>
        {current.icon} حساب: <b className="text-fg">{current.label}</b>
      </span>
      <Link
        href="/app/?choose=1"
        className="rounded-lg border border-fg/10 px-3 py-1 font-bold text-fg/80 transition hover:bg-fg/10"
      >
        تغییر نوع حساب
      </Link>
    </div>
  );
}
