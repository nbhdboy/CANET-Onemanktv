-- 00010_harden_rls.sql
-- 加固 profiles / sing_requests RLS，並明確敏感表僅准 service_role。
-- 可在 Supabase Dashboard → SQL Editor 整段執行。
--
-- 說明：
-- 1) PostgreSQL RLS 是「列」層級；欄位保護需搭配 GRANT（欄位權限）+ TRIGGER。
-- 2) 目前 App 雲端多半走 service_role（會繞過 RLS，但 TRIGGER 仍會跑；
--    下方 trigger 對 service_role 放行，故 App 正常寫入不受影響）。
-- 3) 公開的 anon key 直打 REST 時，會受本腳本限制。

-- =============================================================================
-- A. profiles：收斂 SELECT（不要整表公開）
-- =============================================================================

drop policy if exists "public profiles read" on public.profiles;

-- 仍允許讀「列」（feed / 公開頁需要看到其他人），但敏感欄位不給 anon/authenticated
create policy "profiles public read rows"
  on public.profiles
  for select
  using (true);

-- 先收回整表 SELECT，再只開放公開欄位
revoke select on table public.profiles from anon, authenticated;

grant select (
  id,
  nickname,
  avatar_url,
  successful_match_count,
  rating_avg,
  rating_count,
  profile_completed,
  created_at,
  updated_at
) on table public.profiles to anon, authenticated;

-- 注意：real_name_private / birth_year_private / points / status /
-- is_admin / free_match_used / suspended_until / age_verified / terms_agreed
-- 等欄位不再對 anon、authenticated 開放。
-- App 用 service_role 讀寫仍可拿到完整列。


-- =============================================================================
-- B. profiles：限制 UPDATE（禁止改 is_admin / points / status 等）
-- =============================================================================

drop policy if exists "own profile update" on public.profiles;

create policy "own profile update"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 只允許使用者改「個人資料相關」欄位
revoke update on table public.profiles from anon, authenticated;

grant update (
  nickname,
  avatar_url,
  real_name_private,
  birth_year_private,
  age_verified,
  terms_agreed,
  profile_completed,
  updated_at
) on table public.profiles to authenticated;

-- 雙重保險：就算權限被誤開，也不准改受保護欄位（service_role 除外）
create or replace function public.protect_profile_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- App / 後台用的 service_role 可改全部欄位
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin
     or new.points is distinct from old.points
     or new.status is distinct from old.status
     or new.suspended_until is distinct from old.suspended_until
     or new.successful_match_count is distinct from old.successful_match_count
     or new.free_match_used is distinct from old.free_match_used
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
  then
    raise exception 'forbidden: cannot modify protected profile columns';
  end if;

  -- 身分不可被換成別人
  if new.id is distinct from old.id then
    raise exception 'forbidden: cannot change profile id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_sensitive on public.profiles;
create trigger trg_protect_profile_sensitive
  before update on public.profiles
  for each row
  execute function public.protect_profile_sensitive_columns();


-- =============================================================================
-- C. sing_requests：收窄 UPDATE（只能取消相關狀態，不能亂改場地／時間等）
-- =============================================================================

drop policy if exists "own request cancel" on public.sing_requests;

-- 發起人仍可更新「自己的列」，但欄位與狀態轉換受下方限制
create policy "own request update"
  on public.sing_requests
  for update
  to authenticated
  using (initiator_id = auth.uid())
  with check (initiator_id = auth.uid());

revoke update on table public.sing_requests from anon, authenticated;

-- 只允許改 status / updated_at（對齊取消流程；其他欄位需走 service_role）
grant update (status, updated_at) on table public.sing_requests to authenticated;

