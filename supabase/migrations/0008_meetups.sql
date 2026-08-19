create table public.meetups (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  city text not null,
  starts_at timestamptz not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.meetups enable row level security;

create policy "authenticated users read meetups" on public.meetups for select
  to authenticated using (true);

create policy "users create their own meetups" on public.meetups for insert
  to authenticated with check (auth.uid() = created_by);

create policy "creators delete their own meetups" on public.meetups for delete
  to authenticated using (auth.uid() = created_by);

grant select, insert, delete on public.meetups to authenticated;

create index meetups_starts_at_idx on public.meetups (starts_at);
