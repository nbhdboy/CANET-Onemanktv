-- Allow a signed-in user to create their profile row if the Auth trigger missed it.
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);
