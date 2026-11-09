-- =====================================================================
-- ماکان بار: متصدی دربستی
--   متصدی دربستی (staff.kind = 'charter') بارهای دربستی‌ای را می‌بیند که مبدا یا مقصد
--   آن‌ها یکی از شهرهای اوست؛ کرایه و وضعیت را تعیین می‌کند، بار تلفنی دربستی ثبت می‌کند
--   و بار را برای رانندگان می‌فرستد یا مستقیم به یک راننده می‌دهد.
-- =====================================================================

begin;

-- ۱) نوع جدید متصدی
alter table public.staff drop constraint if exists staff_kind_check;
alter table public.staff add constraint staff_kind_check
  check (kind in ('intercity', 'intracity', 'origin', 'charter'));

-- ۲) آیا کاربر فعلی متصدی دربستی شهر مبدا یا مقصد این بار است؟
create or replace function public.is_charter_staff_for(
  p_type text,
  p_origin_province text,
  p_origin_city text,
  p_province text,
  p_city text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select p_type = 'full'
    and exists (
      select 1
      from public.staff s
      join public.staff_locations l on l.staff_id = s.id
      where s.auth_user_id = auth.uid()
        and coalesce(s.panel_enabled, false)
        and s.kind = 'charter'
        and (
          (l.province = p_origin_province
            and (l.city is null or l.city = '*' or l.city = p_origin_city))
          or (l.province = p_province
            and (l.city is null or l.city = '*' or l.city = p_city))
        )
    );
$fn$;

revoke all on function public.is_charter_staff_for(text, text, text, text, text) from public, anon;
grant execute on function public.is_charter_staff_for(text, text, text, text, text) to authenticated;

-- ۳) دیدن و ویرایش بار
alter policy "requests_select" on public.requests
  using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
    or public.is_origin_rep_for(shipment_type, origin_province, origin_city)
    or public.is_charter_staff_for(shipment_type, origin_province, origin_city, city_province, city)
    or public.is_driver_for(id)
  );

alter policy "requests_update" on public.requests
  using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
    or public.is_origin_rep_for(shipment_type, origin_province, origin_city)
    or public.is_charter_staff_for(shipment_type, origin_province, origin_city, city_province, city)
  )
  with check (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
    or public.is_origin_rep_for(shipment_type, origin_province, origin_city)
    or public.is_charter_staff_for(shipment_type, origin_province, origin_city, city_province, city)
  );

-- ۴) بار تلفنی دربستی
drop policy if exists "requests_insert_charter_staff" on public.requests;
create policy "requests_insert_charter_staff" on public.requests
  for insert to authenticated
  with check (
    customer_id is null
    and shipment_type = 'full'
    and direction in ('from_tehran', 'to_tehran', 'between_cities')
    and public.is_charter_staff_for(shipment_type, origin_province, origin_city, city_province, city)
    and coalesce(status, 'جدید') = 'جدید'
    and (price is null or price >= 0)
  );

-- ۵) نگهبان ویرایش: متصدی دربستی هم فقط وضعیت، کرایه و یادداشت را تغییر می‌دهد
--    (همان تابع فعلی دیتابیس، فقط شرط متصدی دربستی به شاخه‌ی متصدی اضافه می‌شود)
do $do$
declare
  d text;
begin
  d := pg_get_functiondef('public.requests_guard_update()'::regprocedure);
  if position('is_charter_staff_for' in d) = 0 then
    d := replace(
      d,
      'or public.is_origin_rep_for(old.shipment_type, old.origin_province, old.origin_city) then',
      'or public.is_origin_rep_for(old.shipment_type, old.origin_province, old.origin_city)
     or public.is_charter_staff_for(old.shipment_type, old.origin_province, old.origin_city, old.city_province, old.city) then'
    );
    if position('is_charter_staff_for' in d) = 0 then
      raise exception 'requests_guard_update: staff branch not found';
    end if;
    execute d;
  end if;
end;
$do$;

