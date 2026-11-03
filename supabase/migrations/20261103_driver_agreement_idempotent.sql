-- زدن دوباره‌ی «توافق نشد» (قبل از تازه شدن صفحه) دیگر خطا نمی‌دهد
create or replace function public.respond_load_agreement(p_load_id uuid, p_agreed boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id bigint;
begin
  select l.request_id into v_request_id
  from public.loads l
  join public.driver_profiles d on d.id = l.driver_id
  where l.id = p_load_id and d.auth_user_id = auth.uid() and l.status = 'assigned';

  if not found then
    -- بار همین الان با پاسخ قبلی آزاد شده است
    if not p_agreed then
      return;
    end if;
    raise exception 'این بار در انتظار پاسخ شما نیست.';
  end if;

  if p_agreed then
    update public.loads set driver_agreed_at = now() where id = p_load_id;
    return;
  end if;

  update public.loads
  set driver_id = null, status = 'available', driver_agreed_at = null, notified_drivers_at = null
  where id = p_load_id;

  -- راننده‌ی بعدی دوباره به صاحب بار پیامک می‌شود
  if v_request_id is not null then
    perform set_config('makanbar.sync', 'on', true);

    update public.requests
    set status = 'ارسال به رانندگان', notified_driver_at = null
    where id = v_request_id;

    perform set_config('makanbar.sync', 'off', true);
  end if;
end;
$$;

revoke all on function public.respond_load_agreement(uuid, boolean) from public, anon;
grant execute on function public.respond_load_agreement(uuid, boolean) to authenticated;
