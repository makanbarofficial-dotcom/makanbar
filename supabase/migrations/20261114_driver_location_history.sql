-- =====================================================================
-- ماکان بار: تاریخچه‌ی جابه‌جایی رانندگان (برای مسیر روی نقشه‌ی پنل مدیر)
--   هر موقعیتی که راننده با اجازه‌ی خودش می‌فرستد، به تاریخچه هم اضافه می‌شود.
--   تاریخچه‌ی قدیمی‌تر از ۳۰ روز خودکار پاک می‌شود. با خاموش کردن اشتراک،
--   تاریخچه‌ی همان راننده هم پاک می‌شود. فقط مدیر می‌بیند.
-- =====================================================================

create table if not exists public.driver_location_history (
  id bigint generated always as identity primary key,
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy real,
  recorded_at timestamptz not null default now()
);

create index if not exists driver_location_history_driver_time_idx
  on public.driver_location_history (driver_id, recorded_at);
create index if not exists driver_location_history_time_idx
  on public.driver_location_history (recorded_at);

alter table public.driver_location_history enable row level security;

create policy "driver_location_history_admin_read" on public.driver_location_history
  for select to authenticated using (public.is_admin());

grant select on public.driver_location_history to authenticated;
grant select, insert, update, delete on public.driver_location_history to service_role;

-- ثبت موقعیت: آخرین موقعیت + تاریخچه
create or replace function public.report_my_location(p_lat double precision, p_lng double precision, p_accuracy real default null)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_driver uuid;
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'موقعیت نامعتبر است.';
  end if;

  select id into v_driver from public.driver_profiles where auth_user_id = auth.uid();
  if v_driver is null then
    raise exception 'پروفایل راننده پیدا نشد.';
  end if;

  update public.driver_locations
    set lat = p_lat, lng = p_lng, accuracy = p_accuracy, located_at = now(), updated_at = now()
    where driver_id = v_driver and sharing;

  if not found then
    return;
  end if;

  insert into public.driver_location_history (driver_id, lat, lng, accuracy)
  values (v_driver, p_lat, p_lng, p_accuracy);

  -- پاکسازی تاریخچه‌ی قدیمی همین راننده (با ایندکس، سبک است)
  delete from public.driver_location_history
    where driver_id = v_driver and recorded_at < now() - interval '30 days';
end;
$fn$;

revoke all on function public.report_my_location(double precision, double precision, real) from public, anon;
grant execute on function public.report_my_location(double precision, double precision, real) to authenticated;

-- خاموش کردن اشتراک، تاریخچه را هم پاک می‌کند
create or replace function public.set_my_location_sharing(p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_driver uuid;
begin
  select id into v_driver from public.driver_profiles where auth_user_id = auth.uid();
  if v_driver is null then
    raise exception 'پروفایل راننده پیدا نشد.';
  end if;

  insert into public.driver_locations (driver_id, sharing)
  values (v_driver, coalesce(p_on, false))
  on conflict (driver_id) do update
    set sharing = excluded.sharing,
        lat = case when excluded.sharing then driver_locations.lat end,
        lng = case when excluded.sharing then driver_locations.lng end,
        accuracy = case when excluded.sharing then driver_locations.accuracy end,
        located_at = case when excluded.sharing then driver_locations.located_at end,
        updated_at = now();

  if not coalesce(p_on, false) then
    delete from public.driver_location_history where driver_id = v_driver;
  end if;
end;
$fn$;

revoke all on function public.set_my_location_sharing(boolean) from public, anon;
grant execute on function public.set_my_location_sharing(boolean) to authenticated;
