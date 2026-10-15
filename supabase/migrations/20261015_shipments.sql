-- =====================================================================
-- ماکان بار: پنل صاحبان بار، حمل دربستی / خرده‌بار و پنل متصدیان
--
-- این فایل را یک‌بار در Supabase → SQL Editor اجرا کنید.
-- بعد از اجرا، حتماً حساب مدیر را در جدول app_admins ثبت کنید (پایین فایل).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- ۰) بررسی پیش‌نیازها: اگر ستونی نباشد، پیام واضح نمایش داده می‌شود
-- ---------------------------------------------------------------------
do $$
declare
  missing text := '';
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff' and column_name = 'auth_user_id'
  ) then
    missing := missing || ' staff.auth_user_id';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff' and column_name = 'panel_enabled'
  ) then
    missing := missing || ' staff.panel_enabled';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_locations' and column_name = 'staff_id'
  ) then
    missing := missing || ' staff_locations.staff_id';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'loads' and column_name = 'driver_id'
  ) then
    missing := missing || ' loads.driver_id';
  end if;

  if missing <> '' then
    raise exception 'ستون‌های لازم در دیتابیس پیدا نشد:%', missing;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- ۱) مدیران
-- ---------------------------------------------------------------------
create table if not exists public.app_admins (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "app_admins_read_self" on public.app_admins;
create policy "app_admins_read_self" on public.app_admins
  for select to authenticated
  using (auth_user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins where auth_user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- ۲) ستون‌های جدید درخواست‌ها
-- ---------------------------------------------------------------------
alter table public.requests
  add column if not exists customer_id uuid
    references auth.users (id) on delete set null default auth.uid(),
  add column if not exists shipment_type text,
  add column if not exists direction text,
  add column if not exists city_province text,
  add column if not exists city text,
  add column if not exists pickup_address text,
  add column if not exists delivery_address text,
  add column if not exists price bigint,
  add column if not exists staff_note text,
  add column if not exists updated_at timestamptz default now();

alter table public.requests
  drop constraint if exists requests_shipment_type_check;
alter table public.requests
  add constraint requests_shipment_type_check
  check (shipment_type is null or shipment_type in ('full', 'partial'));

alter table public.requests
  drop constraint if exists requests_direction_check;
alter table public.requests
  add constraint requests_direction_check
  check (direction is null or direction in ('from_tehran', 'to_tehran'));

create index if not exists requests_customer_id_idx
  on public.requests (customer_id);
create index if not exists requests_routing_idx
  on public.requests (shipment_type, direction, city_province, city);

-- اتصال بار دربستی به درخواست اصلی
alter table public.loads
  add column if not exists request_id bigint
    references public.requests (id) on delete set null;

create unique index if not exists loads_request_id_key
  on public.loads (request_id)
  where request_id is not null;

-- ---------------------------------------------------------------------
-- ۳) آیا کاربر فعلی متصدی مسئول این خرده‌بار است؟
--    فقط خرده‌بارهای «تهران → شهرستان» به متصدی شهر مقصد می‌رسد.
--    خرده‌بارهای «شهرستان → تهران» فقط در پنل مدیر دیده می‌شوند.
--    city خالی در staff_locations یعنی کل استان.
-- ---------------------------------------------------------------------
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
  select p_type = 'partial'
    and p_direction = 'from_tehran'
    and exists (
      select 1
      from public.staff s
      join public.staff_locations l on l.staff_id = s.id
      where s.auth_user_id = auth.uid()
        and coalesce(s.panel_enabled, false)
        and l.province = p_province
        and (l.city is null or l.city = '*' or l.city = p_city)
    );
$$;

-- ---------------------------------------------------------------------
-- ۴) دسترسی‌های جدول requests
--    همه policyهای قبلی این جدول حذف و از نو ساخته می‌شوند.
--    (ثبت درخواست بدون ورود دیگر ممکن نیست؛ صاحب بار باید وارد پنل شود.)
-- ---------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'requests'
  loop
    execute format('drop policy %I on public.requests', p.policyname);
  end loop;
end $$;

alter table public.requests enable row level security;

create policy "requests_select" on public.requests
  for select to authenticated
  using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
  );

