-- 付款時可選同步存卡（3DS 期間暫存 card_secret）
alter table public.payments
  add column if not exists save_card_requested boolean not null default false,
  add column if not exists save_card_replace boolean not null default false,
  add column if not exists pending_card_key text,
  add column if not exists pending_card_token text,
  add column if not exists pending_card_last_four text,
  add column if not exists pending_card_brand text,
  add column if not exists pending_card_expiry_month text,
  add column if not exists pending_card_expiry_year text;
