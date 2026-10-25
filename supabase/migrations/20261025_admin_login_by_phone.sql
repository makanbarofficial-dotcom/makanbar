-- =====================================================================
-- ماکان بار: ورود مدیر با شماره موبایل
--   مدیر اصلی با جیمیل ثبت شده بود و شماره‌ای نداشت؛ با شماره وارد نمی‌شد.
--   صفحه‌ی ورود با این تابع ایمیل واقعی حساب مدیرِ آن شماره را پیدا می‌کند.
-- =====================================================================

begin;

update public.app_admins set phone = '+989125573776' where role = 'owner' and phone is null;

create or replace function public.admin_login_email(p_phone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.app_admins a
  join auth.users u on u.id = a.auth_user_id
  where a.phone = p_phone
  limit 1;
$$;

revoke all on function public.admin_login_email(text) from public;
grant execute on function public.admin_login_email(text) to anon, authenticated;

commit;
