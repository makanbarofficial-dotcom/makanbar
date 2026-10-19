-- =====================================================================
-- ماکان بار: انتخاب راننده/پیک توسط متصدی درون‌شهری
--   متصدی درون‌شهری فهرست رانندگان تأییدشده را می‌بیند و بار شهر خودش را
--   مستقیم به یکی از آن‌ها می‌دهد (بدون ارسال عمومی برای همه‌ی رانندگان).
--   پیامک به راننده‌ی انتخاب‌شده را تابع notify-drivers می‌فرستد
--   (بار «assigned» با notified_drivers_at خالی یعنی پیامک واگذاری هنوز نرفته).
-- =====================================================================

begin;

-- ۱) فهرست رانندگان تأییدشده برای متصدی درون‌شهری
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
as $$
begin
  if not exists (
    select 1 from public.staff s
    where s.auth_user_id = auth.uid() and coalesce(s.panel_enabled, false) and s.kind = 'intracity'
  ) then
    raise exception 'فقط متصدی درون‌شهری به فهرست رانندگان دسترسی دارد.';
  end if;

  return query
    select d.id, d.full_name, d.phone, d.vehicle_type, d.vehicle_model, d.vehicle_plate
    from public.driver_profiles d
    where d.status = 'approved'
    order by d.full_name;
end;
$$;

-- ۲) واگذاری بار درون‌شهری به یک راننده
create or replace function public.assign_intracity_driver(p_request_id bigint, p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_staff_id bigint;
  v_load public.loads%rowtype;
begin
  select * into v_request from public.requests where id = p_request_id;

  if not found
     or v_request.shipment_type <> 'intracity'
     or not public.is_staff_for(v_request.shipment_type, v_request.direction, v_request.city_province, v_request.city) then
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

    -- پیامک واگذاری به راننده: notified_drivers_at دوباره خالی می‌شود
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
      'assigned', p_driver_id, v_request.description, v_staff_id, 'intracity', 'charter'
    );
  end if;

  perform set_config('makanbar.sync', 'on', true);
  update public.requests set status = 'راننده تعیین شد' where id = p_request_id;
  perform set_config('makanbar.sync', 'off', true);
end;
$$;

revoke all on function public.list_drivers_for_intracity_staff() from public, anon;
revoke all on function public.assign_intracity_driver(bigint, uuid) from public, anon;
grant execute on function public.list_drivers_for_intracity_staff() to authenticated;
grant execute on function public.assign_intracity_driver(bigint, uuid) to authenticated;

commit;
