-- =====================================================================
-- ماکان بار: پنل نمایندگان شهرها
--   نماینده (staff.kind = 'origin') خرده‌بارهایی را می‌بیند که «مبدا»ی آن‌ها شهر خودش است
--   (به تهران یا هر شهر دیگر)، کرایه و وضعیت را تعیین می‌کند و بار تلفنی شهر خودش را ثبت می‌کند.
--   برای این کار شهر مبدا هم جداگانه در requests ذخیره می‌شود (origin_province / origin_city).
-- =====================================================================

begin;

-- ۱) شهر مبدا هر بار
alter table public.requests
  add column if not exists origin_province text,
  add column if not exists origin_city text;

-- بارهای قبلی: مبدا بار «شهرستان ← تهران» همان city است و مبدا «تهران ← شهرستان» تهران
update public.requests
set origin_province = city_province, origin_city = city
where origin_province is null and direction in ('to_tehran', 'intracity');

update public.requests
set origin_province = 'tehran', origin_city = 'tehran'
where origin_province is null and direction = 'from_tehran';

-- ۲) نوع جدید متصدی: نماینده‌ی شهر (مبدا)
alter table public.staff drop constraint if exists staff_kind_check;
alter table public.staff add constraint staff_kind_check
  check (kind in ('intercity', 'intracity', 'origin'));

-- ۳) آیا کاربر فعلی نماینده‌ی شهر مبدا این خرده‌بار است؟
create or replace function public.is_origin_rep_for(
  p_type text,
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
    and p_province is not null
    and exists (
      select 1
      from public.staff s
      join public.staff_locations l on l.staff_id = s.id
      where s.auth_user_id = auth.uid()
        and coalesce(s.panel_enabled, false)
        and s.kind = 'origin'
        and l.province = p_province
        and (l.city is null or l.city = '*' or l.city = p_city)
    );
$$;

-- ۴) دیدن و ویرایش بار
alter policy "requests_select" on public.requests
  using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
    or public.is_origin_rep_for(shipment_type, origin_province, origin_city)
    or public.is_driver_for(id)
  );

alter policy "requests_update" on public.requests
  using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
    or public.is_origin_rep_for(shipment_type, origin_province, origin_city)
  )
  with check (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_staff_for(shipment_type, direction, city_province, city)
    or public.is_origin_rep_for(shipment_type, origin_province, origin_city)
  );

-- ۵) بار تلفنی نماینده: فقط خرده‌بار با مبدا شهر خودش
create policy "requests_insert_origin_rep" on public.requests
  for insert to authenticated
  with check (
    customer_id is null
    and shipment_type = 'partial'
    and direction in ('to_tehran', 'between_cities')
    and public.is_origin_rep_for(shipment_type, origin_province, origin_city)
    and coalesce(status, 'جدید') = 'جدید'
    and (price is null or price >= 0)
  );

-- ۶) نگهبان ویرایش: نماینده هم مثل متصدی فقط وضعیت، کرایه و یادداشت را تغییر می‌دهد
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

  if public.is_staff_for(old.shipment_type, old.direction, old.city_province, old.city)
     or public.is_origin_rep_for(old.shipment_type, old.origin_province, old.origin_city) then
    -- متصدی درون‌شهری: بار پایان‌یافته قفل است و کرایه‌ی ثبت‌شده عوض نمی‌شود
    if old.shipment_type = 'intracity' then
      if coalesce(old.status, 'جدید') in ('انجام شد', 'لغو شد') then
        raise exception 'بار پایان‌یافته قابل تغییر نیست.';
      end if;

      if old.price is not null and new.price is distinct from old.price then
        raise exception 'کرایه‌ی ثبت‌شده قابل تغییر نیست؛ برای تغییر با مدیریت تماس بگیرید.';
      end if;
    end if;

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

commit;