create policy "requests_insert_customer" on public.requests
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and shipment_type in ('full', 'partial')
    and direction in ('from_tehran', 'to_tehran')
    and city_province is not null
    and city is not null
    and coalesce(status, 'جدید') = 'جدید'
    and price is null
    and staff_note is null
  );

create policy "requests_insert_admin" on public.requests
  for insert to authenticated
  with check (public.is_admin());

create policy "requests_update" on public.requests
  for update to authenticated
  using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
  )
  with check (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
  );

create policy "requests_delete_admin" on public.requests
  for delete to authenticated
  using (public.is_admin());

-- محدودیت ستون‌ها برای غیرمدیر:
--   متصدی فقط status و staff_note را تغییر می‌دهد
--   صاحب بار فقط می‌تواند درخواست «جدید» خود را لغو کند
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
    locked_new := to_jsonb(new) - array['status', 'staff_note', 'updated_at'];
    locked_old := to_jsonb(old) - array['status', 'staff_note', 'updated_at'];

    if locked_new <> locked_old then
      raise exception 'متصدی فقط وضعیت و یادداشت را می‌تواند تغییر دهد.';
    end if;

    if new.status not in (
      'جدید', 'در حال پیگیری', 'تأیید شده', 'در حال حمل', 'انجام شد', 'لغو شد'
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

drop trigger if exists requests_guard_update on public.requests;
create trigger requests_guard_update
  before update on public.requests
  for each row execute function public.requests_guard_update();

-- ---------------------------------------------------------------------
-- ۵) جدول loads: مدیر بار دربستی را برای رانندگان منتشر می‌کند
-- ---------------------------------------------------------------------
drop policy if exists "loads_admin_all" on public.loads;
create policy "loads_admin_all" on public.loads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- وقتی راننده بار را پذیرفت، وضعیت درخواست صاحب بار هم به‌روز شود
create or replace function public.loads_sync_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.request_id is not null
     and new.driver_id is not null
     and old.driver_id is null then
    perform set_config('makanbar.sync', 'on', true);

    update public.requests
    set status = 'راننده تعیین شد'
    where id = new.request_id;

    perform set_config('makanbar.sync', 'off', true);
  end if;

  return new;
end;
$$;

drop trigger if exists loads_sync_request on public.loads;
create trigger loads_sync_request
  after update on public.loads
  for each row execute function public.loads_sync_request();

-- ---------------------------------------------------------------------
-- ۶) متصدی پروفایل و شهرهای خودش را ببیند
-- ---------------------------------------------------------------------
drop policy if exists "staff_read_self" on public.staff;
create policy "staff_read_self" on public.staff
  for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "staff_locations_read_self" on public.staff_locations;
create policy "staff_locations_read_self" on public.staff_locations
  for select to authenticated
  using (
    exists (
      select 1 from public.staff s
      where s.id = staff_id and s.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- ۷) صاحب بار پروفایل خودش را ببیند (برای پر کردن خودکار فرم)
-- ---------------------------------------------------------------------
-- ستون اتصال به حساب کاربری ممکن است auth_user_id، user_id یا خود id باشد
do $$
declare
  owner_column text;
begin
  if to_regclass('public.customers') is null then
    return;
  end if;

  select column_name into owner_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'customers'
    and column_name in ('auth_user_id', 'user_id', 'id')
    and data_type = 'uuid'
  order by array_position(array['auth_user_id', 'user_id', 'id'], column_name::text)
  limit 1;

  if owner_column is null then
    raise notice 'customers: ستون uuid برای اتصال به کاربر پیدا نشد؛ این مرحله رد شد.';
    return;
  end if;

  execute 'drop policy if exists "customers_read_self" on public.customers';
  execute format(
    'create policy "customers_read_self" on public.customers
       for select to authenticated
       using (%I = auth.uid())',
    owner_column
  );
end $$;

commit;

-- =====================================================================
-- مهم: حساب مدیر را ثبت کنید (ایمیل ورود پنل مدیریت را جایگزین کنید):
--
-- insert into public.app_admins (auth_user_id)
-- select id from auth.users where email = 'ADMIN_EMAIL_HERE'
-- on conflict do nothing;
-- =====================================================================
