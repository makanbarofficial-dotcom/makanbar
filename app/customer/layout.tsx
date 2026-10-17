import type { Metadata } from "next";
import { InstallApp } from "@/components/install-app";

// پنل‌ها و صفحه‌های ورود نباید در نتایج جستجو نمایش داده شوند.
// هر پنل اپلیکیشن جدای خودش را دارد (manifest و آیکن جدا) که مستقیم همین پنل را باز می‌کند.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/apps/customer/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ماکان بار", statusBarStyle: "black" },
};

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InstallApp appName="ماکان بار صاحب بار" />
      {children}
    </>
  );
}
