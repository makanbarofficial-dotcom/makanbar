-- استان‌های محل فعالیت راننده (کلید انگلیسی استان‌ها، مثل tehran و razavi-khorasan)
alter table public.driver_profiles add column if not exists active_provinces text[];

-- راننده فقط استان‌های خودش را عوض می‌کند (بقیه‌ی پروفایل دست نمی‌خورد)
create or replace function public.set_my_active_provinces(p_provinces text[])
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_clean text[];
begin
  select coalesce(array_agg(distinct trim(p)), '{}')
    into v_clean
    from unnest(coalesce(p_provinces, '{}')) as p
    where trim(p) <> '' and length(trim(p)) <= 40;

  if array_length(v_clean, 1) > 40 then
    raise exception 'تعداد استان‌ها بیش از حد است.';
  end if;

  update public.driver_profiles
    set active_provinces = v_clean
    where auth_user_id = auth.uid();

  if not found then
    raise exception 'پروفایل راننده پیدا نشد.';
  end if;
end;
$fn$;

revoke all on function public.set_my_active_provinces(text[]) from public, anon;
grant execute on function public.set_my_active_provinces(text[]) to authenticated;
