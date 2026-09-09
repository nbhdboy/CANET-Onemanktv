-- 一人一張存卡（user_id unique）
create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_key text,
  card_token text,
  last_four text,
  brand text,
  expiry_month text,
  expiry_year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.bind_card_temp_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending_3d',
  rec_trade_id text,
  bank_transaction_id text,
  card_key text,
  card_token text,
  last_four text,
  brand text,
  expiry_month text,
  expiry_year text,
  tappay_status int,
  tappay_msg text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bind_card_temp_user on public.bind_card_temp_orders(user_id);

alter table public.user_cards enable row level security;
alter table public.bind_card_temp_orders enable row level security;
