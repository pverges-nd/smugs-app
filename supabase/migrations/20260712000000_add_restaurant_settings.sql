create table if not exists public.restaurant_settings (
  id integer primary key default 1 check (id = 1),
  is_open boolean not null default false,
  updated_at timestamp with time zone not null default now()
);

insert into public.restaurant_settings (id, is_open)
values (1, false)
on conflict (id) do nothing;

alter table public.restaurant_settings enable row level security;

create policy "Restaurant status is publicly readable"
on public.restaurant_settings
for select
to anon, authenticated
using (true);

create policy "Kitchen can update restaurant status"
on public.restaurant_settings
for update
to anon, authenticated
using (id = 1)
with check (id = 1);

create or replace function public.reject_orders_when_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(
    (select is_open from public.restaurant_settings where id = 1),
    false
  ) then
    raise exception 'The restaurant is currently closed';
  end if;

  return new;
end;
$$;

drop trigger if exists require_restaurant_open on public.orders;

create trigger require_restaurant_open
before insert on public.orders
for each row
execute function public.reject_orders_when_closed();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'restaurant_settings'
  ) then
    alter publication supabase_realtime add table public.restaurant_settings;
  end if;
end
$$;
