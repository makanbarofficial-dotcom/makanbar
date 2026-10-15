import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OTP_SECRET = Deno.env.get("CUSTOMER_OTP_SECRET");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Supabase configuration is missing");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
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

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function normalizeIranPhone(phone: string) {
  let value = normalizeDigits(phone)
    .trim()
    .replace(/[\s\-()]/g, "");

  if (value.startsWith("0098")) {
    value = "+98" + value.slice(4);
  } else if (value.startsWith("09")) {
    value = "+98" + value.slice(1);
  } else if (value.startsWith("9")) {
    value = "+98" + value;
  }

  return value;
}

// ورود با موبایل در پروژه خاموش است؛ راننده با این ایمیل ساختگی وارد می‌شود.
// صفحه /driver/login باید دقیقاً همین قالب را بسازد.
function driverLoginEmail(normalizedPhone: string) {
  return `${normalizedPhone.replace("+", "")}@drivers.makanbar.com`;
}

function base64Decode(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function decryptPassword(encryptedPassword: string) {
  if (!OTP_SECRET || OTP_SECRET.length < 32) {
    throw new Error("OTP_SECRET_INVALID");
  }

  const parts = encryptedPassword.split(".");
  if (parts.length !== 2) {
    throw new Error("INVALID_ENCRYPTED_PASSWORD");
  }

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(OTP_SECRET),
  );

  const key = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64Decode(parts[0]),
    },
    key,
    base64Decode(parts[1]),
  );

  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({
      success: false,
      message: "متد درخواست مجاز نیست.",
    }, 405);
  }

  try {
    if (!OTP_SECRET || OTP_SECRET.length < 32) {
      return json({
        success: false,
        message: "تنظیمات امنیتی سرور کامل نیست.",
      }, 500);
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return json({
        success: false,
        message: "اطلاعات ارسالی معتبر نیست.",
      }, 400);
    }

    const phone = normalizeIranPhone(String(body.phone ?? ""));
    const otp = normalizeDigits(String(body.otp ?? "").trim());

    if (!/^\+989\d{9}$/.test(phone)) {
      return json({
        success: false,
        message: "شماره موبایل معتبر نیست.",
      }, 400);
    }

    if (!/^\d{6}$/.test(otp)) {
      return json({
        success: false,
        message: "کد تأیید باید ۶ رقم باشد.",
      }, 400);
    }

    // پیدا کردن کد ثبت‌نام
    const { data: otpRow, error: otpError } = await supabase
      .from("driver_registration_otps")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (otpError) {
      console.error("OTP lookup failed:", otpError.message);
      return json({
        success: false,
        message: "بررسی کد تأیید انجام نشد.",
      }, 500);
    }

    if (!otpRow) {
      return json({
        success: false,
        message: "کد پیدا نشد یا منقضی شده است؛ دوباره درخواست کد بدهید.",
      }, 400);
    }

    if (otpRow.verified) {
      return json({
        success: false,
        message: "این کد قبلاً استفاده شده است.",
      }, 400);
    }

    const expiry = new Date(otpRow.expires_at).getTime();

    if (!Number.isFinite(expiry) || Date.now() >= expiry) {
      await supabase
        .from("driver_registration_otps")
        .delete()
        .eq("id", otpRow.id);

      return json({
        success: false,
        message: "کد منقضی شده است؛ کد جدید بگیرید.",
      }, 400);
    }

    const attempts = Number(otpRow.attempts ?? 0);

    if (attempts >= 5) {
      await supabase
        .from("driver_registration_otps")
        .delete()
        .eq("id", otpRow.id);

      return json({
        success: false,
        message: "تعداد تلاش‌ها تمام شده است؛ کد جدید بگیرید.",
      }, 400);
    }

    if (String(otpRow.otp_code) !== otp) {
      const nextAttempts = attempts + 1;

      const { error: updateError } = await supabase
        .from("driver_registration_otps")
        .update({ attempts: nextAttempts })
        .eq("id", otpRow.id);

      if (updateError) {
        console.error("OTP attempt update failed:", updateError.message);
        return json({
          success: false,
          message: "ثبت تلاش ناموفق بود؛ دوباره امتحان کنید.",
        }, 500);
      }

      if (nextAttempts >= 5) {
        await supabase
          .from("driver_registration_otps")
          .delete()
          .eq("id", otpRow.id);

        return json({
          success: false,
          message: "تعداد تلاش‌ها تمام شد؛ کد جدید بگیرید.",
        }, 400);
      }

      return json({
        success: false,
        message: `کد اشتباه است؛ ${5 - nextAttempts} تلاش باقی مانده است.`,
      }, 400);
    }

    // جلوگیری از ثبت مجدد پروفایل راننده
    const { data: existingDriver, error: driverLookupError } =
      await supabase
        .from("driver_profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

    if (driverLookupError) {
      console.error("Driver lookup failed:", driverLookupError.message);
      return json({
        success: false,
        message: "بررسی حساب راننده انجام نشد.",
      }, 500);
    }

    if (existingDriver) {
      return json({
        success: false,
        message: "این شماره قبلاً به‌عنوان راننده ثبت شده است.",
      }, 409);
    }

    // بررسی اینکه شماره قبلاً پروفایل مشتری دارد یا خیر
    const { data: existingCustomer, error: customerLookupError } =
      await supabase
        .from("customers")
        .select("auth_user_id")
        .eq("phone", phone)
        .maybeSingle();

    if (customerLookupError) {
      console.error(
        "Customer lookup failed:",
        customerLookupError.message,
      );

      return json({
        success: false,
        message: "بررسی حساب مشتری انجام نشد.",
      }, 500);
    }

    let authUserId = "";
    let createdNewAuthUser = false;

    if (existingCustomer?.auth_user_id) {
      // حساب مشتری موجود است: باید همان کاربر احراز هویت شده باشد.
      const authorization = req.headers.get("Authorization") ?? "";
      const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

      if (!accessToken) {
        return json({
          success: false,
          code: "LOGIN_REQUIRED",
          message:
            "این شماره حساب مشتری دارد. ابتدا وارد حساب مشتری شوید و سپس ثبت‌نام راننده را دوباره تأیید کنید.",
        }, 401);
      }

      const { data: userData, error: userError } =
        await supabase.auth.getUser(accessToken);

      if (
        userError ||
        !userData.user ||
        userData.user.id !== existingCustomer.auth_user_id
      ) {
        return json({
          success: false,
          code: "LOGIN_REQUIRED",
          message:
            "برای اتصال حساب راننده، ابتدا با حساب مشتری همین شماره وارد شوید.",
        }, 401);
      }

      // از حساب قبلی استفاده می‌کنیم؛ رمز تغییر نمی‌کند.
      authUserId = existingCustomer.auth_user_id;
    } else {
      // شماره جدید: حساب Auth ساخته می‌شود.
      const password = await decryptPassword(
        String(otpRow.password_hash ?? ""),
      );

      if (!password || password.length < 6) {
        throw new Error("INVALID_DECRYPTED_PASSWORD");
      }

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: driverLoginEmail(phone),
          email_confirm: true,
          phone,
          password,
          phone_confirm: true,
        });

      // حساب بی‌صاحب قدیمی با همین شماره؛ مالکیت شماره با کد پیامکی ثابت شده، پس همان حساب را به کار می‌گیریم
      if (authError?.code === "phone_exists") {
        const { data: orphanId } = await supabase.rpc(
          "find_orphan_auth_user_by_phone",
          { p_phone: phone.replace("+", "") },
        );

        if (orphanId) {
          const { error: adoptError } = await supabase.auth.admin.updateUserById(
            orphanId,
            { email: driverLoginEmail(phone), email_confirm: true, password },
          );

          if (!adoptError) {
            authUserId = orphanId;
            createdNewAuthUser = false;
          } else {
            console.error("Orphan adopt failed:", adoptError.message);
          }
        }
      }

      if (authData?.user) {
        authUserId = authData.user.id;
        createdNewAuthUser = true;
      } else if (!authUserId) {
        console.error(
          "Driver Auth creation failed:",
          authError?.code ?? "UNKNOWN",
          authError?.message ?? "",
        );

        return json({
          success: false,
          message:
            authError?.code === "phone_exists"
              ? "این شماره برای حساب متصدی یا حساب دیگری استفاده شده است. با پشتیبانی تماس بگیرید."
              : "ساخت حساب انجام نشد. لطفاً دوباره تلاش کنید.",
        }, 409);
      }
    }

    // ایجاد پروفایل راننده؛ راننده بدون نیاز به تأیید مدیر فعال می‌شود.
    // مدیر در صورت نیاز می‌تواند از پنل مدیریت او را غیرفعال کند.
    const { error: profileError } = await supabase
      .from("driver_profiles")
      .insert({
        auth_user_id: authUserId,
        full_name: otpRow.full_name,
        phone,
        vehicle_type: otpRow.vehicle_type,
        vehicle_model: otpRow.vehicle_model,
        vehicle_plate: otpRow.vehicle_plate,
        status: "approved",
      });

    if (profileError) {
      console.error(
        "Driver profile creation failed:",
        profileError.code ?? "",
        profileError.message,
      );

      // فقط حسابی را پاک می‌کنیم که همین درخواست ساخته است.
      if (createdNewAuthUser) {
        const { error: rollbackError } =
          await supabase.auth.admin.deleteUser(authUserId);

        if (rollbackError) {
          console.error("Auth rollback failed:", rollbackError.message);
        }
      }

      return json({
        success: false,
        message: "ذخیره پروفایل راننده انجام نشد. تنظیمات جدول را بررسی کنید.",
      }, 500);
    }

    // پاک کردن OTP پس از ثبت موفق پروفایل
    const { error: cleanupError } = await supabase
      .from("driver_registration_otps")
      .delete()
      .eq("id", otpRow.id);

    if (cleanupError) {
      console.error("OTP cleanup failed:", cleanupError.message);
    }

    return json({
      success: true,
      message: "ثبت‌نام راننده انجام شد؛ حالا می‌توانید وارد پنل رانندگان شوید.",
      existingAccount: !createdNewAuthUser,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_ERROR";

    console.error("driver-verify-otp failed:", message);

    return json({
      success: false,
      message: "خطای سرور رخ داد؛ لاگ تابع را بررسی کنید.",
    }, 500);
  }
});
