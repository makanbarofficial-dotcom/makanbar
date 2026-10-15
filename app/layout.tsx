import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ماکان بار | حمل‌ونقل حرفه‌ای",
  description:
    "ماکان بار؛ خدمات حرفه‌ای حمل‌ونقل و جابه‌جایی بار در سراسر کشور.",
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
        {children}
      </body>
    </html>
  );
}
