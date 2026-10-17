-- =====================================================================
-- ماکان بار: پیامک به صاحب بار
--   وقتی کرایه تعیین شد، راننده بار را پذیرفت، یا بار تحویل شد
-- این ستون‌ها نشان می‌دهند کدام پیامک قبلاً فرستاده شده تا تکراری نرود.
-- فقط تابع notify-customer (با service role) آن‌ها را تغییر می‌دهد.
-- =====================================================================

begin;

alter table public.requests
  add column if not exists notified_price bigint,
  add column if not exists notified_driver_at timestamptz,
  add column if not exists notified_delivered_at timestamptz;

-- بارهای قبلی پیامک قدیمی نگیرند: وضعیت فعلی‌شان «اطلاع‌داده‌شده» حساب می‌شود
update public.requests
set notified_price = price
where price is not null and notified_price is null;

update public.requests
set notified_driver_at = now()
where notified_driver_at is null
  and status in ('راننده تعیین شد', 'در حال حمل', 'انجام شد');

update public.requests
set notified_delivered_at = now()
where notified_delivered_at is null
  and status = 'انجام شد';

commit;
