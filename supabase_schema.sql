-- Enable UUID generation helpers (optional; Supabase includes pgcrypto by default)
create extension if not exists pgcrypto;

-- users: app-level profile linked 1:1 with auth.users
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- items: user-owned catalog entries
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_items_user_id on public.items (user_id);

-- item_photos: photos attached to items
create table if not exists public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  photo_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_item_photos_item_id on public.item_photos (item_id);
create index if not exists idx_item_photos_user_id on public.item_photos (user_id);

-- usage_logs: records of item usage by user
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  used_at timestamptz not null default now(),
  quantity numeric(10,2),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_logs_item_id on public.usage_logs (item_id);
create index if not exists idx_usage_logs_user_id on public.usage_logs (user_id);
create index if not exists idx_usage_logs_used_at on public.usage_logs (used_at desc);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Recreate triggers idempotently

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_items_set_updated_at on public.items;
create trigger trg_items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.usage_logs enable row level security;

-- users policies: each auth user can manage only their own profile row

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users_delete_own" on public.users;
create policy "users_delete_own"
on public.users
for delete
using (auth.uid() = id);

-- items policies

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own"
on public.items
for select
using (auth.uid() = user_id);

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own"
on public.items
for insert
with check (auth.uid() = user_id);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own"
on public.items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own"
on public.items
for delete
using (auth.uid() = user_id);

-- item_photos policies

drop policy if exists "item_photos_select_own" on public.item_photos;
create policy "item_photos_select_own"
on public.item_photos
for select
using (auth.uid() = user_id);

drop policy if exists "item_photos_insert_own" on public.item_photos;
create policy "item_photos_insert_own"
on public.item_photos
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "item_photos_update_own" on public.item_photos;
create policy "item_photos_update_own"
on public.item_photos
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "item_photos_delete_own" on public.item_photos;
create policy "item_photos_delete_own"
on public.item_photos
for delete
using (auth.uid() = user_id);

-- usage_logs policies

drop policy if exists "usage_logs_select_own" on public.usage_logs;
create policy "usage_logs_select_own"
on public.usage_logs
for select
using (auth.uid() = user_id);

drop policy if exists "usage_logs_insert_own" on public.usage_logs;
create policy "usage_logs_insert_own"
on public.usage_logs
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "usage_logs_update_own" on public.usage_logs;
create policy "usage_logs_update_own"
on public.usage_logs
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "usage_logs_delete_own" on public.usage_logs;
create policy "usage_logs_delete_own"
on public.usage_logs
for delete
using (auth.uid() = user_id);
