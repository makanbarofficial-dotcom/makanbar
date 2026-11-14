-- =====================================================================
-- ماکان بار: امتیاز به راننده و گزارش/شکایت مشتری‌ها
--   ۱) صاحب بار بعد از «انجام شد» به راننده‌ی همان بار ۱ تا ۵ ستاره (و نظر) می‌دهد
--   ۲) صاحب بار گزارش یا شکایت ثبت می‌کند؛ مدیر می‌بیند، پاسخ می‌دهد و وضعیتش را عوض می‌کند
-- =====================================================================

-- ۱) امتیاز راننده؛ هر بار فقط یک امتیاز (صاحب بار می‌تواند آن را عوض کند)
create table if not exists public.driver_ratings (
  id bigint generated always as identity primary key,
  request_id bigint not null unique references public.requests(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  customer_id uuid not null,
  stars smallint not null check (stars between 1 and 5),
  comment text check (comment is null or length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists driver_ratings_driver_idx on public.driver_ratings (driver_id);

alter table public.driver_ratings enable row level security;

create policy "driver_ratings_admin_read" on public.driver_ratings
  for select to authenticated using (public.is_admin());
create policy "driver_ratings_customer_read" on public.driver_ratings
  for select to authenticated using (customer_id = auth.uid());

grant select on public.driver_ratings to authenticated;
grant select, insert, update, delete on public.driver_ratings to service_role;

-- ثبت یا عوض کردن امتیاز؛ فقط صاحب همان بار، فقط وقتی بار انجام شده و راننده داشته
create or replace function public.rate_driver(p_request_id bigint, p_stars int, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_request public.requests%rowtype;
  v_driver uuid;
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'امتیاز باید بین ۱ تا ۵ ستاره باشد.';
  end if;

  select * into v_request from public.requests where id = p_request_id;

  if not found or v_request.customer_id is distinct from auth.uid() then
    raise exception 'این بار مال شما نیست.';
  end if;

  if coalesce(v_request.status, '') <> 'انجام شد' then
    raise exception 'بعد از تحویل بار می‌توانید امتیاز بدهید.';
  end if;

  select l.driver_id into v_driver
  from public.loads l
  where l.request_id = p_request_id and l.driver_id is not null
  order by l.created_at desc
  limit 1;

  if v_driver is null then
    raise exception 'برای این بار راننده‌ای ثبت نشده است.';
  end if;

  insert into public.driver_ratings (request_id, driver_id, customer_id, stars, comment)
  values (p_request_id, v_driver, auth.uid(), p_stars, nullif(trim(coalesce(p_comment, '')), ''))
  on conflict (request_id) do update
    set stars = excluded.stars, comment = excluded.comment, updated_at = now();
end;
$fn$;

revoke all on function public.rate_driver(bigint, int, text) from public, anon;
grant execute on function public.rate_driver(bigint, int, text) to authenticated;

-- میانگین امتیاز هر راننده (برای پنل مدیر و پنل خود راننده)
create or replace function public.driver_rating_summary(p_driver_ids uuid[])
returns table (driver_id uuid, average numeric, total int)
language sql
stable
security definer
set search_path = public
as $fn$
  select r.driver_id, round(avg(r.stars)::numeric, 1), count(*)::int
  from public.driver_ratings r
  where r.driver_id = any(p_driver_ids)
    and (
      public.is_admin()
      or exists (select 1 from public.driver_profiles d where d.id = r.driver_id and d.auth_user_id = auth.uid())
      or exists (select 1 from public.staff s where s.auth_user_id = auth.uid() and coalesce(s.panel_enabled, false))
    )
  group by r.driver_id;
$fn$;

revoke all on function public.driver_rating_summary(uuid[]) from public, anon;
grant execute on function public.driver_rating_summary(uuid[]) to authenticated;

-- ۲) گزارش و شکایت صاحبان بار
create table if not exists public.customer_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  full_name text,
  phone text,
  request_id bigint references public.requests(id) on delete set null,
  subject text not null check (length(subject) between 1 and 120),
  message text not null check (length(message) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'done')),
  admin_reply text check (admin_reply is null or length(admin_reply) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.customer_reports enable row level security;

create policy "customer_reports_insert_own" on public.customer_reports
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'new'
    and admin_reply is null
    and (request_id is null or exists (
      select 1 from public.requests r where r.id = request_id and r.customer_id = auth.uid()
    ))
  );
create policy "customer_reports_read_own" on public.customer_reports
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "customer_reports_admin_update" on public.customer_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.customer_reports to authenticated;
grant select, insert, update, delete on public.customer_reports to service_role;
