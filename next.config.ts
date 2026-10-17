import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// شناسه هر نسخه (کامیت گیت) به آدرس فایل‌های js/css اضافه می‌شود (?dpl=...) تا مرورگرها
// بعد از هر بارگذاری فایل تازه بگیرند و نسخه قدیمی یا ناقصِ کش‌شده را استفاده نکنند
function deploymentId() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

const nextConfig: NextConfig = {
  output: "export",
  // هر صفحه به‌صورت پوشه/index.html ساخته می‌شود تا روی هاست‌های معمولی (cPanel) بدون تنظیم اضافه باز شود
  trailingSlash: true,
  deploymentId: deploymentId(),
};

export default nextConfig;
