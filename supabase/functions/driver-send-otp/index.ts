import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OTP_SECRET = Deno.env.get("CUSTOMER_OTP_SECRET")!;

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

// خطاهای قابل‌انتظار با وضعیت ۲۰۰ برمی‌گردند تا صفحه ثبت‌نام متن فارسی را نشان دهد
function fail(message: string) {
  return json({ success: false, message, error: message });
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
  return String(Math.floor(100000 + Math.random() * 900000));
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// رمز تا پایان تأیید کد به‌صورت رمزنگاری‌شده نگه داشته می‌شود؛
// driver-verify-otp با همین کلید آن را باز می‌کند.
async function encryptPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(OTP_SECRET),
  );

  const key = await crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );

  return `${base64Encode(iv)}.${base64Encode(new Uint8Array(encrypted))}`;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  stage: string,
): Promise<T> {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Niksms timeout at ${stage}`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

async function sendSms(
  username: string,
  password: string,
  recipient: string,
  message: string,
) {
  const wsdlUrl = "http://niksms.com:1370/NiksmsWebservice.svc?wsdl";
  const endpoint = "http://94.182.154.28:1370/NiksmsWebservice.svc";

  const client = await withTimeout(
    new Promise<any>((resolve, reject) => {
      // deno-lint-ignore no-explicit-any
      soap.createClient(wsdlUrl, { timeout: 10000 }, (error: any, created: any) => {
        if (error) return reject(error);
        if (!created) return reject(new Error("Niksms client was not created."));
        resolve(created);
      });
    }),
    12000,
    "createClient",
  );

  client.setEndpoint(endpoint);

  const model = {
    security: { Username: username, Password: password },
    model: {
      Message: [{ string: message }],
      SenderNumber: "blacklist",
      Numbers: [{ string: recipient }],
      SendType: "Normal",
      YourMessageId: [{ string: Date.now().toString() }],
    },
  };

  return await withTimeout(
    new Promise<any>((resolve, reject) => {
      // deno-lint-ignore no-explicit-any
      client.PtpSms(model, (error: any, result: any, rawResponse: string) => {
        if (error) return reject(error);
        resolve({ result, rawResponse });
      });
    }),
    15000,
    "PtpSms",
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, message: "فقط درخواست POST مجاز است." }, 405);
  }

  try {
    if (!supabaseUrl || !serviceRoleKey || !OTP_SECRET || OTP_SECRET.length < 32) {
      console.error("Missing Supabase or OTP environment variables.");
      return json({ success: false, message: "تنظیمات سرور کامل نیست." }, 500);
    }

    const body = await req.json();

    const fullName = String(body.fullName ?? "").trim();
    const password = String(body.password ?? "");
    const vehicleType = String(body.vehicleType ?? "").trim();
    const vehicleModel = String(body.vehicleModel ?? "").trim();
    const vehiclePlate = String(body.vehiclePlate ?? "").trim();
    const phone = normalizeIranPhone(String(body.phone ?? ""));

    if (!fullName || !password || !vehicleType || !vehicleModel || !vehiclePlate) {
      return fail("نام، رمز عبور و اطلاعات خودرو الزامی هستند.");
    }

    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return fail(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`);
    }

    if (!/^\+989\d{9}$/.test(phone)) {
      return fail("شماره موبایل معتبر ایران وارد کنید.");
    }

    const { data: existingDriver, error: lookupError } = await supabase
      .from("driver_profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (lookupError) {
      console.error("Driver lookup failed:", lookupError.message);
      return json({ success: false, message: "بررسی شماره موبایل ناموفق بود." }, 500);
    }

    if (existingDriver) {
      return fail("این شماره قبلاً به‌عنوان راننده ثبت‌نام کرده است؛ از صفحه ورود وارد شوید.");
    }

    const username = Deno.env.get("NIKSMS_USERNAME");
    const smsPassword = Deno.env.get("NIKSMS_PASSWORD");

    if (!username || !smsPassword) {
      console.error("Missing Niksms environment variables.");
      return json({ success: false, message: "تنظیمات سرویس پیامک کامل نیست." }, 500);
    }

    const otpCode = generateOtp();

    // هر شماره فقط یک کد فعال دارد؛ کد قبلی جایگزین می‌شود
    const { error: saveError } = await supabase
      .from("driver_registration_otps")
      .upsert(
        {
          phone,
          full_name: fullName,
          vehicle_type: vehicleType,
          vehicle_model: vehicleModel,
          vehicle_plate: vehiclePlate,
          password_hash: await encryptPassword(password),
          otp_code: otpCode,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          attempts: 0,
          verified: false,
        },
        { onConflict: "phone" },
      );

    if (saveError) {
      console.error("Driver OTP save failed:", saveError.message);
      return json({ success: false, message: "ذخیره کد تأیید ناموفق بود." }, 500);
    }

    try {
      const smsResult = await sendSms(
        username,
        smsPassword,
        phone,
        `کد تایید ثبت‌نام راننده ماکان بار: ${otpCode}`,
      );

      const smsStatus = smsResult?.result?.PtpSmsResult?.Status ?? null;

      if (smsStatus !== "Successful") {
        console.error("Niksms rejected driver OTP:", { status: smsStatus });
        await supabase.from("driver_registration_otps").delete().eq("phone", phone);
        return fail("سرویس پیامک ارسال را تأیید نکرد. لطفاً دوباره تلاش کنید.");
      }
    } catch (smsError) {
      console.error(
        "Niksms send error:",
        smsError instanceof Error ? smsError.message : smsError,
      );
      await supabase.from("driver_registration_otps").delete().eq("phone", phone);
      return fail("ارسال پیامک ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.");
    }

    return json({
      success: true,
      message: "کد تأیید ارسال شد.",
      phone,
      expiresIn: 300,
    });
  } catch (error) {
    console.error(
      "driver-send-otp error:",
      error instanceof Error ? error.message : error,
    );
    return json({ success: false, message: "خطای داخلی سرور رخ داد." }, 500);
  }
});
