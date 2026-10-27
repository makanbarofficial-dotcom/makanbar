import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OTP_SECRET = Deno.env.get("CUSTOMER_OTP_SECRET");

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
      "Content-Type": "application/json",
    },
  });
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeIranPhone(phone: string) {
  let value = normalizeDigits(phone)
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (value.startsWith("09")) {
    value = "+98" + value.slice(1);
  } else if (value.startsWith("9")) {
    value = "+98" + value;
  } else if (value.startsWith("0098")) {
    value = "+" + value.slice(2);
  }

  return value;
}

// ایمیل ساختگی که فقط برای ورود استفاده می‌شود؛ هیچ ایمیلی به آن ارسال نمی‌شود.
// صفحه ورود هم باید دقیقاً همین قالب را بسازد.
function loginEmailFromPhone(normalizedPhone: string) {
  return `${normalizedPhone.replace("+", "")}@customers.makanbar.com`;
}

function base64Decode(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function getEncryptionKey() {
  if (!OTP_SECRET) {
    throw new Error("CUSTOMER_OTP_SECRET is not configured");
  }

  const secretBytes = new TextEncoder().encode(OTP_SECRET);
  const hash = await crypto.subtle.digest("SHA-256", secretBytes);

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptPassword(encryptedPassword: string) {
  const key = await getEncryptionKey();

  const parts = encryptedPassword.split(".");

  if (parts.length !== 2) {
    throw new Error("Invalid encrypted password format");
  }

  const iv = base64Decode(parts[0]);
  const encrypted = base64Decode(parts[1]);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  // پاسخ به درخواست CORS مرورگر
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ success: false, message: "Method not allowed" }, 405);
    }

    const body = await req.json();

    const phone = String(body.phone ?? "").trim();
    const otp = normalizeDigits(String(body.otp ?? "").trim());

    if (!phone) {
      return json(
        { success: false, message: "شماره موبایل وارد نشده است." },
        400
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return json(
        { success: false, message: "کد تأیید باید ۶ رقمی باشد." },
        400
      );
    }

    const normalizedPhone = normalizeIranPhone(phone);

    // پیدا کردن آخرین کد ارسال‌شده
    const { data: otpRow, error: otpError } = await supabase
      .from("customer_registration_otps")
      .select("*")
      .eq("phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("OTP lookup error:", otpError);

      return json(
        { success: false, message: "خطا در بررسی کد تأیید." },
        500
      );
    }

    if (!otpRow) {
      return json(
        {
          success: false,
          message: "کد تأیید پیدا نشد. لطفاً دوباره درخواست کد کنید.",
        },
        400
      );
    }

    if (otpRow.verified) {
      return json(
        { success: false, message: "این کد قبلاً استفاده شده است." },
        400
      );
    }

    // بررسی انقضا
    const expiresAt = new Date(otpRow.expires_at).getTime();

    if (Date.now() > expiresAt) {
      await supabase
        .from("customer_registration_otps")
        .delete()
        .eq("id", otpRow.id);

      return json(
        {
          success: false,
          message: "کد تأیید منقضی شده است. لطفاً کد جدید بگیرید.",
        },
        400
      );
    }

    // محدودیت تعداد تلاش
    if ((otpRow.attempts ?? 0) >= 5) {
      await supabase
        .from("customer_registration_otps")
        .delete()
        .eq("id", otpRow.id);

      return json(
        {
          success: false,
          message: "تعداد تلاش‌های مجاز تمام شده است. لطفاً کد جدید بگیرید.",
        },
        400
      );
    }

    // بررسی کد OTP
    if (String(otpRow.otp_code) !== otp) {
      const newAttempts = (otpRow.attempts ?? 0) + 1;

      if (newAttempts >= 5) {
        await supabase
          .from("customer_registration_otps")
          .delete()
          .eq("id", otpRow.id);

        return json(
          {
            success: false,
            message: "تعداد تلاش‌های مجاز تمام شد. لطفاً کد جدید بگیرید.",
          },
          400
        );
      }

      await supabase
        .from("customer_registration_otps")
        .update({ attempts: newAttempts })
        .eq("id", otpRow.id);

      return json(
        {
          success: false,
          message: `کد تأیید اشتباه است. ${5 - newAttempts} تلاش باقی مانده است.`,
        },
        400
      );
    }

    // بررسی مشتری قبلی
    const { data: existingCustomer, error: existingError } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (existingError) {
      console.error("Existing customer lookup error:", existingError);

      return json(
        { success: false, message: "خطا در بررسی حساب مشتری." },
        500
      );
    }

    if (existingCustomer) {
      await supabase
        .from("customer_registration_otps")
        .delete()
        .eq("id", otpRow.id);

      return json(
        {
          success: false,
          message: "این شماره موبایل قبلاً ثبت‌نام کرده است.",
        },
        400
      );
    }

    // رمزگشایی رمز عبور موقت
    const password = await decryptPassword(otpRow.password_hash);

    if (!password || password.length < 6) {
      throw new Error("Invalid decrypted password");
    }

    // ساخت حساب احراز هویت Supabase
    // ورود با ایمیل ساختگی انجام می‌شود، چون ورود با شماره در پروژه خاموش است.
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: loginEmailFromPhone(normalizedPhone),
        email_confirm: true,
        phone: normalizedPhone,
        phone_confirm: true,
        password,
      });

    if (authError) {
      console.error("Auth user creation error:", authError);

      return json(
        {
          success: false,
          message: "ساخت حساب کاربری انجام نشد. لطفاً دوباره تلاش کنید.",
        },
        500
      );
    }

    if (!authData.user) {
      throw new Error("Auth user was not created");
    }

    // ساخت پروفایل مشتری
    const { error: customerError } = await supabase.from("customers").insert({
      auth_user_id: authData.user.id,
      full_name: otpRow.full_name,
      phone: normalizedPhone,
      company_name: otpRow.company_name || null,
      address: otpRow.address || null,
      national_code: otpRow.national_code || null,
      birth_date: otpRow.birth_date || null,
    });

    if (customerError) {
      console.error("Customer profile creation error:", customerError);

      // اگر پروفایل ساخته نشد، حساب Auth هم حذف شود.
      await supabase.auth.admin.deleteUser(authData.user.id);

      return json(
        {
          success: false,
          message: "ثبت اطلاعات مشتری انجام نشد. لطفاً دوباره تلاش کنید.",
        },
        500
      );
    }

    // حذف OTP مصرف‌شده
    await supabase
      .from("customer_registration_otps")
      .delete()
      .eq("id", otpRow.id);

    return json({
      success: true,
      message: "ثبت‌نام با موفقیت انجام شد.",
    });
  } catch (error) {
    console.error("customer-verify-otp error:", error);

    return json(
      {
        success: false,
        message: "خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.",
      },
      500
    );
  }
});
