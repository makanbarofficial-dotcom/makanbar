import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

// کارهای مدیریتی پنل مدیر که کلید سرور لازم دارند (فقط مدیر):
//   { action: "delete_customer", customerId }  حذف صاحب بار، بارهایش و حساب ورودش
//   { action: "staff_password", staffId, password }  رمز تازه برای حساب پنل متصدی

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

const fail = (error: string, status = 400) => json({ success: false, error }, status);

// بار در جریان: راننده دارد و هنوز تحویل یا لغو نشده
const ACTIVE_LOAD_STATUSES = ["assigned", "in_transit"];

async function deleteCustomer(customerId: number) {
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, auth_user_id, full_name")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  if (!customer) return fail("این صاحب بار پیدا نشد.", 404);

  const userId = customer.auth_user_id as string | null;
  const { data: requests } = userId
    ? await supabase.from("requests").select("id").eq("customer_id", userId)
    : { data: [] as { id: number }[] };
  const requestIds = (requests ?? []).map((row) => row.id);

  if (requestIds.length) {
    const { data: active } = await supabase
      .from("loads")
      .select("id")
      .in("request_id", requestIds)
      .not("driver_id", "is", null)
      .in("status", ACTIVE_LOAD_STATUSES)
      .limit(1);
    if (active?.length) {
      return fail("این صاحب بار باری دارد که راننده در حال بردن آن است؛ اول آن بار را تمام یا لغو کنید.");
    }

    const { error: loadsError } = await supabase.from("loads").delete().in("request_id", requestIds);
    if (loadsError) throw loadsError;
    const { error: requestsError } = await supabase.from("requests").delete().in("id", requestIds);
    if (requestsError) throw requestsError;
  }

  const { error: customerError } = await supabase.from("customers").delete().eq("id", customerId);
  if (customerError) throw customerError;

  // حساب ورود فقط وقتی پاک می‌شود که همین شخص راننده، متصدی یا مدیر نباشد
  let accountDeleted = false;
  if (userId) {
    const [{ data: driver }, { data: staff }, { data: admin }] = await Promise.all([
      supabase.from("driver_profiles").select("id").eq("auth_user_id", userId).maybeSingle(),
      supabase.from("staff").select("id").eq("auth_user_id", userId).maybeSingle(),
      supabase.from("app_admins").select("auth_user_id").eq("auth_user_id", userId).maybeSingle(),
    ]);
    if (!driver && !staff && !admin) {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) console.error("delete auth user failed:", authError.message);
      else accountDeleted = true;
    }
  }

  console.log("admin delete customer", customerId, "requests:", requestIds.length, "account:", accountDeleted);
  return json({ success: true, requests: requestIds.length, accountDeleted });
}

async function setStaffPassword(staffId: number, password: string) {
  if (password.length < 6) return fail("رمز باید حداقل ۶ حرف باشد.");

  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, auth_user_id")
    .eq("id", staffId)
    .maybeSingle();
  if (error) throw error;
  if (!staff) return fail("این متصدی پیدا نشد.", 404);
  if (!staff.auth_user_id) {
    return fail("این متصدی هنوز حساب پنل ندارد؛ «ویرایش» را بزنید، رمز بدهید و ذخیره کنید.");
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(staff.auth_user_id, { password });
  if (updateError) {
    console.error("staff password update failed:", updateError.message);
    return fail("تغییر رمز انجام نشد. دوباره تلاش کنید.", 500);
  }

  console.log("admin set staff password", staffId);
  return json({ success: true });
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
    if (!admin) return fail("فقط مدیر به این بخش دسترسی دارد.", 403);

    const body = await req.json().catch(() => ({}));

    if (body.action === "delete_customer") {
      const customerId = Number(body.customerId);
      if (!Number.isInteger(customerId)) return fail("صاحب بار مشخص نیست.");
      return await deleteCustomer(customerId);
    }

    if (body.action === "staff_password") {
      const staffId = Number(body.staffId);
      if (!Number.isInteger(staffId)) return fail("متصدی مشخص نیست.");
      return await setStaffPassword(staffId, String(body.password ?? ""));
    }

    return fail("درخواست نامعتبر است.");
  } catch (error) {
    console.error("admin-manage-users:", error instanceof Error ? error.message : error);
    return fail("خطای داخلی سرور رخ داد.", 500);
  }
});
