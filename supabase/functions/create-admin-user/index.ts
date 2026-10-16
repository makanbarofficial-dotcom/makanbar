import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

// ساخت حساب مدیر جدید با شماره موبایل؛ فقط مدیر اصلی (role = owner) اجازه دارد.
// ورود با موبایل در Supabase خاموش است، پس مدیر با ایمیل ساختگی وارد می‌شود
// و صفحه /admin شماره را به همین ایمیل تبدیل می‌کند.

interface ReqPayload {
  name: string;
  phone: string;
  password: string;
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeIranPhone(phone: string) {
  const value = normalizeDigits(phone).trim().replace(/[\s()-]/g, "");
  if (value.startsWith("+98")) return value;
  if (value.startsWith("0098")) return "+" + value.slice(2);
  if (value.startsWith("09")) return "+98" + value.slice(1);
  if (value.startsWith("9")) return "+98" + value;
  return value;
}

function adminLoginEmail(normalizedPhone: string) {
  return `${normalizedPhone.replace("+", "")}@admins.makanbar.com`;
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      try {
        if (!ctx.userClaims) {
          return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
        }

        // شناسه کاربر را مستقیم از توکن ورود می‌گیریم
        const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
        const { data: authUser } = await ctx.supabaseAdmin.auth.getUser(token);

        const { data: caller } = await ctx.supabaseAdmin
          .from("app_admins")
          .select("role")
          .eq("auth_user_id", authUser.user?.id ?? "")
          .maybeSingle();

        if (caller?.role !== "owner") {
          return Response.json({ error: "فقط مدیر اصلی می‌تواند مدیر جدید بسازد." }, { status: 403 });
        }

        const body: ReqPayload = await req.json();
        const name = String(body.name ?? "").trim();
        const password = String(body.password ?? "");
        const phone = normalizeIranPhone(String(body.phone ?? ""));

        if (!name) {
          return Response.json({ error: "نام مدیر را وارد کنید." }, { status: 400 });
        }

        if (!/^\+989\d{9}$/.test(phone)) {
          return Response.json({ error: "شماره موبایل معتبر وارد کنید." }, { status: 400 });
        }

        if (password.length < 8) {
          return Response.json({ error: "رمز عبور مدیر باید حداقل ۸ کاراکتر باشد." }, { status: 400 });
        }

        const { data: created, error: createError } =
          await ctx.supabaseAdmin.auth.admin.createUser({
            email: adminLoginEmail(phone),
            email_confirm: true,
            phone,
            phone_confirm: true,
            password,
            user_metadata: { full_name: name },
          });

        if (createError || !created.user) {
          console.error("Create admin user error:", createError);
          return Response.json(
            {
              error:
                createError?.code === "phone_exists" || createError?.code === "email_exists"
                  ? "این شماره قبلاً برای حساب دیگری (صاحب بار، راننده یا متصدی) استفاده شده است."
                  : "ساخت حساب مدیر انجام نشد.",
            },
            { status: 400 }
          );
        }

        const { error: insertError } = await ctx.supabaseAdmin
          .from("app_admins")
          .insert({ auth_user_id: created.user.id, name, phone, role: "manager" });

        if (insertError) {
          console.error("Insert admin error:", insertError);
          await ctx.supabaseAdmin.auth.admin.deleteUser(created.user.id);
          return Response.json({ error: "ثبت مدیر انجام نشد." }, { status: 500 });
        }

        return Response.json({ success: true, message: "حساب مدیر ساخته شد." });
      } catch (error) {
        console.error("create-admin-user:", error);
        return Response.json({ error: "خطای غیرمنتظره در ساخت حساب مدیر." }, { status: 500 });
      }
    }
  ),
};
