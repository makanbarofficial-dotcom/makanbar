import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// پیامک اطلاع‌رسانی بار جدید:
//   خرده‌بار «تهران ← شهری که متصدی دارد»  → متصدی‌های آن شهر
//   بار درون‌شهری → متصدی درون‌شهری همان شهر
//   خرده‌بار شهرستان ← تهران یا شهرستان دیگر → نماینده‌ی شهر مبدا
//   مدیران (ADMIN_PHONES و ADMIN_NOTIFY_PHONE) برای همه بارها، از جمله دربستی و شهرهای بدون متصدی
// صاحب بار بعد از ثبت، این تابع را با شناسه بار صدا می‌زند؛ برای هر بار فقط یک‌بار پیامک می‌رود.

// شماره‌هایی که برای هر بار جدید پیامک می‌گیرند؛ متغیر ADMIN_NOTIFY_PHONE (با کاما) هم اضافه می‌شود
const ADMIN_PHONES = ["09125573776"];

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

// شماره‌ها گاهی با رقم فارسی یا عربی ذخیره شده‌اند (۰۹۱۲…)؛ اول به رقم انگلیسی تبدیل می‌شوند
function toSmsNumber(phone: string) {
  const digits = phone
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "");
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

    // بار تلفنی را مدیر، متصدی درون‌شهری یا نماینده ثبت می‌کند؛ بقیه بارها را خود صاحب بار
    const [{ data: callerAdmin }, { data: callerStaff }] = await Promise.all([
      supabase.from("app_admins").select("auth_user_id").eq("auth_user_id", userId).maybeSingle(),
      supabase
        .from("staff")
        .select("phone, kind")
        .eq("auth_user_id", userId)
        .in("kind", ["intracity", "origin"])
        .eq("panel_enabled", true)
        .maybeSingle(),
    ]);
    const byAdmin = !!callerAdmin;

    // فقط صاحب همان بار (یا مدیر، یا متصدی درون‌شهری برای بار تلفنی)، فقط یک‌بار، و فقط تا ۱۰ دقیقه بعد از ثبت
    let claim = supabase
      .from("requests")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", requestId)
      .is("notified_at", null)
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
    if (!byAdmin) {
      claim = callerStaff
        ? claim
            .is("customer_id", null)
            .eq("shipment_type", callerStaff.kind === "origin" ? "partial" : "intracity")
        : claim.eq("customer_id", userId);
    }

    const { data: request } = await claim
      .select("id, shipment_type, direction, city_province, city, origin_province, origin_city, origin, destination")
      .maybeSingle();

    if (!request) return json({ success: true, sent: 0 });

    // مدیر برای همه بارها پیامک می‌گیرد؛ متصدی فقط برای بارِ شهر خودش
    const type = { full: "دربستی", partial: "خرده‌بار", intracity: "درون‌شهری" }[
      request.shipment_type as string
    ] ?? "";
    const adminPhones = new Set(
      [...ADMIN_PHONES, ...(Deno.env.get("ADMIN_NOTIFY_PHONE") ?? "").split(",")]
        .map((phone) => phone.trim())
        .filter(Boolean)
        .map(toSmsNumber),
    );
    const outbox = new Map<string, string>();

    // بار تلفنی را خود مدیر ثبت کرده؛ پیامک مدیر لازم نیست
    if (!byAdmin) {
      for (const adminPhone of adminPhones) {
        outbox.set(
          adminPhone,
          request.shipment_type === "intracity"
            ? `ماکان بار: بار درون‌شهری جدید در ${request.origin}`
            : `ماکان بار: بار ${type} جدید ${request.origin} ← ${request.destination}`,
        );
      }
    }

    // متصدی بین‌شهری: خرده‌بار تهران ← شهر او؛ متصدی درون‌شهری: بار درون‌شهری شهر او؛
    // نماینده: خرده‌باری که از شهر او بیرون می‌رود (با شهر مبدا مقایسه می‌شود)
    const staffKind = request.shipment_type === "intracity"
      ? "intracity"
      : request.shipment_type === "partial"
        ? request.direction === "from_tehran" ? "intercity" : "origin"
        : null;
    const areaProvince = staffKind === "origin" ? request.origin_province : request.city_province;
    const areaCity = staffKind === "origin" ? request.origin_city : request.city;
    const callerPhone = callerStaff?.phone ? toSmsNumber(callerStaff.phone) : null;

    if (staffKind && areaProvince) {
      const { data: staff } = await supabase
        .from("staff")
        .select("phone, staff_locations!inner(province, city)")
        .eq("panel_enabled", true)
        .eq("kind", staffKind)
        .eq("staff_locations.province", areaProvince);

      for (const member of staff ?? []) {
        // deno-lint-ignore no-explicit-any
        const covers = member.staff_locations.some((loc: any) => !loc.city || loc.city === "*" || loc.city === areaCity);
        const phone = toSmsNumber(member.phone);
        // اگر مدیر خودش متصدی هم باشد، همان یک پیامک مدیر کافی است
        // کسی که خودش بار تلفنی را ثبت کرده پیامک نمی‌گیرد
        if (covers && !outbox.has(phone) && !adminPhones.has(phone) && phone !== callerPhone) {
          outbox.set(
            phone,
            staffKind === "intracity"
              ? `ماکان بار: بار درون‌شهری جدید در ${request.destination} ثبت شد.`
              : staffKind === "origin"
                ? `ماکان بار: خرده‌بار جدید از ${request.origin} به ${request.destination} ثبت شد.`
                : `ماکان بار: خرده‌بار جدید به ${request.destination} ثبت شد.`,
          );
        }
      }
    }

    // برای پیدا کردن مشکل در گزارش‌های Supabase: چه کسانی باید پیامک بگیرند
    console.log("notify-new-request", request.id, request.shipment_type, request.direction,
      request.city_province, request.city, "recipients:", outbox.size);

    let sent = 0;
    for (const [phone, message] of outbox) {
      try {
        const ok = await sendSms(phone, message);
        if (!ok) console.error("notify sms not successful for", phone.slice(0, 6) + "…");
        if (ok) sent++;
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
