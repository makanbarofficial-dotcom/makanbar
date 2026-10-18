-- =====================================================================
-- ماکان بار: پیامک بار جدید به رانندگان
--   هر بار آزاد (available) که برای رانندگان ساخته می‌شود، یک‌بار برای همه‌ی
--   رانندگان تأییدشده‌ای که ماشینشان به بار می‌خورد پیامک می‌شود (تابع notify-drivers).
--   این ستون نشان می‌دهد پیامک آن بار فرستاده شده تا تکراری نرود.
-- =====================================================================

begin;

alter table public.loads add column if not exists notified_drivers_at timestamptz;

-- بارهای فعلی پیامک قدیمی نگیرند
update public.loads set notified_drivers_at = now() where notified_drivers_at is null;

commit;
