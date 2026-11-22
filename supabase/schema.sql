-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
create table if not exists public.requack_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.requack_state enable row level security;

create policy "read own state" on public.requack_state
  for select using (auth.uid() = user_id);

create policy "insert own state" on public.requack_state
  for insert with check (auth.uid() = user_id);

create policy "update own state" on public.requack_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own state" on public.requack_state
  for delete using (auth.uid() = user_id);
