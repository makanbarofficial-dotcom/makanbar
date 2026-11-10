-- تنظیمات سایت که مدیر از بخش «تنظیمات» پنل مدیر عوض می‌کند (توابع پیامک و ثبت‌نام آن را می‌خوانند)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "app_settings_admin_read" on public.app_settings for select to authenticated using (public.is_admin());
create policy "app_settings_admin_insert" on public.app_settings for insert to authenticated with check (public.is_admin());
create policy "app_settings_admin_update" on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.app_settings to authenticated;
grant select on public.app_settings to service_role;

insert into public.app_settings (key, value) values
  ('sms_driver_broadcast', 'false'),
  ('sms_driver_assigned', 'true'),
  ('sms_welcome', 'true'),
  ('sms_customer', 'true'),
  ('sms_new_request', 'true'),
  ('admin_notify_phones', '["09125573776"]'),
  ('welcome_message', '"سلام، ممنونیم که عضو خانواده ماکان بار شدید. هر وقت کاری داشتید در خدمتیم.\nmakanbar.com"'),
  ('driver_auto_approve', 'true')
on conflict (key) do nothing;
