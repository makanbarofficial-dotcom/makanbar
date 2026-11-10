-- مدیر پنل یک متصدی را می‌بیند: همان بارهایی که آن متصدی در پنلش می‌بیند
-- (همان قواعد is_staff_for / is_origin_rep_for / is_charter_staff_for، ولی برای متصدی انتخاب‌شده)
create or replace function public.admin_staff_requests(p_staff_id bigint)
returns setof public.requests
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_kind text;
begin
  if not public.is_admin() then
    raise exception 'فقط مدیر می‌تواند پنل متصدی را ببیند.';
  end if;

  select coalesce(kind, 'intercity') into v_kind from public.staff where id = p_staff_id;
  if not found then
    return;
  end if;

  return query
    select r.*
    from public.requests r
    where exists (
      select 1 from public.staff_locations l
      where l.staff_id = p_staff_id
        and (
          (v_kind = 'intercity' and r.shipment_type = 'partial' and r.direction = 'from_tehran'
            and l.province = r.city_province and (l.city is null or l.city = '*' or l.city = r.city))
          or (v_kind = 'intracity' and r.shipment_type = 'intracity'
            and l.province = r.city_province and (l.city is null or l.city = '*' or l.city = r.city))
          or (v_kind = 'origin' and r.shipment_type = 'partial' and coalesce(r.direction, '') <> 'from_tehran'
            and l.province = r.origin_province and (l.city is null or l.city = '*' or l.city = r.origin_city))
          or (v_kind = 'charter' and r.shipment_type = 'full'
            and (l.province = '*'
              or (l.province = r.origin_province and (l.city is null or l.city = '*' or l.city = r.origin_city))
              or (l.province = r.city_province and (l.city is null or l.city = '*' or l.city = r.city))))
        )
    )
    order by r.created_at desc;
end;
$fn$;

revoke all on function public.admin_staff_requests(bigint) from public, anon;
grant execute on function public.admin_staff_requests(bigint) to authenticated;
