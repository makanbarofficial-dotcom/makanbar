import type { SupabaseClient } from "@supabase/supabase-js";

// راننده‌ای که بار را پذیرفته؛ به صاحب بار، متصدی و مدیر فقط نام و شماره نشان داده می‌شود
export type DriverContact = { full_name: string | null; phone: string | null };

// دیتابیس (تابع request_driver_contacts) فقط برای صاحب همان بار، متصدی مسئول یا مدیر جواب می‌دهد
export async function loadDriverContacts(supabase: SupabaseClient, requestIds: number[]) {
  if (requestIds.length === 0) return {} as Record<number, DriverContact>;

  const { data, error } = await supabase.rpc("request_driver_contacts", { p_request_ids: requestIds });
  if (error) {
    console.error("Driver contacts error:", error.message);
    return {} as Record<number, DriverContact>;
  }

  return Object.fromEntries(
    ((data ?? []) as { request_id: number; full_name: string | null; phone: string | null }[]).map((row) => [
      row.request_id,
      { full_name: row.full_name, phone: row.phone },
    ])
  ) as Record<number, DriverContact>;
}
