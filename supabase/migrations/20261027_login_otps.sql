-- کدهای ورود پیامکی صاحبان بار و رانندگان؛ فقط تابع login-otp (با کلید سرویس) به آن دسترسی دارد
create table if not exists public.login_otps (
  id bigint generated always as identity primary key,
  phone text not null,
  role text not null check (role in ('customer', 'driver')),
  otp_code text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  unique (phone, role)
);
alter table public.login_otps enable row level security;

-- جدول‌های تازه دسترسی پیش‌فرض ندارند؛ فقط نقش سرویس (توابع) به آن دسترسی دارد
grant select, insert, update, delete on public.login_otps to service_role;
