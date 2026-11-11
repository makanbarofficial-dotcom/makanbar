-- نام و شماره‌ی راننده‌ای که بار را پذیرفته؛ فقط برای صاحب همان بار، متصدی مسئول آن بار یا مدیر
create or replace function public.request_driver_contacts(p_request_ids bigint[])
returns table (request_id bigint, full_name text, phone text)
language sql
stable
security definer
set search_path = public
as $fn$
  select distinct on (l.request_id) l.request_id, d.full_name, d.phone
  from public.loads l
  join public.driver_profiles d on d.id = l.driver_id
  join public.requests r on r.id = l.request_id
  where l.request_id = any(p_request_ids)
    and l.driver_id is not null
    and l.status in ('assigned', 'in_transit', 'delivered')
    and (
      public.is_admin()
      or r.customer_id = auth.uid()
      or public.is_staff_for(r.shipment_type, r.direction, r.city_province, r.city)
      or public.is_origin_rep_for(r.shipment_type, r.origin_province, r.origin_city)
      or public.is_charter_staff_for(r.shipment_type, r.origin_province, r.origin_city, r.city_province, r.city)
    )
  order by l.request_id, l.created_at desc;
$fn$;

revoke all on function public.request_driver_contacts(bigint[]) from public, anon;
grant execute on function public.request_driver_contacts(bigint[]) to authenticated;
