import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // هر صفحه به‌صورت پوشه/index.html ساخته می‌شود تا روی هاست‌های معمولی (cPanel) بدون تنظیم اضافه باز شود
  trailingSlash: true,
};

export default nextConfig;
