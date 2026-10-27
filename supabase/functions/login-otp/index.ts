import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import soap from "npm:soap";

// ورود صاحب بار و راننده با کد پیامکی
//   action "send":   کد ۶ رقمی به شماره‌ای که حساب دارد پیامک می‌شود
//   action "verify": اگر کد درست باشد، یک توکن یک‌بارمصرف برمی‌گردد که مرورگر با
//                    supabase.auth.verifyOtp({ token_hash, type: "email" }) آن را به نشست تبدیل می‌کند

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const PROFILE_TABLE = { customer: "customers", driver: "driver_profiles" } as const;
type Role = keyof typeof PROFILE_TABLE;

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

// خطاهای قابل‌انتظار با وضعیت ۲۰۰ برمی‌گردند تا صفحه ورود متن فارسی را نشان دهد
function fail(message: string) {
  return json({ success: false, error: message });
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

async function withTimeout<T>(promise: Promise<T>, ms: number, stage: string): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Niksms timeout at ${stage}`)), ms);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

async function sendSms(recipient: string, message: string) {
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
    security: {
      Username: Deno.env.get("NIKSMS_USERNAME"),
      Password: Deno.env.get("NIKSMS_PASSWORD"),
    },
    model: {
      Message: [{ string: message }],
      SenderNumber: "blacklist",
      Numbers: [{ string: recipient }],
      SendType: "Normal",
      YourMessageId: [{ string: Date.now().toString() }],
    },
  };

  const response = await withTimeout(
    new Promise<any>((resolve, reject) => {
      // deno-lint-ignore no-explicit-any
      client.PtpSms(model, (error: any, result: any) => {
        if (error) return reject(error);
        resolve(result);
      });
    }),
    15000,
    "PtpSms",
  );

  return response?.PtpSmsResult?.Status === "Successful";
}

async function findAuthUserId(role: Role, phone: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(PROFILE_TABLE[role])
    .select("auth_user_id")
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw error;
  return data?.auth_user_id ?? null;
}

async function handleSend(role: Role, phone: string) {
  if (!(await findAuthUserId(role, phone))) {
    return fail(
      role === "driver"
        ? "این شماره به‌عنوان راننده ثبت‌نام نکرده است."
        : "این شماره ثبت‌نام نکرده است؛ ابتدا حساب بسازید.",
    );
  }

  const { data: previous } = await supabase
    .from("login_otps")
    .select("created_at")
    .eq("phone", phone)
    .eq("role", role)
    .maybeSingle();

  if (previous && Date.now() - new Date(previous.created_at).getTime() < RESEND_WAIT_MS) {
    return fail("کد قبلی همین الان ارسال شده است؛ یک دقیقه صبر کنید و دوباره تلاش کنید.");
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));

  const { error: saveError } = await supabase.from("login_otps").upsert(
    {
      phone,
      role,
      otp_code: code,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
    },
    { onConflict: "phone,role" },
  );

  if (saveError) throw saveError;

  let sent = false;
  try {
    sent = await sendSms(phone, `کد ورود ماکان بار: ${code}`);
  } catch (smsError) {
    console.error("Niksms send error:", smsError instanceof Error ? smsError.message : smsError);
  }

  if (!sent) {
    await supabase.from("login_otps").delete().eq("phone", phone).eq("role", role);
    return fail("ارسال پیامک ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.");
  }

  return json({ success: true });
}

async function handleVerify(role: Role, phone: string, code: string) {
  if (!/^\d{6}$/.test(code)) return fail("کد ورود باید ۶ رقم باشد.");

  const { data: row, error } = await supabase
    .from("login_otps")
    .select("id, otp_code, expires_at, attempts")
    .eq("phone", phone)
    .eq("role", role)
    .maybeSingle();

  if (error) throw error;
  if (!row) return fail("کدی برای این شماره پیدا نشد؛ دوباره کد بگیرید.");

  if (Date.now() > new Date(row.expires_at).getTime() || row.attempts >= MAX_ATTEMPTS) {
    await supabase.from("login_otps").delete().eq("id", row.id);
    return fail("کد منقضی شده است؛ دوباره کد بگیرید.");
  }

  if (row.otp_code !== code) {
    const attempts = row.attempts + 1;
    await supabase.from("login_otps").update({ attempts }).eq("id", row.id);
    return fail(
      attempts >= MAX_ATTEMPTS
        ? "تعداد تلاش‌ها تمام شد؛ دوباره کد بگیرید."
        : `کد اشتباه است؛ ${(MAX_ATTEMPTS - attempts).toLocaleString("fa-IR")} تلاش دیگر باقی مانده است.`,
    );
  }

  await supabase.from("login_otps").delete().eq("id", row.id);

  const authUserId = await findAuthUserId(role, phone);
  if (!authUserId) return fail("حساب این شماره پیدا نشد.");

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(authUserId);
  const email = userData?.user?.email;
  if (userError || !email) {
    console.error("Auth user lookup failed:", userError?.message ?? "no email");
    return fail("حساب ورود این شماره کامل نیست؛ با پشتیبانی تماس بگیرید.");
  }

  // لینک ورود ساخته می‌شود ولی ایمیلی فرستاده نمی‌شود؛ فقط توکن آن به مرورگر داده می‌شود
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error("Generate link failed:", linkError?.message);
    return fail("ورود انجام نشد؛ دوباره تلاش کنید.");
  }

  return json({ success: true, tokenHash: link.properties.hashed_token });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "فقط درخواست POST مجاز است." }, 405);

  try {
    const body = await req.json();
    const action = String(body.action ?? "");
    const role = String(body.role ?? "") as Role;
    const phone = normalizeIranPhone(String(body.phone ?? ""));

    if (!(role in PROFILE_TABLE)) return fail("نوع حساب مشخص نیست.");
    if (!/^\+989\d{9}$/.test(phone)) return fail("شماره موبایل معتبر ایران وارد کنید.");

    if (action === "send") return await handleSend(role, phone);
    if (action === "verify") return await handleVerify(role, phone, normalizeDigits(String(body.otp ?? "")).trim());
    return fail("درخواست نامعتبر است.");
  } catch (error) {
    console.error("login-otp error:", error instanceof Error ? error.message : error);
    return json({ success: false, error: "خطای داخلی سرور رخ داد." }, 500);
  }
});