-- ۶) متصدی دربستی بار محدوده‌ی خودش را برای رانندگان می‌فرستد
drop policy if exists "loads_charter_staff_publish" on public.loads;
create policy "loads_charter_staff_publish" on public.loads
  for insert to authenticated
  with check (
    handled_by_staff_id = public.current_staff_id()
    and driver_id is null
    and status = 'available'
    and shipment_type = 'charter'
    and request_id is not null
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and r.shipment_type = 'full'
        and public.is_charter_staff_for(r.shipment_type, r.origin_province, r.origin_city, r.city_province, r.city)
    )
  );

-- ۷) فهرست رانندگان: متصدی درون‌شهری و دربستی
create or replace function public.list_drivers_for_intracity_staff()
returns table (
  id uuid,
  full_name text,
  phone text,
  vehicle_type text,
  vehicle_model text,
  vehicle_plate text
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if not exists (
    select 1 from public.staff s
    where s.auth_user_id = auth.uid()
      and coalesce(s.panel_enabled, false)
      and s.kind in ('intracity', 'charter')
  ) then
    raise exception 'فقط متصدی درون‌شهری و دربستی به فهرست رانندگان دسترسی دارد.';
  end if;

  return query
    select d.id, d.full_name, d.phone, d.vehicle_type, d.vehicle_model, d.vehicle_plate
    from public.driver_profiles d
    where d.status = 'approved'
    order by d.full_name;
end;
$fn$;

-- ۸) واگذاری مستقیم بار به راننده: درون‌شهری یا دربستی
create or replace function public.assign_intracity_driver(p_request_id bigint, p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_request public.requests%rowtype;
  v_staff_id bigint;
  v_load public.loads%rowtype;
  v_allowed boolean;
begin
  select * into v_request from public.requests where id = p_request_id;

  if not found then
    raise exception 'این بار در محدوده‌ی شما نیست.';
  end if;

  if v_request.shipment_type = 'intracity' then
    v_allowed := public.is_staff_for(v_request.shipment_type, v_request.direction, v_request.city_province, v_request.city);
  elsif v_request.shipment_type = 'full' then
    v_allowed := public.is_charter_staff_for(
      v_request.shipment_type, v_request.origin_province, v_request.origin_city,
      v_request.city_province, v_request.city
    );
  else
    v_allowed := false;
  end if;

  if not coalesce(v_allowed, false) then
    raise exception 'این بار در محدوده‌ی شما نیست.';
  end if;

  if coalesce(v_request.status, 'جدید') in ('انجام شد', 'لغو شد') then
    raise exception 'بار پایان‌یافته قابل تغییر نیست.';
  end if;

  if v_request.price is null then
    raise exception 'اول کرایه را ثبت کنید.';
  end if;

  if not exists (select 1 from public.driver_profiles where id = p_driver_id and status = 'approved') then
    raise exception 'راننده انتخاب‌شده تأیید نشده است.';
  end if;

  v_staff_id := public.current_staff_id();

  select * into v_load from public.loads where request_id = p_request_id;

  if found then
    if v_load.driver_id is not null or v_load.status <> 'available' then
      raise exception 'برای این بار قبلاً راننده تعیین شده است.';
    end if;

    update public.loads
    set driver_id = p_driver_id, status = 'assigned', notified_drivers_at = null
    where id = v_load.id;
  else
    insert into public.loads (
      request_id, origin, destination, cargo_type, weight, vehicle_type, price,
      status, driver_id, description, handled_by_staff_id, load_type, shipment_type
    ) values (
      v_request.id, v_request.origin, v_request.destination, v_request.cargo_type,
      v_request.weight, nullif(v_request.vehicle_type, ''), v_request.price,
      'assigned', p_driver_id, v_request.description, v_staff_id,
      case when v_request.shipment_type = 'intracity' then 'intracity' end, 'charter'
    );
  end if;

  perform set_config('makanbar.sync', 'on', true);
  update public.requests set status = 'راننده تعیین شد' where id = p_request_id;
  perform set_config('makanbar.sync', 'off', true);
end;
$fn$;

revoke all on function public.list_drivers_for_intracity_staff() from public, anon;
revoke all on function public.assign_intracity_driver(bigint, uuid) from public, anon;
grant execute on function public.list_drivers_for_intracity_staff() to authenticated;
grant execute on function public.assign_intracity_driver(bigint, uuid) to authenticated;

commit;
