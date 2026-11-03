-- راننده‌ای که قبل از اضافه شدن کد ملی، تاریخ تولد و شماره هوشمند ثبت‌نام کرده، خودش آن‌ها را تکمیل می‌کند.
-- راننده اجازه‌ی ویرایش مستقیم پروفایل را ندارد (تا وضعیت یا خودرو را عوض نکند)؛ فقط همین سه ستون از این تابع پر می‌شوند.
create or replace function public.complete_driver_profile(
  p_national_code text,
  p_birth_date text,
  p_fleet_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_id uuid;
  v_vehicle text;
  v_sum int := 0;
  v_rem int;
  v_check int;
  v_fleet text := nullif(regexp_replace(coalesce(p_fleet_number, ''), '\D', '', 'g'), '');
begin
  select id, vehicle_type into v_id, v_vehicle
  from public.driver_profiles
  where auth_user_id = auth.uid();

  if v_id is null then
    raise exception 'پروفایل راننده پیدا نشد.';
  end if;

  -- رقم کنترل کد ملی (همان بررسی components/identity-fields.tsx)
  if p_national_code !~ '^\d{10}$' or p_national_code ~ '^(\d)\1{9}$' then
    raise exception 'کد ملی معتبر نیست.';
  end if;
  for i in 1..9 loop
    v_sum := v_sum + substr(p_national_code, i, 1)::int * (11 - i);
  end loop;
  v_rem := v_sum % 11;
  v_check := v_rem;
  if v_rem >= 2 then
    v_check := 11 - v_rem;
  end if;
  if substr(p_national_code, 10, 1)::int <> v_check then
    raise exception 'کد ملی معتبر نیست.';
  end if;

  if p_birth_date !~ '^1[34]\d{2}/\d{2}/\d{2}$' then
    raise exception 'تاریخ تولد را کامل انتخاب کنید.';
  end if;

  if v_vehicle in ('تریلی', 'جفت', 'تک', 'خاور و کامیونت') and (v_fleet is null or v_fleet !~ '^\d{5,10}$') then
    raise exception 'شماره هوشمند ناوگان را درست وارد کنید.';
  end if;

  update public.driver_profiles
  set national_code = p_national_code,
      birth_date = p_birth_date,
      fleet_smart_number = coalesce(v_fleet, fleet_smart_number)
  where id = v_id;
end;
$fn$;

revoke all on function public.complete_driver_profile(text, text, text) from public, anon;
grant execute on function public.complete_driver_profile(text, text, text) to authenticated;
