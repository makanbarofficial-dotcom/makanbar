import type { Metadata } from "next";

// صفحه شروع اپلیکیشن؛ در نتایج جستجو نمایش داده نمی‌شود
export const metadata: Metadata = {
  title: "اپلیکیشن",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
