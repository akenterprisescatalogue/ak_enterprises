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


-- To Use:

-- First create this user from Supabase Dashboard > Authentication > Users.
-- Email: bashir147020@gmail.com
-- Set the password from the dashboard, not here.

with target_user as (
  select id, email
  from auth.users
  where lower(email) = lower('muhammadalihasnain23@gmail.com')
)
insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  'Bashir',
  'admin'::public.user_role
from target_user
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = 'admin'::public.user_role,
  updated_at = now();