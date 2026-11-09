-- فقط تابع driver-verify-otp (با کلید سرور) این را صدا می‌زند؛ کاربران عادی نباید بتوانند با شماره، حساب پیدا کنند
revoke execute on function public.find_orphan_auth_user_by_phone(text) from public, anon, authenticated;
grant execute on function public.find_orphan_auth_user_by_phone(text) to service_role;
-- کارهای راننده فقط برای کاربر واردشده
revoke execute on function public.accept_load(uuid) from public, anon;
revoke execute on function public.update_my_load_status(uuid, text) from public, anon;
grant execute on function public.accept_load(uuid) to authenticated;
grant execute on function public.update_my_load_status(uuid, text) to authenticated;
