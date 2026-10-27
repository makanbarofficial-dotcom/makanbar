-- کد ملی و تاریخ تولد (شمسی، به شکل ۱۳۷۰/۰۵/۱۲) برای صاحبان بار و رانندگان
alter table public.customers add column if not exists national_code text, add column if not exists birth_date text;
alter table public.customer_registration_otps add column if not exists national_code text, add column if not exists birth_date text;
alter table public.driver_profiles add column if not exists national_code text, add column if not exists birth_date text;
alter table public.driver_registration_otps add column if not exists national_code text, add column if not exists birth_date text;
