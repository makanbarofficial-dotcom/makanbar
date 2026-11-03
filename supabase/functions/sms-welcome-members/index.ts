import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// پیامک تشکر یک‌باره برای همه‌ی صاحبان بار و رانندگان فعال فعلی؛ فقط مدیر صدا می‌زند.
// { send: false } فقط تعداد را برمی‌گرداند؛ { send: true } در پس‌زمینه می‌فرستد.
// هر شماره یک پیامک می‌گیرد، حتی اگر هم صاحب بار باشد هم راننده.

const MESSAGE =
  "سلام، ممنونیم که عضو خانواده ماکان بار شدید. هر وقت کاری داشتید در خدمتیم.\nmakanbar.com";

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

    const [{ data: customers, error: customerError }, { data: drivers, error: driverError }] =
      await Promise.all([
        supabase.from("customers").select("phone"),
        supabase.from("driver_profiles").select("phone").eq("status", "approved"),
      ]);

    if (customerError || driverError) throw customerError ?? driverError;

    const phones = [
      ...new Set(
        [...(customers ?? []), ...(drivers ?? [])]
          .filter((row) => row.phone)
          .map((row) => toSmsNumber(row.phone)),
      ),
    ];

    if (!body.send) {
      return json({
        success: true,
        count: phones.length,
        customers: customers?.length ?? 0,
        drivers: drivers?.length ?? 0,
        message: MESSAGE,
      });
    }

    // رله‌ی هاست بیشتر از ۲۵ ثانیه منتظر نمی‌ماند؛ ارسال در پس‌زمینه ادامه پیدا می‌کند
    const sendAll = async () => {
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
        console.log("welcome sms", phone.slice(-4), status);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      console.log("sms-welcome-members sent", sent, "of", phones.length, JSON.stringify(statuses));
    };

    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime.waitUntil(sendAll());
    return json({ success: true, queued: phones.length });
  } catch (error) {
    console.error("sms-welcome-members:", error instanceof Error ? error.message : error);
    return json({ success: false, error: "خطای داخلی سرور رخ داد." }, 500);
  }
});
