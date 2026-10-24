-- =====================================================================
-- ماکان بار: بار تلفنی متصدی خرده‌بار تهران
--   متصدی خرده‌بار تهران برای مشتری‌ای که زنگ زده، خرده‌بار «تهران ← شهرهای خودش» ثبت می‌کند.
-- =====================================================================

begin;

create policy "requests_insert_intercity_staff" on public.requests
  for insert to authenticated
  with check (
    customer_id is null
    and shipment_type = 'partial'
    and direction = 'from_tehran'
    and public.is_staff_for(shipment_type, direction, city_province, city)
    and coalesce(status, 'جدید') = 'جدید'
    and (price is null or price >= 0)
  );

commit;
