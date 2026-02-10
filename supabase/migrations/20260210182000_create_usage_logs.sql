create table if not exists public.usage_logs (
  id bigserial primary key,
  item_id uuid not null,
  user_id uuid not null,
  used_at timestamptz not null default now(),
  scene_tag text not null,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_item_id_idx on public.usage_logs (item_id);
create index if not exists usage_logs_user_id_idx on public.usage_logs (user_id);
create index if not exists usage_logs_used_at_idx on public.usage_logs (used_at desc);
create index if not exists usage_logs_scene_tag_idx on public.usage_logs (scene_tag);

alter table public.usage_logs enable row level security;

create policy "Users can insert their own usage logs"
  on public.usage_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read their own usage logs"
  on public.usage_logs
  for select
  to authenticated
  using (auth.uid() = user_id);
