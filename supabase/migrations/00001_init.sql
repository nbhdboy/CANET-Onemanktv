-- Production schema for Supabase (PostgreSQL + RLS)
-- Local MVP currently uses SQLite with equivalent authorization in server actions.
-- Apply this when moving to hosted Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  real_name_private text,
  birth_year_private int,
  age_verified boolean not null default false,
  terms_agreed boolean not null default false,
  profile_completed boolean not null default false,
  successful_match_count int not null default 0,
  free_match_used boolean not null default false,
  rating_avg numeric,
  rating_count int not null default 0,
  status text not null default 'ACTIVE',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_private_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  line_id text,
  instagram_handle text,
  threads_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ktv_brands (
  id text primary key,
  name text not null,
  booking_url text not null,
  logo_url text,
  enabled boolean not null default true
);

create table if not exists public.ktv_venues (
  id text primary key,
  brand_id text not null references public.ktv_brands(id),
  name text not null,
  city text not null,
  district text not null,
  address text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sing_requests (
  id uuid primary key default gen_random_uuid(),
  initiator_id uuid not null references public.profiles(id),
  venue_id text not null references public.ktv_venues(id),
  sing_at timestamptz not null,
  duration_hours int not null,
  music_genres jsonb not null default '[]',
  preferences jsonb not null default '[]',
  note text,
  estimated_total_cost_2p int,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.sing_requests(id),
  applicant_id uuid not null references public.profiles(id),
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, applicant_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.sing_requests(id),
  initiator_id uuid not null references public.profiles(id),
  participant_id uuid not null references public.profiles(id),
  status text not null,
  payment_deadline timestamptz,
  booking_status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);

create unique index if not exists uniq_one_live_match
  on public.matches(request_id)
  where status in ('MATCHED','COMPLETED','PENDING_PAYMENT');

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id),
  user_id uuid not null references public.profiles(id),
  fee_due int not null,
  payment_required boolean not null,
  provider text not null,
  transaction_id text,
  status text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id),
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  rating int not null,
  tags jsonb not null default '[]',
  comment text,
  created_at timestamptz not null default now(),
  unique (match_id, reviewer_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id),
  blocked_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  reported_user_id uuid not null references public.profiles(id),
  request_id uuid,
  match_id uuid,
  reason text not null,
  description text,
  status text not null default 'OPEN',
  admin_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  name text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cancellations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  match_id uuid,
  user_id uuid not null references public.profiles(id),
  from_status text not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_private_contacts enable row level security;
alter table public.sing_requests enable row level security;
alter table public.match_applications enable row level security;
alter table public.matches enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.analytics_events enable row level security;
alter table public.cancellations enable row level security;
alter table public.ktv_brands enable row level security;
alter table public.ktv_venues enable row level security;
alter table public.platform_config enable row level security;

create policy "public profiles read" on public.profiles
  for select using (true);

create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

create policy "own contacts read" on public.user_private_contacts
  for select using (auth.uid() = user_id);

create policy "own contacts write" on public.user_private_contacts
  for all using (auth.uid() = user_id);

create policy "open requests read" on public.sing_requests
  for select using (status = 'OPEN' or initiator_id = auth.uid());

create policy "own request insert" on public.sing_requests
  for insert with check (initiator_id = auth.uid());

create policy "own request cancel" on public.sing_requests
  for update using (initiator_id = auth.uid());

create policy "application participants read" on public.match_applications
  for select using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.sing_requests r
      where r.id = request_id and r.initiator_id = auth.uid()
    )
  );

create policy "brands public read" on public.ktv_brands for select using (enabled = true);
create policy "venues public read" on public.ktv_venues for select using (enabled = true);

-- Signup creates a profile + empty contacts row. Login identities stay in auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_private_contacts (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Private contacts for matched counterparties MUST go through a secure RPC / Edge Function.
-- Never expose user_private_contacts to other users via a direct select policy.
