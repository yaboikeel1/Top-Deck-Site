-- Run this entire file in Supabase SQL Editor.

create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  artist_name text,
  bio text,
  location text,
  profile_image_url text,
  spotify_url text,
  apple_music_url text,
  youtube_url text,
  audiomack_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.release_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  release_type text,
  release_date date,
  featured_artists text,
  cover_url text,
  audio_url text,
  notes text,
  status text default 'Pending',
  created_at timestamptz default now()
);

alter table public.artist_profiles enable row level security;
alter table public.release_submissions enable row level security;

drop policy if exists "Users manage own profile" on public.artist_profiles;
create policy "Users manage own profile"
on public.artist_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users view own releases" on public.release_submissions;
create policy "Users view own releases"
on public.release_submissions
for select
using (auth.uid() = user_id);

drop policy if exists "Users submit own releases" on public.release_submissions;
create policy "Users submit own releases"
on public.release_submissions
for insert
with check (auth.uid() = user_id);

-- Admin review note:
-- The included browser-based admin page is a launch starter.
-- For secure production admin access, use a Supabase Edge Function
-- or add a dedicated role/claims system before opening it publicly.
