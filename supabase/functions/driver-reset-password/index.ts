import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

// مرحله آخر بازیابی رمز راننده: با توکن یک‌بارمصرفِ customer-verify-reset-otp رمز را عوض می‌کند

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const MIN_PASSWORD_LENGTH = 6;

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

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "فقط POST مجاز است." }, 405);

  try {
    const body = await req.json();
    const phone = normalizeIranPhone(String(body.phone ?? ""));
    const resetToken = String(body.resetToken ?? "").trim();
    const newPassword = String(body.newPassword ?? "");

    if (!/^\+989\d{9}$/.test(phone)) {
      return json({ success: false, error: "شماره موبایل معتبر نیست." });
    }

    if (resetToken.length !== 64) {
      return json({ success: false, error: "تأیید شماره معتبر نیست؛ دوباره کد بگیرید." });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return json({ success: false, error: `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.` });
    }

    const { data: row, error: lookupError } = await supabase
      .from("customer_password_reset_otps")
      .select("id, reset_token_expires_at")
      .eq("phone", phone)
      .eq("reset_token_hash", await sha256Hex(resetToken))
      .not("verified_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!row?.reset_token_expires_at || new Date(row.reset_token_expires_at).getTime() <= Date.now()) {
      return json({ success: false, error: "مجوز تغییر رمز منقضی یا نامعتبر است؛ دوباره کد بگیرید." });
    }

    const { data: driver, error: driverError } = await supabase
      .from("driver_profiles")
      .select("auth_user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (driverError) throw driverError;

    if (!driver?.auth_user_id) {
      return json({ success: false, error: "حساب راننده پیدا نشد." });
    }

    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      driver.auth_user_id,
      { password: newPassword },
    );

    if (passwordError) {
      console.error("Password update failed:", passwordError.message);
      return json({ success: false, error: "تغییر رمز عبور ناموفق بود." }, 500);
    }

    await supabase.from("customer_password_reset_otps").delete().eq("id", row.id);

    return json({ success: true, message: "رمز عبور با موفقیت تغییر کرد. اکنون وارد حساب شوید." });
  } catch (error) {
    console.error("driver-reset-password:", error instanceof Error ? error.message : error);
    return json({ success: false, error: "خطای داخلی سرور." }, 500);
  }
});
