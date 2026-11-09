-- این دو ستون اشتباهی اضافه شدند و استفاده نمی‌شوند: نوع بارگیر راننده از قبل در driver_profiles.vehicle_model ذخیره می‌شود.
-- (حذفشان به تأیید دستی در Supabase نیاز دارد؛ خالی و بی‌خطر هستند.)
alter table public.driver_profiles add column if not exists vehicle_body_type text;
alter table public.driver_registration_otps add column if not exists vehicle_body_type text;
