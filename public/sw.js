// سرویس‌ورکر ساده برای نصب‌پذیر بودن اپلیکیشن‌ها؛ عمداً چیزی کش نمی‌کند
// تا همیشه نسخه تازه سایت باز شود.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
