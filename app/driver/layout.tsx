import type { Metadata } from "next";

// پنل‌ها و صفحه‌های ورود نباید در نتایج جستجو نمایش داده شوند
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
