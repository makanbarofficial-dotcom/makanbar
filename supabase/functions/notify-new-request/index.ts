import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// پیامک اطلاع‌رسانی بار جدید:
//   خرده‌بار «تهران ← شهری که متصدی دارد»  → متصدی‌های آن شهر
//   مدیر (ADMIN_NOTIFY_PHONE) برای همه بارها، از جمله دربستی و شهرهای بدون متصدی
// صاحب بار بعد از ثبت، این تابع را با شناسه بار صدا می‌زند؛ برای هر بار فقط یک‌بار پیامک می‌رود.

// شماره مدیر (همان موبایل عمومی سایت)؛ با متغیر ADMIN_NOTIFY_PHONE قابل تغییر است
const DEFAULT_ADMIN_PHONE = "09125573776";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function toSmsNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("98")) return "+" + digits;
  if (digits.startsWith("0")) return "+98" + digits.slice(1);
  return "+98" + digits;
}

async function sendSms(recipient: string, message: string) {
  const username = Deno.env.get("NIKSMS_USERNAME");
  const password = Deno.env.get("NIKSMS_PASSWORD");
  if (!username || !password) throw new Error("Missing Niksms environment variables");

  // deno-lint-ignore no-explicit-any
  const client: any = await new Promise((resolve, reject) => {
    soap.createClient(
      "http://niksms.com:1370/NiksmsWebservice.svc?wsdl",
      { timeout: 10000 },
      // deno-lint-ignore no-explicit-any
      (error: any, created: any) => (error ? reject(error) : resolve(created)),
    );
  });

  client.setEndpoint("http://94.182.154.28:1370/NiksmsWebservice.svc");

  // deno-lint-ignore no-explicit-any
  const result: any = await new Promise((resolve, reject) => {
    client.PtpSms(
      {
        security: { Username: username, Password: password },
        model: {
          Message: [{ string: message }],
          SenderNumber: "blacklist",
          Numbers: [{ string: recipient }],
          SendType: "Normal",
          YourMessageId: [{ string: crypto.randomUUID() }],
        },
      },
      // deno-lint-ignore no-explicit-any
      (error: any, res: any) => (error ? reject(error) : resolve(res)),
    );
  });

  return result?.PtpSmsResult?.Status === "Successful";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData.user?.id;
    if (!userId) return json({ success: false, error: "unauthorized" }, 401);

    const { requestId } = await req.json();

    // فقط صاحب همان بار، فقط یک‌بار، و فقط تا ۱۰ دقیقه بعد از ثبت
    const { data: request } = await supabase
      .from("requests")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("customer_id", userId)
      .is("notified_at", null)
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
      .select("id, shipment_type, direction, city_province, city, origin, destination")
      .maybeSingle();

    if (!request) return json({ success: true, sent: 0 });

    // مدیر برای همه بارها پیامک می‌گیرد؛ متصدی فقط برای خرده‌بارِ شهر خودش
    const type = request.shipment_type === "full" ? "دربستی" : "خرده‌بار";
    const outbox = new Map<string, string>([
      [
        toSmsNumber(Deno.env.get("ADMIN_NOTIFY_PHONE") || DEFAULT_ADMIN_PHONE),
        `ماکان بار: بار ${type} جدید ${request.origin} ← ${request.destination}`,
      ],
    ]);

    if (request.shipment_type === "partial" && request.direction === "from_tehran") {
      const { data: staff } = await supabase
        .from("staff")
        .select("phone, staff_locations!inner(province, city)")
        .eq("panel_enabled", true)
        .eq("staff_locations.province", request.city_province);

      for (const member of staff ?? []) {
        // deno-lint-ignore no-explicit-any
        const covers = member.staff_locations.some((loc: any) => !loc.city || loc.city === request.city);
        const phone = toSmsNumber(member.phone);
        // اگر مدیر خودش متصدی هم باشد، همان یک پیامک مدیر کافی است
        if (covers && !outbox.has(phone)) {
          outbox.set(phone, `ماکان بار: خرده‌بار جدید به ${request.destination} ثبت شد.`);
        }
      }
    }

    let sent = 0;
    for (const [phone, message] of outbox) {
      try {
        if (await sendSms(phone, message)) sent++;
      } catch (smsError) {
        console.error("notify sms failed:", smsError instanceof Error ? smsError.message : smsError);
      }
    }

    return json({ success: true, sent });
  } catch (error) {
    console.error("notify-new-request:", error instanceof Error ? error.message : error);
    return json({ success: false }, 500);
  }
});
