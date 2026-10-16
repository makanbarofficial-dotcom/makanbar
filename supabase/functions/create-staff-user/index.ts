import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

interface ReqPayload {
  staff_id: number;
  phone: string;
  password: string;
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

// ورود با موبایل در پروژه خاموش است؛ متصدی با این ایمیل ساختگی وارد می‌شود.
// صفحه /employee/login باید دقیقاً همین قالب را بسازد.
function staffLoginEmail(normalizedPhone: string) {
  return `${normalizedPhone.replace("+", "")}@staff.makanbar.com`;
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (_req, ctx) => {
      try {
        if (!ctx.userClaims) {
          return Response.json(
            { error: "دسترسی غیرمجاز" },
            { status: 401 }
          );
        }

        // هر کسی که در فهرست مدیران (app_admins) باشد، می‌تواند متصدی بسازد
        const { data: admin } = await ctx.supabaseAdmin
          .from("app_admins")
          .select("auth_user_id")
          .eq("auth_user_id", ctx.userClaims.sub)
          .maybeSingle();

        if (!admin) {
          return Response.json(
            { error: "فقط مدیران می‌توانند حساب متصدی بسازند." },
            { status: 403 }
          );
        }

        const body: ReqPayload = await _req.json();

        if (!body.staff_id) {
          return Response.json(
            { error: "شناسه متصدی ارسال نشده است." },
            { status: 400 }
          );
        }

        if (!body.phone) {
          return Response.json(
            { error: "شماره موبایل وارد نشده است." },
            { status: 400 }
          );
        }

        if (!body.password || body.password.length < 6) {
          return Response.json(
            { error: "رمز عبور باید حداقل ۶ کاراکتر باشد." },
            { status: 400 }
          );
        }

        const phone = normalizeIranPhone(body.phone);

        const { data: userData, error: createUserError } =
          await ctx.supabaseAdmin.auth.admin.createUser({
            email: staffLoginEmail(phone),
            email_confirm: true,
            phone,
            password: body.password,
            phone_confirm: true,
          });

        if (createUserError) {
          console.error("Create user error:", createUserError);

          return Response.json(
            { error: createUserError.message || "ساخت حساب متصدی انجام نشد." },
            { status: 400 }
          );
        }

        if (!userData.user) {
          return Response.json(
            { error: "حساب متصدی ساخته نشد." },
            { status: 400 }
          );
        }

        const { error: updateStaffError } = await ctx.supabaseAdmin
          .from("staff")
          .update({
            auth_user_id: userData.user.id,
            panel_enabled: true,
          })
          .eq("id", body.staff_id);

        if (updateStaffError) {
          console.error("Update staff error:", updateStaffError);

          await ctx.supabaseAdmin.auth.admin.deleteUser(userData.user.id);

          return Response.json(
            { error: "حساب ساخته شد اما اتصال آن به متصدی انجام نشد." },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          message: "حساب متصدی با موفقیت ساخته شد.",
        });
      } catch (error) {
        console.error("Unexpected error:", error);

        return Response.json(
          { error: "خطای غیرمنتظره در ساخت حساب متصدی." },
          { status: 500 }
        );
      }
    }
  ),
};
