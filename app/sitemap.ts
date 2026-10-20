import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE = "https://makanbar.com";

// فقط صفحه‌های عمومی؛ پنل‌ها و صفحه‌های ورود در گوگل نمایش داده نمی‌شوند
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/services/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/representatives/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/vehicles/`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/about/`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/download/`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
