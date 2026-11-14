-- =====================================================================
-- ماکان بار: موقعیت راننده با اجازه‌ی خودش
--   راننده در پنلش «اشتراک موقعیت» را روشن می‌کند؛ تا وقتی پنل باز است
--   آخرین موقعیتش ذخیره می‌شود و فقط مدیر آن را می‌بیند.
--   با خاموش کردن، موقعیت ذخیره‌شده هم پاک می‌شود.
-- =====================================================================

create table if not exists public.driver_locations (
  driver_id uuid primary key references public.driver_profiles(id) on delete cascade,
  sharing boolean not null default false,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  accuracy real,
  located_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.driver_locations enable row level security;

create policy "driver_locations_admin_read" on public.driver_locations
  for select to authenticated using (public.is_admin());
create policy "driver_locations_own_read" on public.driver_locations
  for select to authenticated using (
    exists (select 1 from public.driver_profiles d where d.id = driver_id and d.auth_user_id = auth.uid())
  );

grant select on public.driver_locations to authenticated;
grant select, insert, update, delete on public.driver_locations to service_role;

-- روشن/خاموش کردن اشتراک موقعیت توسط خود راننده
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
end;
$fn$;

revoke all on function public.set_my_location_sharing(boolean) from public, anon;
grant execute on function public.set_my_location_sharing(boolean) to authenticated;

-- ثبت آخرین موقعیت؛ فقط وقتی خود راننده اشتراک را روشن کرده باشد
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
end;
$fn$;

revoke all on function public.report_my_location(double precision, double precision, real) from public, anon;
grant execute on function public.report_my_location(double precision, double precision, real) to authenticated;
