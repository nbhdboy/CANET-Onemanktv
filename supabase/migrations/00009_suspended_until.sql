-- 停權到期時間：首次檢舉停權 3 天；再次被檢舉則永久停用
alter table public.profiles
  add column if not exists suspended_until timestamptz;
