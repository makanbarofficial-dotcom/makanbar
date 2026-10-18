-- =====================================================================
-- ماکان بار: بار درون‌شهری
--   صاحب بار بار درون‌شهری ثبت می‌کند (مبدا و مقصد در یک شهر).
--   فقط مدیر و «متصدی درون‌شهری» همان شهر آن را می‌بینند.
--   متصدی درون‌شهری خودش هم بار تلفنی ثبت می‌کند و بار را برای رانندگان می‌فرستد.
--   همچنین: تغییر شهرهای متصدی‌ها فقط با مدیر (قبلاً هر کاربری می‌توانست).
-- =====================================================================

begin;

-- ۱) نوع و جهت جدید
alter table public.requests drop constraint if exists requests_shipment_type_check;
alter table public.requests add constraint requests_shipment_type_check
  check (shipment_type is null or shipment_type in ('full', 'partial', 'intracity'));

alter table public.requests drop constraint if exists requests_direction_check;
alter table public.requests add constraint requests_direction_check
  check (direction is null or direction in ('from_tehran', 'to_tehran', 'between_cities', 'intracity'));

-- ۲) نوع متصدی: بین‌شهری (خرده‌بار تهران ← شهرستان) یا درون‌شهری
alter table public.staff add column if not exists kind text not null default 'intercity';
alter table public.staff drop constraint if exists staff_kind_check;
alter table public.staff add constraint staff_kind_check check (kind in ('intercity', 'intracity'));

-- ۳) متصدی مسئول: خرده‌بار تهران ← شهر او (بین‌شهری) یا بار درون‌شهری شهر او (درون‌شهری)
create or replace function public.is_staff_for(
  p_type text,
  p_direction text,
  p_province text,
  p_city text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    join public.staff_locations l on l.staff_id = s.id
    where s.auth_user_id = auth.uid()
      and coalesce(s.panel_enabled, false)
      and l.province = p_province
      and (l.city is null or l.city = '*' or l.city = p_city)
      and (
        (p_type = 'partial' and p_direction = 'from_tehran' and s.kind = 'intercity')
        or (p_type = 'intracity' and s.kind = 'intracity')
      )
  );
$$;

-- ۴) صاحب بار می‌تواند بار درون‌شهری هم ثبت کند
alter policy "requests_insert_customer" on public.requests
  with check (
    customer_id = auth.uid()
    and exists (select 1 from public.customers c where c.auth_user_id = auth.uid())
    and shipment_type in ('full', 'partial', 'intracity')
    and direction in ('from_tehran', 'to_tehran', 'between_cities', 'intracity')
    and (shipment_type = 'intracity') = (direction = 'intracity')
    and city_province is not null
    and city is not null
    and coalesce(status, 'جدید') = 'جدید'
    and price is null
    and staff_note is null
  );

-- ۵) متصدی درون‌شهری بار تلفنی شهر خودش را ثبت می‌کند
drop policy if exists "requests_insert_intracity_staff" on public.requests;
create policy "requests_insert_intracity_staff" on public.requests
  for insert to authenticated
  with check (
    customer_id is null
    and shipment_type = 'intracity'
    and direction = 'intracity'
    and public.is_staff_for(shipment_type, direction, city_province, city)
    and coalesce(status, 'جدید') = 'جدید'
    and (price is null or price >= 0)
  );

-- ۶) متصدی می‌تواند بار را «ارسال به رانندگان» کند
create or replace function public.requests_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_new jsonb;
  locked_old jsonb;
begin
  new.updated_at := now();

  if auth.uid() is null
     or public.is_admin()
     or current_setting('makanbar.sync', true) = 'on' then
    return new;
  end if;

  if public.is_staff_for(old.shipment_type, old.direction, old.city_province, old.city) then
    locked_new := to_jsonb(new) - array['status', 'staff_note', 'price', 'updated_at'];
    locked_old := to_jsonb(old) - array['status', 'staff_note', 'price', 'updated_at'];

    if locked_new <> locked_old then
      raise exception 'متصدی فقط وضعیت، کرایه و یادداشت را می‌تواند تغییر دهد.';
    end if;

    if new.price is not null and new.price < 0 then
      raise exception 'کرایه نمی‌تواند منفی باشد.';
    end if;

    if new.status not in (
      'جدید', 'در حال پیگیری', 'تأیید شده', 'ارسال به رانندگان', 'در حال حمل', 'انجام شد', 'لغو شد'
    ) then
      raise exception 'وضعیت انتخاب‌شده مجاز نیست.';
    end if;

    return new;
  end if;

  if old.customer_id = auth.uid() then
    locked_new := to_jsonb(new) - array['status', 'updated_at'];
    locked_old := to_jsonb(old) - array['status', 'updated_at'];

    if locked_new = locked_old
       and coalesce(old.status, 'جدید') = 'جدید'
       and new.status = 'لغو شد' then
      return new;
    end if;

    raise exception 'فقط درخواست‌های جدید قابل لغو هستند.';
  end if;

  raise exception 'دسترسی غیرمجاز.';
end;
$$;

-- ۷) متصدی درون‌شهری بار شهر خودش را برای رانندگان می‌فرستد
--    (خواندن و لغو همان سیاست‌های loads_staff_read_own و loads_staff_cancel_own است)
drop policy if exists "loads_intracity_staff_publish" on public.loads;
create policy "loads_intracity_staff_publish" on public.loads
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
        and r.shipment_type = 'intracity'
        and public.is_staff_for(r.shipment_type, r.direction, r.city_province, r.city)
    )
  );

-- ۸) فقط مدیر شهرهای متصدی‌ها را تغییر می‌دهد
alter policy "Authenticated can insert staff locations" on public.staff_locations
  with check (public.is_admin());
alter policy "Authenticated can update staff locations" on public.staff_locations
  using (public.is_admin()) with check (public.is_admin());
alter policy "Authenticated can delete staff locations" on public.staff_locations
  using (public.is_admin());

commit;
