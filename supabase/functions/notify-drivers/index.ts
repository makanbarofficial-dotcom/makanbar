import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// پیامک بار جدید به رانندگان:
//   هر بار آزادی که تازه برای رانندگان فرستاده شده (و هنوز پیامکش نرفته)، برای همه‌ی
//   رانندگان تأییدشده‌ای که ماشینشان به بار می‌خورد پیامک می‌شود.
// مدیر یا متصدی بعد از ارسال بار برای رانندگان این تابع را صدا می‌زنند (بدون پارامتر).
// هر بار با ستون notified_drivers_at فقط یک‌بار «ادعا» می‌شود، پس صدا زدن تکراری بی‌خطر است.

const SITE = "makanbar.com/driver";
// بارهای قدیمی‌تر از این دیگر پیامک نمی‌شوند
const MAX_AGE_MINUTES = 120;

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

// همان قاعده‌ی پنل رانندگان (lib/shipments.ts → vehicleFits):
// بار بدون نوع خودرو برای همه است و «کامیون» یعنی تک یا جفت
function vehicleFits(loadVehicle: string | null, driverVehicle: string | null) {
  if (!loadVehicle || loadVehicle === "فرقی ندارد" || !driverVehicle) return true;
  if (loadVehicle === driverVehicle) return true;
  return loadVehicle === "کامیون" && (driverVehicle === "تک" || driverVehicle === "جفت");
}

// deno-lint-ignore no-explicit-any
async function createSmsClient(): Promise<any> {
  const client = await new Promise((resolve, reject) => {
    soap.createClient(
      "http://niksms.com:1370/NiksmsWebservice.svc?wsdl",
      { timeout: 10000 },
      // deno-lint-ignore no-explicit-any
      (error: any, created: any) => (error ? reject(error) : resolve(created)),
    );
  });
  // deno-lint-ignore no-explicit-any
  (client as any).setEndpoint("http://94.182.154.28:1370/NiksmsWebservice.svc");
  return client;
}

// deno-lint-ignore no-explicit-any
async function sendSms(client: any, recipient: string, message: string) {
  const username = Deno.env.get("NIKSMS_USERNAME");
  const password = Deno.env.get("NIKSMS_PASSWORD");
  if (!username || !password) throw new Error("Missing Niksms environment variables");

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
    if (!userData.user) return json({ success: false, error: "unauthorized" }, 401);

    // بارهای آزادِ تازه که هنوز پیامکشان نرفته؛ هر کدام با به‌روزرسانی شرطی ادعا می‌شود
    const { data: loads } = await supabase
      .from("loads")
      .update({ notified_drivers_at: new Date().toISOString() })
      .is("notified_drivers_at", null)
      .eq("status", "available")
      .gte("created_at", new Date(Date.now() - MAX_AGE_MINUTES * 60_000).toISOString())
      .select("id, origin, destination, vehicle_type, price, load_type");

    if (!loads?.length) return json({ success: true, loads: 0, sent: 0 });

    const { data: drivers } = await supabase
      .from("driver_profiles")
      .select("phone, vehicle_type")
      .eq("status", "approved");

    const client = await createSmsClient();
    let sent = 0;

    for (const load of loads) {
      const route = load.load_type === "intracity"
        ? `درون‌شهری ${load.origin}`
        : `${load.origin} ← ${load.destination}`;
      const price = load.price ? ` · کرایه ${Number(load.price).toLocaleString("fa-IR")} تومان` : "";
      const message = `ماکان بار: بار جدید ${route}${price}\nپذیرش: ${SITE}`;

      const phones = new Set(
        (drivers ?? [])
          .filter((driver) => driver.phone && vehicleFits(load.vehicle_type, driver.vehicle_type))
          .map((driver) => toSmsNumber(driver.phone)),
      );

      console.log("notify-drivers", load.id, load.vehicle_type, "recipients:", phones.size);

      for (const phone of phones) {
        try {
          if (await sendSms(client, phone, message)) sent++;
        } catch (smsError) {
          console.error("driver sms failed:", smsError instanceof Error ? smsError.message : smsError);
        }
      }
    }

    return json({ success: true, loads: loads.length, sent });
  } catch (error) {
    console.error("notify-drivers:", error instanceof Error ? error.message : error);
    return json({ success: false }, 500);
  }
});
