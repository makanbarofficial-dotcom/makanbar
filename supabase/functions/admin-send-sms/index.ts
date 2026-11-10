import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// بخش «پیامک» پنل مدیر: پیامک دلخواه به رانندگان، صاحبان بار، متصدی‌ها یا شماره‌های دلخواه.
// فقط مدیر. { action: "preview" } تعداد گیرندگان و اعتبار پنل را برمی‌گرداند؛
// { action: "send" } در پس‌زمینه می‌فرستد و نتیجه را در admin_sms_log ثبت می‌کند.
//
// body: {
//   action, message,
//   drivers?: boolean, vehicleTypes?: string[]   (خالی یعنی همه‌ی ماشین‌ها)
//   customers?: boolean,
//   staff?: boolean, staffKinds?: string[]       (خالی یعنی همه‌ی متصدی‌ها)
//   numbers?: string                              (شماره‌های دلخواه، با فاصله/خط جدید/کاما)
// }

const MAX_MESSAGE = 500;

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

// شماره را به +989xxxxxxxxx تبدیل می‌کند؛ شماره‌ی نامعتبر null
function toSmsNumber(phone: string) {
  const digits = String(phone)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "");
  const local = digits.startsWith("0098")
    ? digits.slice(4)
    : digits.startsWith("98")
      ? digits.slice(2)
      : digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^9\d{9}$/.test(local) ? "+98" + local : null;
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

const security = () => ({
  Username: Deno.env.get("NIKSMS_USERNAME"),
  Password: Deno.env.get("NIKSMS_PASSWORD"),
});

// deno-lint-ignore no-explicit-any
async function getCredit(client: any): Promise<number | null> {
  try {
    // deno-lint-ignore no-explicit-any
    const res: any = await new Promise((resolve, reject) =>
      // deno-lint-ignore no-explicit-any
      client.GetCredit({ security: security() }, (error: any, r: any) => (error ? reject(error) : resolve(r)))
    );
    const value = Number(res?.GetCreditResult ?? res);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

// deno-lint-ignore no-explicit-any
async function sendSms(client: any, recipient: string, message: string) {
  // deno-lint-ignore no-explicit-any
  const result: any = await new Promise((resolve, reject) => {
    client.PtpSms(
      {
        security: security(),
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

// تعداد بخش‌های پیامک فارسی (۷۰ حرف برای یک پیامک، ۶۷ برای هر بخش پیامک چندبخشی)
function smsParts(message: string) {
  const length = [...message].length;
  return length <= 70 ? 1 : Math.ceil(length / 67);
}

const STRING_ARRAY = (value: unknown) =>
  Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    const { data: admin } = await supabase
      .from("app_admins")
      .select("auth_user_id")
      .eq("auth_user_id", userId ?? "")
      .maybeSingle();

    if (!userId || !admin) return json({ success: false, error: "فقط مدیر می‌تواند پیامک بفرستد." }, 403);

    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    const vehicleTypes = STRING_ARRAY(body.vehicleTypes);
    const staffKinds = STRING_ARRAY(body.staffKinds);
    const audience: string[] = [];
    const phones = new Set<string>();
    const add = (phone: string | null | undefined) => {
      const number = phone ? toSmsNumber(phone) : null;
      if (number) phones.add(number);
    };

    if (body.drivers) {
      let query = supabase.from("driver_profiles").select("phone").eq("status", "approved");
      if (vehicleTypes.length) query = query.in("vehicle_type", vehicleTypes);
      const { data, error } = await query;
      if (error) throw error;
      data?.forEach((row) => add(row.phone));
      audience.push(`رانندگان${vehicleTypes.length ? ` (${vehicleTypes.join("، ")})` : ""}`);
    }

    if (body.customers) {
      const { data, error } = await supabase.from("customers").select("phone");
      if (error) throw error;
      data?.forEach((row) => add(row.phone));
      audience.push("صاحبان بار");
    }

    if (body.staff) {
      let query = supabase.from("staff").select("phone").eq("panel_enabled", true);
      if (staffKinds.length) query = query.in("kind", staffKinds);
      const { data, error } = await query;
      if (error) throw error;
      data?.forEach((row) => add(row.phone));
      audience.push("متصدی‌ها");
    }

    const typed = String(body.numbers ?? "").split(/[\s,،;]+/).filter(Boolean);
    const invalid = typed.filter((item) => !toSmsNumber(item));
    typed.forEach(add);
    if (typed.length) audience.push(`${typed.length} شماره‌ی دلخواه`);

    const client = await createSmsClient();
    const parts = message ? smsParts(message) : 0;

    if (body.action !== "send") {
      return json({
        success: true,
        count: phones.size,
        parts,
        invalid,
        credit: await getCredit(client),
      });
    }

    if (!message) return json({ success: false, error: "متن پیامک را بنویسید." }, 400);
    if ([...message].length > MAX_MESSAGE) {
      return json({ success: false, error: `متن پیامک حداکثر ${MAX_MESSAGE} حرف باشد.` }, 400);
    }
    if (phones.size === 0) return json({ success: false, error: "هیچ گیرنده‌ای انتخاب نشده است." }, 400);

    const { data: log } = await supabase
      .from("admin_sms_log")
      .insert({ sent_by: userId, message, audience: audience.join(" + "), recipients: phones.size })
      .select("id")
      .single();

    // رله‌ی هاست بیشتر از ۲۵ ثانیه منتظر نمی‌ماند؛ ارسال در پس‌زمینه ادامه پیدا می‌کند
    const sendAll = async () => {
      let sent = 0;
      let failed = 0;
      for (const phone of phones) {
        let status: string;
        try {
          status = await sendSms(client, phone, message);
        } catch (smsError) {
          status = "Error: " + (smsError instanceof Error ? smsError.message : String(smsError));
        }
        if (status === "Successful") sent++;
        else failed++;
        console.log("admin sms", phone.slice(-4), status);
        // هر ۱۰ پیامک یک‌بار نتیجه به‌روز می‌شود تا در پنل پیشرفت دیده شود
        if (log && (sent + failed) % 10 === 0) {
          await supabase.from("admin_sms_log").update({ sent, failed }).eq("id", log.id);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (log) {
        await supabase
          .from("admin_sms_log")
          .update({ sent, failed, finished_at: new Date().toISOString() })
          .eq("id", log.id);
      }
      console.log("admin-send-sms done", sent, "of", phones.size);
    };

    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime.waitUntil(sendAll());
    return json({ success: true, queued: phones.size, logId: log?.id ?? null });
  } catch (error) {
    console.error("admin-send-sms:", error instanceof Error ? error.message : error);
    return json({ success: false, error: "خطای داخلی سرور رخ داد." }, 500);
  }
});
