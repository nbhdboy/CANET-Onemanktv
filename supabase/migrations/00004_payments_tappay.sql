-- TapPay LIVE 付款與電子發票欄位
alter table public.payments
  add column if not exists order_number text,
  add column if not exists bank_transaction_id text,
  add column if not exists buyer_email text,
  add column if not exists carrier_type int,
  add column if not exists carrier_number text,
  add column if not exists buyer_identifier text,
  add column if not exists buyer_name text,
  add column if not exists rec_invoice_id text,
  add column if not exists invoice_number text,
  add column if not exists invoice_date text,
  add column if not exists invoice_time text,
  add column if not exists invoice_status text;

create unique index if not exists uniq_payments_order_number
  on public.payments (order_number)
  where order_number is not null;
