import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

interface ReqPayload {
  staff_id: number;
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeIranPhone(phone: string) {
  const value = normalizeDigits(phone).trim().replace(/\s+/g, "").replace(/-/g, "");

  if (value.startsWith("+98")) return value;
  if (value.startsWith("0098")) return "+" + value.slice(2);
  if (value.startsWith("09")) return "+98" + value.slice(1);
  if (value.startsWith("9")) return "+98" + value;
  return value;
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      try {
        if (!ctx.userClaims) {
          return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
        }

        // هر کسی که در فهرست مدیران (app_admins) باشد، می‌تواند متصدی را حذف کند
        const { data: admin } = await ctx.supabaseAdmin
          .from("app_admins")
          .select("auth_user_id")
          .eq("auth_user_id", ctx.userClaims.sub)
          .maybeSingle();

        if (!admin) {
          return Response.json(
            { error: "فقط مدیران می‌توانند متصدی را حذف کنند." },
            { status: 403 }
          );
        }

        const body: ReqPayload = await req.json();

        if (!body.staff_id) {
          return Response.json({ error: "شناسه متصدی ارسال نشده است." }, { status: 400 });
        }

        const { data: staff, error: staffFindError } = await ctx.supabaseAdmin
          .from("staff")
          .select("id, name, phone, auth_user_id")
          .eq("id", body.staff_id)
          .single();

        if (staffFindError || !staff) {
          console.error("Staff find error:", staffFindError);
          return Response.json({ error: "متصدی پیدا نشد." }, { status: 404 });
        }

        // اگر auth_user_id ثبت نشده، حساب ورود را با شماره موبایل پیدا می‌کنیم
        let authUserId = staff.auth_user_id;

        if (!authUserId && staff.phone) {
          const normalizedStaffPhone = normalizeIranPhone(staff.phone);
          let page = 1;
          // deno-lint-ignore no-explicit-any
          let foundUser: any = null;

          while (!foundUser) {
            const { data: usersData, error: usersError } =
              await ctx.supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });

            if (usersError) {
              console.error("List Auth users error:", usersError);
              return Response.json(
                { error: "امکان بررسی حساب ورود متصدی وجود ندارد.", details: usersError.message },
                { status: 500 }
              );
            }

            const users = usersData?.users ?? [];
            foundUser = users.find(
              (user) => !!user.phone && normalizeIranPhone(user.phone) === normalizedStaffPhone
            );

            if (foundUser || users.length < 1000) break;
            page++;
          }

          if (foundUser) authUserId = foundUser.id;
        }

        if (authUserId) {
          const { error: authDeleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(authUserId);

          if (authDeleteError) {
            console.error("Auth delete error:", authDeleteError);
            return Response.json(
              { error: "حساب ورود پنل حذف نشد.", details: authDeleteError.message },
              { status: 400 }
            );
          }
        }

        // staff_locations با ON DELETE CASCADE همراه متصدی حذف می‌شود
        const { error: staffDeleteError } = await ctx.supabaseAdmin
          .from("staff")
          .delete()
          .eq("id", body.staff_id);

        if (staffDeleteError) {
          console.error("Staff delete error:", staffDeleteError);
          return Response.json(
            {
              error: authUserId
                ? "حساب ورود پنل حذف شد اما اطلاعات متصدی حذف نشد."
                : "اطلاعات متصدی حذف نشد.",
              details: staffDeleteError.message,
            },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          message: authUserId
            ? "متصدی، حساب ورود پنل و محل‌های فعالیت او با موفقیت حذف شدند."
            : "متصدی و محل‌های فعالیت او با موفقیت حذف شدند.",
        });
      } catch (error) {
        console.error("Unexpected error:", error);
        return Response.json({ error: "خطای غیرمنتظره هنگام حذف متصدی رخ داد." }, { status: 500 });
      }
    }
  ),
};
