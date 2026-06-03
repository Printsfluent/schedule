-- Before signup works, in Supabase Dashboard:
--   Authentication → Providers → Email → Enable
--   Authentication → Settings → Allow new users to sign up → ON
--
-- Run in Supabase SQL editor after enabling Email auth in Authentication → Providers.
--
-- Supabase Dashboard → Authentication → URL configuration:
--   Site URL: your production app (e.g. https://your-app.vercel.app)
--   Redirect URLs (add every host you use):
--     https://your-app.vercel.app/**
--     https://printsfluent.github.io/schedule/**
--     http://localhost:5173/**
-- Email confirmation links must redirect to /login on your app domain.
--
-- Signup verification codes: Confirm signup template → {{ .Token }}
-- (see supabase/email-confirm-signup-template.html). Requires Confirm email ON.
-- Supabase generates codes server-side when signUp runs.

-- Optional: store username on signup (also saved in user_metadata from the app).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users upsert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);
