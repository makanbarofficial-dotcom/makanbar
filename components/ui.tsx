import Link from "next/link";
import type { ReactNode } from "react";

// کلاس‌های مشترک فرم و دکمه؛ همه صفحه‌ها از همین‌ها استفاده می‌کنند تا ظاهر یکدست بماند
export const ui = {
  label: "mb-2 block text-sm font-bold text-white/80",
  input:
    "w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-white outline-none transition placeholder:text-white/30 focus:border-brand focus:bg-white/[0.08] focus:ring-4 focus:ring-brand/15",
  select:
    "w-full rounded-xl border border-white/10 bg-ink-2 px-4 py-3.5 text-white outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-50",
  btnPrimary:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-2 active:scale-[0.99] disabled:opacity-60",
  btnSecondary:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3.5 font-bold text-white transition hover:bg-white/[0.09] active:scale-[0.99] disabled:opacity-60",
  card: "rounded-2xl border border-white/10 bg-white/[0.04]",
  link: "font-bold text-brand-2 transition hover:text-brand",
};

// لوگو روی کاشی روشن تا روی زمینه تیره دیده شود
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = { sm: "h-10 w-10", md: "h-12 w-12", lg: "h-16 w-16" }[size];

  return (
    <span
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm`}
    >
      <img src="/logo.png" alt="ماکان بار" className="h-full w-full object-contain" />
    </span>
  );
}

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Logo size="sm" />
      <span className="leading-tight">
        <span className="block text-base font-black">ماکان بار</span>
        {subtitle && (
          <span className="block text-[11px] text-white/50">{subtitle}</span>
        )}
      </span>
    </Link>
  );
}

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-red-400/25 bg-red-500/10 text-red-200"
      : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`whitespace-pre-line rounded-xl border px-4 py-3 text-sm leading-7 ${styles}`}
    >
      {children}
    </div>
  );
}

// قالب مشترک همه صفحه‌های ورود و ثبت‌نام
export function AuthShell({
  badge,
  title,
  subtitle,
  children,
  footer,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10"
    >
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <Link href="/" aria-label="صفحه اصلی">
            <Logo size="lg" />
          </Link>
          <span className="mt-5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-bold text-brand-2">
            {badge}
          </span>
          <h1 className="mt-3 text-2xl font-black">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm leading-7 text-white/55">{subtitle}</p>
          )}
        </div>

        <div className={`${ui.card} p-5 shadow-2xl shadow-black/30 sm:p-7`}>
          {children}
        </div>

        <div className="mt-6 space-y-3 text-center text-sm text-white/55">
          {footer}
          <Link href="/" className="block text-white/40 transition hover:text-white/70">
            ← بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </main>
  );
}
