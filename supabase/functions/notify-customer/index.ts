import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// پیامک به صاحب بار در سه مرحله:
//   ۱) کرایه تعیین یا عوض شد   ۲) راننده بار را پذیرفت   ۳) بار تحویل شد
// مدیر، متصدی یا راننده بعد از هر تغییر این تابع را با شناسه بار صدا می‌زنند.
// تابع خودش وضعیت بار را بررسی می‌کند و هر پیامک فقط یک‌بار فرستاده می‌شود
// (ستون‌های notified_* در جدول requests)، پس صدا زدن تکراری بی‌خطر است.

const SITE = "makanbar.com";

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

function formatToman(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
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

// هر مرحله اول «ادعا» می‌شود (به‌روزرسانی شرطی)؛ اگر درخواست دیگری زودتر ادعا کرده باشد چیزی برنمی‌گردد
// deno-lint-ignore no-explicit-any
async function claim(requestId: number, update: Record<string, unknown>, apply: (q: any) => any) {
  const query = supabase.from("requests").update(update).eq("id", requestId);
  const { data } = await apply(query).select("id").maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return json({ success: false, error: "unauthorized" }, 401);

    const { requestId } = await req.json();
    if (!Number.isInteger(requestId)) return json({ success: false }, 400);

    const { data: request } = await supabase
      .from("requests")
      .select(
        "id, phone, origin, destination, status, price, notified_price, notified_driver_at, notified_delivered_at",
      )
      .eq("id", requestId)
      .maybeSingle();

    if (!request?.phone || request.status === "لغو شد") return json({ success: true, sent: 0 });

    const route = `${request.origin} ← ${request.destination}`;
    const messages: string[] = [];

    // ۱) کرایه
    if (request.price != null && request.price > 0 && request.price !== request.notified_price) {
      const claimed = await claim(requestId, { notified_price: request.price }, (q) =>
        q.eq("price", request.price).or(
          `notified_price.is.null,notified_price.neq.${request.price}`,
        ));
      if (claimed) {
        messages.push(
          `ماکان بار: کرایه بار شما (${route}) ${formatToman(request.price)} تعیین شد.\nپیگیری: ${SITE}/customer`,
        );
      }
    }

    // ۲) پذیرش راننده
    if (!request.notified_driver_at) {
      const { data: load } = await supabase
        .from("loads")
        .select("driver_id, driver_profiles(full_name, phone, vehicle_plate)")
        .eq("request_id", requestId)
        .not("driver_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (load) {
        const claimed = await claim(requestId, { notified_driver_at: new Date().toISOString() }, (q) =>
          q.is("notified_driver_at", null));
        if (claimed) {
          // deno-lint-ignore no-explicit-any
          const driver: any = Array.isArray(load.driver_profiles)
            ? load.driver_profiles[0]
            : load.driver_profiles;
          const details = [
            driver?.full_name && `راننده: ${driver.full_name}`,
            driver?.phone && `تلفن: ${driver.phone}`,
            driver?.vehicle_plate && `پلاک: ${driver.vehicle_plate}`,
          ].filter(Boolean).join("\n");
          messages.push(
            `ماکان بار: راننده برای بار شما (${route}) تعیین شد.${details ? "\n" + details : ""}`,
          );
        }
      }
    }

    // ۳) تحویل
    if (request.status === "انجام شد" && !request.notified_delivered_at) {
      const claimed = await claim(requestId, { notified_delivered_at: new Date().toISOString() }, (q) =>
        q.is("notified_delivered_at", null).eq("status", "انجام شد"));
      if (claimed) {
        messages.push(`ماکان بار: بار شما (${route}) تحویل داده شد. از اعتماد شما سپاسگزاریم.`);
      }
    }

    let sent = 0;
    const phone = toSmsNumber(request.phone);
    for (const message of messages) {
      try {
        if (await sendSms(phone, message)) sent++;
      } catch (smsError) {
        console.error("customer sms failed:", smsError instanceof Error ? smsError.message : smsError);
      }
    }

    return json({ success: true, sent });
  } catch (error) {
    console.error("notify-customer:", error instanceof Error ? error.message : error);
    return json({ success: false }, 500);
  }
});
