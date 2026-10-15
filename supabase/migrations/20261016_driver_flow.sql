-- =====================================================================
-- ماکان بار: چرخه کامل راننده
--   تأیید راننده توسط مدیر، پذیرش بار، اعلام حرکت و تحویل،
--   و دیدن جزئیات کار (آدرس و تلفن صاحب بار) برای راننده‌ی همان بار
-- =====================================================================

begin;

-- ۱) مدیر همه رانندگان را می‌بیند و تأیید/رد می‌کند
create policy "driver_profiles_admin_read" on public.driver_profiles
  for select to authenticated
  using (public.is_admin());

create policy "driver_profiles_admin_update" on public.driver_profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ۲) پذیرش بار؛ فقط راننده‌ی تأییدشده و فقط اگر بار هنوز آزاد باشد.
--    اولین راننده برنده می‌شود و بقیه false می‌گیرند.
create or replace function public.accept_load(p_load_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
begin
  select id into v_driver_id
  from public.driver_profiles
  where auth_user_id = auth.uid() and status = 'approved';

  if v_driver_id is null then
    raise exception 'فقط رانندگان تأییدشده می‌توانند بار بپذیرند.';
  end if;

  update public.loads
  set driver_id = v_driver_id, status = 'assigned'
  where id = p_load_id
    and status = 'available'
    and driver_id is null;

  return found;
end;
$$;

-- ۳) راننده حرکت و تحویل بار خودش را اعلام می‌کند؛ وضعیت صاحب بار هم به‌روز می‌شود
create or replace function public.update_my_load_status(p_load_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id bigint;
  v_current text;
begin
  if p_status not in ('in_transit', 'delivered') then
    raise exception 'وضعیت نامعتبر است.';
  end if;

  select l.request_id, l.status into v_request_id, v_current
  from public.loads l
  join public.driver_profiles d on d.id = l.driver_id
  where l.id = p_load_id and d.auth_user_id = auth.uid();

  if not found then
    raise exception 'این بار به شما تعلق ندارد.';
  end if;

  if (p_status = 'in_transit' and v_current <> 'assigned')
     or (p_status = 'delivered' and v_current <> 'in_transit') then
    raise exception 'ترتیب وضعیت‌ها رعایت نشده است.';
  end if;

  update public.loads set status = p_status where id = p_load_id;

  if v_request_id is not null then
    perform set_config('makanbar.sync', 'on', true);

    update public.requests
    set status = case p_status when 'in_transit' then 'در حال حمل' else 'انجام شد' end
    where id = v_request_id;

    perform set_config('makanbar.sync', 'off', true);
  end if;
end;
$$;

-- ۴) راننده‌ی یک بار، درخواست اصلی آن (آدرس‌ها و تلفن صاحب بار) را می‌بیند
create or replace function public.is_driver_for(p_request_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.loads l
    join public.driver_profiles d on d.id = l.driver_id
    where l.request_id = p_request_id and d.auth_user_id = auth.uid()
  );
$$;

alter policy "requests_select" on public.requests
  using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
    or public.is_driver_for(id)
  );

commit;
