import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// پیامک یادآوری به رانندگان خودروی سنگین که کد ملی، تاریخ تولد یا شماره هوشمند ناوگان ندارند
// فقط مدیر صدا می‌زند. { send: false } فقط تعداد و شماره‌ها را برمی‌گرداند؛ { send: true } پیامک می‌فرستد.

const FLEET_CARD_TYPES = ["تریلی", "جفت", "تک", "خاور و کامیونت"];
const MESSAGE =
  "سلام راننده عزیز، ماکان بار هستیم. لطفاً هر وقت فرصت کردید کد ملی، تاریخ تولد و شماره هوشمند ناوگانتون رو در پنل رانندگان ثبت کنید. ممنون از همراهیتون\nmakanbar.com/driver";

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
  const digits = phone
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "");
  if (digits.startsWith("98")) return "+" + digits;
  if (digits.startsWith("0")) return "+98" + digits.slice(1);
  return "+98" + digits;
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
  // deno-lint-ignore no-explicit-any
  const result: any = await new Promise((resolve, reject) => {
    client.PtpSms(
      {
        security: {
          Username: Deno.env.get("NIKSMS_USERNAME"),
          Password: Deno.env.get("NIKSMS_PASSWORD"),
        },
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

  return String(result?.PtpSmsResult?.Status ?? "Unknown");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    const { data: admin } = await supabase
      .from("app_admins")
      .select("auth_user_id")
      .eq("auth_user_id", userData?.user?.id ?? "")
      .maybeSingle();

    if (!admin) return json({ success: false, error: "فقط مدیر می‌تواند این پیامک را بفرستد." }, 403);

    const body = await req.json().catch(() => ({}));

    // وضعیت حساب پیامک: نام عملیات‌های سرویس و اعتبار باقی‌مانده
    if (body.credit) {
      const client = await createSmsClient();
      const operations = Object.keys(client.describe()?.NiksmsWebservice?.BasicHttpBinding_INiksmsWebservice ?? {});
      let credit: unknown = null;
      if (typeof client.GetCredit === "function") {
        credit = await new Promise((resolve) =>
          client.GetCredit(
            { security: { Username: Deno.env.get("NIKSMS_USERNAME"), Password: Deno.env.get("NIKSMS_PASSWORD") } },
            // deno-lint-ignore no-explicit-any
            (error: any, res: any) => resolve(error ? String(error.message ?? error) : res),
          )
        );
      }
      return json({ success: true, operations, credit });
    }

    const { data: drivers, error } = await supabase
      .from("driver_profiles")
      .select("phone, national_code, birth_date, fleet_smart_number")
      .eq("status", "approved")
      .in("vehicle_type", FLEET_CARD_TYPES);

    if (error) throw error;

    // { to: "09..." } فقط به همان شماره (برای آزمایش متن پیش از ارسال همگانی)
    const phones = body.to
      ? [toSmsNumber(String(body.to))]
      : [
          ...new Set(
            (drivers ?? [])
              .filter((d) => d.phone && (!d.national_code || !d.birth_date || !d.fleet_smart_number))
              .map((d) => toSmsNumber(d.phone)),
          ),
        ];

    if (!body.send) return json({ success: true, count: phones.length, message: MESSAGE });

    const client = await createSmsClient();
    let sent = 0;
    const statuses: Record<string, number> = {};
    for (const phone of phones) {
      let status: string;
      try {
        status = await sendSms(client, phone, MESSAGE);
      } catch (smsError) {
        status = "Error: " + (smsError instanceof Error ? smsError.message : String(smsError));
      }
      statuses[status] = (statuses[status] ?? 0) + 1;
      if (status === "Successful") sent++;
      console.log("reminder sms", phone.slice(-4), status);
      // فاصله بین پیامک‌ها تا سرویس پیامک ارسال پشت‌سرهم را محدود نکند
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    console.log("sms-driver-profile-reminder sent", sent, "of", phones.length, JSON.stringify(statuses));
    return json({ success: true, count: phones.length, sent, statuses });
  } catch (error) {
    console.error("sms-driver-profile-reminder:", error instanceof Error ? error.message : error);
    return json({ success: false, error: "خطای داخلی سرور رخ داد." }, 500);
  }
});
