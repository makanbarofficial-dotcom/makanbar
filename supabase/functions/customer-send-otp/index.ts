import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OTP_SECRET = Deno.env.get("CUSTOMER_OTP_SECRET")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

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

// الگوریتم رقم کنترل کد ملی ایران (همان بررسی components/identity-fields.tsx)
function isValidNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
  const sum = [...code.slice(0, 9)].reduce((total, digit, i) => total + Number(digit) * (10 - i), 0);
  const remainder = sum % 11;
  const check = Number(code[9]);
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (!OTP_SECRET || OTP_SECRET.length < 32) {
    throw new Error("CUSTOMER_OTP_SECRET باید حداقل ۳۲ کاراکتر باشد.");
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(OTP_SECRET),
  );

  return await crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
}

async function encryptPassword(password: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );

  return `${base64Encode(iv)}.${base64Encode(
    new Uint8Array(encrypted),
  )}`;
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
  const wsdlUrl =
    "http://niksms.com:1370/NiksmsWebservice.svc?wsdl";
  const endpoint =
    "http://94.182.154.28:1370/NiksmsWebservice.svc";

  const client = await withTimeout(
    new Promise<any>((resolve, reject) => {
      soap.createClient(
        wsdlUrl,
        { timeout: 10000 },
        (error: any, createdClient: any) => {
          if (error) {
            reject(error);
            return;
          }
          if (!createdClient) {
            reject(new Error("Niksms client was not created."));
            return;
          }
          resolve(createdClient);
        },
      );
    }),
    12000,
    "createClient",
  );

  client.setEndpoint(endpoint);

  const model = {
    security: {
      Username: username,
      Password: password,
    },
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
      client.PtpSms(
        model,
        (error: any, result: any, rawResponse: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve({ result, rawResponse });
        },
      );
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
    return json(
      { success: false, error: "فقط درخواست POST مجاز است." },
      405,
    );
  }

  let normalizedPhone = "";

  try {
    if (!supabaseUrl || !serviceRoleKey || !OTP_SECRET) {
      console.error("Missing required Supabase or OTP environment variables.");
      return json(
        { success: false, error: "تنظیمات سرور کامل نیست." },
        500,
      );
    }

    const body = await req.json();

    const fullName = String(body.fullName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const companyName = String(body.companyName ?? "").trim();
    const address = String(body.address ?? "").trim();
    const password = String(body.password ?? "");
    const nationalCode = normalizeDigits(String(body.nationalCode ?? "")).trim();
    const birthDate = normalizeDigits(String(body.birthDate ?? "")).trim();

    if (!fullName || !phone || !password) {
      return json(
        {
          success: false,
          error: "نام، شماره موبایل و رمز عبور الزامی هستند.",
        },
        400,
      );
    }

    if (!isValidNationalCode(nationalCode)) {
      return json({ success: false, error: "کد ملی معتبر نیست." }, 400);
    }

    if (!/^1[34]\d{2}\/\d{2}\/\d{2}$/.test(birthDate)) {
      return json({ success: false, error: "تاریخ تولد را کامل انتخاب کنید." }, 400);
    }

    if (password.length < 8) {
      return json(
        {
          success: false,
          error: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
        },
        400,
      );
    }

    normalizedPhone = normalizeIranPhone(phone);

    if (!/^\+989\d{9}$/.test(normalizedPhone)) {
      return json(
        {
          success: false,
          error: "شماره موبایل معتبر ایران وارد کنید.",
        },
        400,
      );
    }

    const { data: existingCustomer, error: lookupError } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (lookupError) {
      console.error("Customer lookup failed:", lookupError.message);
      return json(
        { success: false, error: "بررسی شماره موبایل ناموفق بود." },
        500,
      );
    }

    if (existingCustomer) {
      return json(
        {
          success: false,
          error: "این شماره موبایل قبلاً ثبت‌نام کرده است.",
        },
        409,
      );
    }

    const username = Deno.env.get("NIKSMS_USERNAME");
    const smsPassword = Deno.env.get("NIKSMS_PASSWORD");

    if (!username || !smsPassword) {
      console.error("Missing Niksms environment variables.");
      return json(
        { success: false, error: "تنظیمات سرویس پیامک کامل نیست." },
        500,
      );
    }

    const otpCode = generateOtp();
    const encryptedPassword = await encryptPassword(password);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: deleteError } = await supabase
      .from("customer_registration_otps")
      .delete()
      .eq("phone", normalizedPhone);

    if (deleteError) {
      console.error("Old OTP cleanup failed:", deleteError.message);
      return json(
        { success: false, error: "آماده‌سازی ثبت‌نام ناموفق بود." },
        500,
      );
    }

    const { error: insertError } = await supabase
      .from("customer_registration_otps")
      .insert({
        phone: normalizedPhone,
        full_name: fullName,
        company_name: companyName || null,
        address: address || null,
        national_code: nationalCode,
        birth_date: birthDate,
        password_hash: encryptedPassword,
        otp_code: otpCode,
        expires_at: expiresAt,
        attempts: 0,
        verified: false,
      });

    if (insertError) {
      console.error("OTP insert failed:", insertError.message);
      return json(
        { success: false, error: "ذخیره کد تأیید ناموفق بود." },
        500,
      );
    }

    try {
      const smsResult = await sendSms(
        username,
        smsPassword,
        normalizedPhone,
        `کد تایید ماکان بار: ${otpCode}`,
      );

      const smsStatus =
        smsResult?.result?.PtpSmsResult?.Status ?? null;

      if (smsStatus !== "Successful") {
        console.error("Niksms rejected OTP:", {
          status: smsStatus,
          responseReceived: Boolean(smsResult?.rawResponse),
        });

        await supabase
          .from("customer_registration_otps")
          .delete()
          .eq("phone", normalizedPhone);

        return json(
          {
            success: false,
            error:
              "سرویس پیامک ارسال را تأیید نکرد. لطفاً دوباره تلاش کنید.",
          },
          502,
        );
      }
    } catch (smsError) {
      console.error(
        "Niksms send error:",
        smsError instanceof Error ? smsError.message : smsError,
      );

      await supabase
        .from("customer_registration_otps")
        .delete()
        .eq("phone", normalizedPhone);

      return json(
        {
          success: false,
          error:
            "ارسال پیامک ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.",
        },
        502,
      );
    }

    return json({
      success: true,
      message: "کد تأیید ارسال شد.",
      phone: normalizedPhone,
      expiresIn: 300,
    });
  } catch (error) {
    console.error(
      "customer-send-otp error:",
      error instanceof Error ? error.message : error,
    );

    return json(
      { success: false, error: "خطای داخلی سرور رخ داد." },
      500,
    );
  }
});
