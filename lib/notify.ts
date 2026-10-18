import type { SupabaseClient } from "@supabase/supabase-js";

// بعد از تغییر کرایه یا وضعیت بار صدا زده می‌شود؛ تابع notify-customer خودش تشخیص می‌دهد
// پیامکی (کرایه، تعیین راننده، تحویل) لازم است یا نه. خطای پیامک نباید کار اصلی را خراب کند.
export function notifyCustomer(supabase: SupabaseClient, requestId: number | null | undefined) {
  if (requestId == null) return;

  supabase.functions
    .invoke("notify-customer", { body: { requestId } })
    .catch((error) => console.error("Customer notify error:", error));
}

// بعد از اینکه باری برای رانندگان فرستاده شد صدا زده می‌شود؛ تابع notify-drivers بارهای
// تازه‌ای را که هنوز پیامک نشده‌اند پیدا می‌کند و به رانندگانِ با ماشین مناسب پیامک می‌دهد.
export function notifyDrivers(supabase: SupabaseClient) {
  supabase.functions
    .invoke("notify-drivers")
    .catch((error) => console.error("Driver notify error:", error));
}
