import { createClient } from "@supabase/supabase-js";

// همه‌ی صفحه‌ها اتصال Supabase را از این‌جا می‌سازند.
// آدرس NEXT_PUBLIC_SUPABASE_URL رله‌ی هاست تهران است (makanbar.com/sb، public/sb/index.php).
// فایروال هاست PATCH و DELETE و PUT را می‌بندد؛ این درخواست‌ها با POST و سربرگ X-Relay-Method
// فرستاده می‌شوند و رله آن‌ها را به روش اصلی برمی‌گرداند.
const RELAY_METHODS = ["PATCH", "DELETE", "PUT"];

function relayFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase();
  if (!RELAY_METHODS.includes(method)) return fetch(input, init);

  const headers = new Headers(init?.headers);
  headers.set("X-Relay-Method", method);
  return fetch(input, { ...init, method: "POST", headers });
}

export function createSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: relayFetch } }
  );
}
