// نقش انتخاب‌شده در اپلیکیشن ماکان بار؛ اپ دفعه‌های بعد مستقیم پنل همین نقش را باز می‌کند
export type AppRole = "customer" | "driver" | "employee";

export const APP_ROLES: { id: AppRole; label: string; hint: string; icon: string; href: string }[] = [
  { id: "customer", label: "صاحب بار", hint: "ثبت بار و پیگیری تا تحویل", icon: "📦", href: "/customer/" },
  { id: "driver", label: "راننده", hint: "دیدن بارها و پذیرش بار", icon: "🚚", href: "/driver/" },
  { id: "employee", label: "متصدی", hint: "پنل متصدیان و نمایندگان", icon: "🏢", href: "/employee/" },
];

const KEY = "makanbar-app-role";

export function getAppRole(): AppRole | null {
  try {
    const value = localStorage.getItem(KEY);
    return APP_ROLES.some((role) => role.id === value) ? (value as AppRole) : null;
  } catch {
    return null;
  }
}

export function setAppRole(role: AppRole | null) {
  try {
    if (role) localStorage.setItem(KEY, role);
    else localStorage.removeItem(KEY);
  } catch {}
}

// آیا صفحه داخل اپلیکیشن نصب‌شده باز شده است (نه در مرورگر)
export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
