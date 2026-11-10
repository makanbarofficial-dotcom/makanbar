-- تاریخچه‌ی پیامک‌هایی که مدیر از بخش «پیامک» پنل مدیر می‌فرستد
create table if not exists public.admin_sms_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  sent_by uuid,
  message text not null,
  audience text,
  recipients int not null default 0,
  sent int not null default 0,
  failed int not null default 0,
  finished_at timestamptz
);
alter table public.admin_sms_log enable row level security;
create policy "admin_sms_log_admin_read" on public.admin_sms_log
  for select to authenticated using (public.is_admin());
grant select on public.admin_sms_log to authenticated;
grant select, insert, update on public.admin_sms_log to service_role;