create or replace function public.protect_sing_request_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  -- 不可改發起人 / 場地 / 時間 / 內容等
  if new.initiator_id is distinct from old.initiator_id
     or new.venue_id is distinct from old.venue_id
     or new.sing_at is distinct from old.sing_at
     or new.duration_hours is distinct from old.duration_hours
     or new.music_genres is distinct from old.music_genres
     or new.preferences is distinct from old.preferences
     or new.note is distinct from old.note
     or new.estimated_total_cost_2p is distinct from old.estimated_total_cost_2p
     or new.created_at is distinct from old.created_at
  then
    raise exception 'forbidden: cannot modify sing_request content fields';
  end if;

  -- 允許的狀態轉換（對齊 cancelRequest 邏輯）
  -- OPEN -> CANCELLED
  -- MATCH_PENDING -> OPEN（付款中取消後重開）
  -- MATCHED -> CANCELLED
  if not (
    (old.status = 'OPEN' and new.status = 'CANCELLED')
    or (old.status = 'MATCH_PENDING' and new.status = 'OPEN')
    or (old.status = 'MATCHED' and new.status = 'CANCELLED')
  ) then
    raise exception 'forbidden: invalid sing_request status transition';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_sing_request_updates on public.sing_requests;
create trigger trg_protect_sing_request_updates
  before update on public.sing_requests
  for each row
  execute function public.protect_sing_request_updates();


-- =============================================================================
-- D. 敏感表：維持「無 policy = 只准 service_role」
--    （雙重保險：對 anon/authenticated 收回權限）
-- =============================================================================

-- 確認 RLS 已開（若已開則無影響）
alter table if exists public.matches enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.reviews enable row level security;
alter table if exists public.blocks enable row level security;
alter table if exists public.reports enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.analytics_events enable row level security;
alter table if exists public.cancellations enable row level security;
alter table if exists public.platform_config enable row level security;
alter table if exists public.credit_ledger enable row level security;
alter table if exists public.user_cards enable row level security;
alter table if exists public.bind_card_temp_orders enable row level security;
alter table if exists public.match_applications enable row level security;
alter table if exists public.user_private_contacts enable row level security;

-- 不要新增 select/insert/update policy 給這些表的卡密／金流欄位。
-- 無 policy + RLS = authenticated/anon 直連全部失敗；僅 service_role 可存取。

revoke all on table public.matches from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;
revoke all on table public.blocks from anon, authenticated;
revoke all on table public.reports from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.analytics_events from anon, authenticated;
revoke all on table public.cancellations from anon, authenticated;
revoke all on table public.platform_config from anon, authenticated;
revoke all on table public.credit_ledger from anon, authenticated;
revoke all on table public.user_cards from anon, authenticated;
revoke all on table public.bind_card_temp_orders from anon, authenticated;

-- match_applications：保留既有「參與者可讀」policy，但禁止寫入（寫入走 App + service）
revoke insert, update, delete on table public.match_applications from anon, authenticated;
-- select 權限留給已有 policy；若預設被 revoke all，需再 grant select：
grant select on table public.match_applications to authenticated;

-- user_private_contacts：只能自己讀寫（既有 policy）；收回多餘權限後重授
revoke all on table public.user_private_contacts from anon, authenticated;
grant select, insert, update, delete on table public.user_private_contacts to authenticated;


-- =============================================================================
-- E. （選用／第二階段）減少 service_role 依賴時可開啟的 user JWT 政策
--    現在先註解，等 App 改成用使用者 JWT 讀自己的資料再取消註解。
-- =============================================================================

-- -- 自己的通知
-- create policy "own notifications read"
--   on public.notifications for select to authenticated
--   using (user_id = auth.uid());
-- create policy "own notifications update"
--   on public.notifications for update to authenticated
--   using (user_id = auth.uid())
--   with check (user_id = auth.uid());
-- grant select, update (is_read) on table public.notifications to authenticated;

-- -- 自己的點數流水（唯讀）
-- create policy "own credit ledger read"
--   on public.credit_ledger for select to authenticated
--   using (user_id = auth.uid());
-- grant select on table public.credit_ledger to authenticated;

-- -- 自己的媒合列（唯讀；付款／卡密仍不准）
-- create policy "own matches read"
--   on public.matches for select to authenticated
--   using (initiator_id = auth.uid() or participant_id = auth.uid());
-- grant select on table public.matches to authenticated;

-- -- 自己的付款列（若開啟，務必不要 select * 含 pending_card_*；建議另建 view）
-- -- create policy "own payments read safe" ...
-- -- 不建議直接 grant select on payments；卡密欄位風險高。
