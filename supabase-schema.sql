-- Ejecutar en Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  kind text not null,
  title text not null,
  body text,
  image_path text,
  image_url text,
  external_url text,
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  created_at timestamptz not null default now()
);

update public.entries set kind = 'foto' where kind = 'image';
update public.entries set kind = 'musica' where kind = 'music';
update public.entries set kind = 'letterboxd' where kind = 'review';

alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('post', 'foto', 'musica', 'letterboxd'));

alter table public.entries add column if not exists image_url text;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admin_users enable row level security;

drop policy if exists "Admin can read own membership" on public.admin_users;
create policy "Admin can read own membership"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid());

-- Después de crear tu usuario en Authentication > Users, ejecuta una vez:
-- insert into public.admin_users (user_id) values ('UUID_DE_TU_USUARIO');

alter table public.entries replica identity full;
alter publication supabase_realtime add table public.entries;

alter table public.entries enable row level security;

drop policy if exists "Public can read entries" on public.entries;
create policy "Public can read entries"
  on public.entries for select
  using (true);

drop policy if exists "Owner can insert entries" on public.entries;
create policy "Owner can insert entries"
  on public.entries for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Owner can update entries" on public.entries;
create policy "Owner can update entries"
  on public.entries for update to authenticated
  using (owner_id = auth.uid() and exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (owner_id = auth.uid() and exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Owner can delete entries" on public.entries;
create policy "Owner can delete entries"
  on public.entries for delete to authenticated
  using (owner_id = auth.uid() and exists (select 1 from public.admin_users where user_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read media" on storage.objects;
create policy "Public can read media"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "Authenticated can upload media" on storage.objects;
create policy "Authenticated can upload media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Owner can update media" on storage.objects;
create policy "Owner can update media"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and owner_id = auth.uid() and exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (bucket_id = 'media' and owner_id = auth.uid() and exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Owner can delete media" on storage.objects;
create policy "Owner can delete media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner_id = auth.uid() and exists (select 1 from public.admin_users where user_id = auth.uid()));
