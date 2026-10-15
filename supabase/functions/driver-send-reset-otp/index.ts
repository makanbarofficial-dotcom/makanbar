import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// بازیابی رمز راننده؛ کد در همان جدول customer_password_reset_otps ذخیره می‌شود
// تا تابع مشترک customer-verify-reset-otp آن را تأیید کند.

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

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function normalizeIranPhone(value: string): string {
  let phone = normalizeDigits(value).replace(/[\s()-]/g, "");
  if (phone.startsWith("0098")) phone = "+" + phone.slice(2);
  if (phone.startsWith("98")) phone = "+" + phone;
  if (phone.startsWith("09")) phone = "+98" + phone.slice(1);
  if (phone.startsWith("9") && phone.length === 10) phone = "+98" + phone;
  return phone;
}

function generateOtp(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

async function sendSms(username: string, password: string, recipient: string, message: string) {
  const wsdlUrl = "http://niksms.com:1370/NiksmsWebservice.svc?wsdl";
  const endpoint = "http://94.182.154.28:1370/NiksmsWebservice.svc";

  // deno-lint-ignore no-explicit-any
  const client: any = await new Promise((resolve, reject) => {
    // deno-lint-ignore no-explicit-any
    soap.createClient(wsdlUrl, { timeout: 10000 }, (error: any, created: any) => {
      if (error) return reject(error);
      if (!created) return reject(new Error("Niksms client unavailable"));
      resolve(created);
    });
  });

  client.setEndpoint(endpoint);

  // deno-lint-ignore no-explicit-any
  return await new Promise<any>((resolve, reject) => {
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
      (error: any, result: any) => {
        if (error) return reject(error);
        resolve({ result });
      },
    );
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "فقط POST مجاز است." }, 405);

  // پاسخ یکسان برای شماره‌های ثبت‌شده و ثبت‌نشده تا کسی نتواند رانندگان را شناسایی کند
  const neutral = {
    success: true,
    message: "اگر شماره ثبت شده باشد، کد بازیابی ارسال می‌شود.",
    expiresIn: 300,
  };

  try {
    const body = await req.json();
    const phone = normalizeIranPhone(String(body.phone ?? ""));

    if (!/^\+989\d{9}$/.test(phone)) {
      return json({ success: false, error: "شماره موبایل معتبر نیست." });
    }

    const { data: driver, error: driverError } = await supabase
      .from("driver_profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (driverError) throw driverError;
    if (!driver) return json(neutral);

    const username = Deno.env.get("NIKSMS_USERNAME");
    const smsPassword = Deno.env.get("NIKSMS_PASSWORD");

    if (!username || !smsPassword) {
      console.error("Missing Niksms environment variables.");
      return json({ success: false, error: "تنظیمات پیامک کامل نیست." }, 500);
    }

    const { data: recent } = await supabase
      .from("customer_password_reset_otps")
      .select("created_at")
      .eq("phone", phone)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1);

    if (recent?.length) {
      return json({ success: false, error: "لطفاً پیش از درخواست کد جدید یک دقیقه صبر کنید." });
    }

    const otp = generateOtp();

    await supabase.from("customer_password_reset_otps").delete().eq("phone", phone);

    const { error: insertError } = await supabase.from("customer_password_reset_otps").insert({
      phone,
      otp_code: otp,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      attempts: 0,
    });

    if (insertError) throw insertError;

    const result = await sendSms(username, smsPassword, phone, `کد بازیابی رمز راننده ماکان بار: ${otp}`);

    if (result?.result?.PtpSmsResult?.Status !== "Successful") {
      await supabase.from("customer_password_reset_otps").delete().eq("phone", phone);
      console.error("Niksms status:", result?.result?.PtpSmsResult?.Status);
      return json({ success: false, error: "ارسال پیامک ناموفق بود؛ دوباره تلاش کنید." });
    }

    return json(neutral);
  } catch (error) {
    console.error("driver-send-reset-otp:", error instanceof Error ? error.message : error);
    return json({ success: false, error: "خطای داخلی سرور." }, 500);
  }
});
