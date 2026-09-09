-- Points (點數) + payment credit tracking for timeout / redeem

alter table public.profiles
  add column if not exists points int not null default 0;

alter table public.payments
  add column if not exists credit_applied int not null default 0;

alter table public.payments
  add column if not exists credited_at timestamptz;

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  balance_after int not null,
  reason text not null,
  message text,
  source_match_id uuid references public.matches(id),
  source_payment_id uuid references public.payments(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_ledger_user_created
  on public.credit_ledger (user_id, created_at desc);

alter table public.credit_ledger enable row level security;
