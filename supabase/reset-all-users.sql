-- =====================================================================
-- پاک کردن همه کاربران و بارها برای شروع دوباره
-- می‌ماند: فقط حساب مدیر (makanbarofficial@gmail.com)
-- پاک می‌شود: همه بارها، صاحبان بار، رانندگان، متصدیان، نمایندگان و حساب‌ها
-- برگشت‌پذیر نیست. در Supabase → SQL Editor اجرا کنید.
-- =====================================================================

begin;

-- حساب‌های مدیر محافظت می‌شوند؛ اگر مدیری پیدا نشود، هیچ چیز پاک نمی‌شود
create temp table keep_users on commit drop as
  select auth_user_id as id from public.app_admins
  union select user_id from public.admins;

do $$
begin
  if (select count(*) from keep_users) = 0 then
    raise exception 'حساب مدیر پیدا نشد؛ عملیات لغو شد';
  end if;
end $$;

delete from public.loads;
delete from public.requests;
delete from public.driver_profiles;
delete from public.staff_locations;
delete from public.staff;
delete from public.customers;
delete from public.representatives;
delete from public.customer_registration_otps;
delete from public.driver_registration_otps;
delete from public.customer_password_reset_otps;
delete from auth.users where id not in (select id from keep_users);

commit;
