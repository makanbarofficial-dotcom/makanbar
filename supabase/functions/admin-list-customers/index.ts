import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "متد درخواست مجاز نیست." }, 405);
  }

  try {
    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "ابتدا وارد حساب مدیر شوید." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Required environment configuration is missing.");
      return jsonResponse({ error: "تنظیمات تابع کامل نیست. Secrets را بررسی کنید." }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));

    if (authError || !user) {
      return jsonResponse({ error: "نشست کاربری معتبر نیست؛ دوباره وارد شوید." }, 401);
    }

    // هر کسی که در فهرست مدیران (app_admins) باشد، فهرست مشتریان را می‌بیند
    const { data: admin } = await adminClient
      .from("app_admins")
      .select("auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!admin) {
      return jsonResponse({ error: "شما اجازه مشاهده فهرست مشتریان را ندارید." }, 403);
    }

    const { data: customers, error: queryError } = await adminClient
      .from("customers")
      .select("id, auth_user_id, full_name, phone, company_name, address, created_at")
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Customers query failed:", queryError.message);
      return jsonResponse({ error: "دریافت فهرست مشتریان ناموفق بود." }, 500);
    }

    return jsonResponse({
      success: true,
      customers: customers ?? [],
      count: customers?.length ?? 0,
    });
  } catch (error) {
    console.error(
      "admin-list-customers failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return jsonResponse({ error: "خطای داخلی سرور رخ داد." }, 500);
  }
});
