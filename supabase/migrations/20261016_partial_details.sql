-- =====================================================================
-- ماکان بار: جزئیات خرده‌بار، روش تحویل و تعیین کرایه توسط متصدی
-- =====================================================================

begin;

-- ۱) ستون‌های جدید
alter table public.requests
  add column if not exists quantity text,
  add column if not exists dimensions text,
  add column if not exists delivery_mode text;

alter table public.requests
  drop constraint if exists requests_delivery_mode_check;
alter table public.requests
  add constraint requests_delivery_mode_check
  check (delivery_mode is null or delivery_mode in ('terminal', 'door_to_door'));

-- ۲) متصدی علاوه بر وضعیت و یادداشت، کرایه را هم تعیین می‌کند
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

commit;
