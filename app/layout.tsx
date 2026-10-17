import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { InstallApp } from "@/components/install-app";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://makanbar.com"),
  title: {
    default: "ماکان بار | باربری و حمل بار دربستی و خرده‌بار",
    template: "%s | ماکان بار",
  },
  description:
    "ماکان بار (Makan Bar)؛ باربری و حمل بار دربستی و خرده‌بار بین تهران و شهرستان‌ها. ثبت آنلاین بار، تعیین کرایه و پیگیری وضعیت تا تحویل.",
  applicationName: "ماکان بار",
  // یک اپلیکیشن برای همه؛ اپ با صفحه ‎/app/ شروع می‌شود و نوع حساب را می‌پرسد
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ماکان بار", statusBarStyle: "black" },
  keywords: [
    "ماکان بار",
    "makanbar",
    "باربری",
    "حمل بار",
    "حمل بار دربستی",
    "خرده بار",
    "باربری تهران",
    "اعلام بار",
  ],
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "ماکان بار",
    url: "https://makanbar.com",
    images: [{ url: "/logo.png", alt: "ماکان بار" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen bg-ink font-sans text-white antialiased">
        <InstallApp />
        {children}
      </body>
    </html>
  );
}
