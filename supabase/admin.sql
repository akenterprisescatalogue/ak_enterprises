-- First create the user from Supabase Dashboard > Authentication > Users.
-- Then replace the email and name below and run this in Supabase SQL Editor.
with target_user as (
  select id, email
  from auth.users
  where lower(email) = lower('admin@example.com')
)
insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  'Main Admin',
  'admin'::public.user_role
from target_user
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = 'admin'::public.user_role,
  updated_at = now();
