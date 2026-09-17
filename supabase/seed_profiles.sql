-- Delivery Run Sheet - profile rows for the hand-made accounts.
--
-- Run this AFTER creating the three users in the Supabase dashboard
-- (Authentication -> Users -> Add user, with "Auto Confirm User" ticked).
--
-- Each user's id is looked up from auth.users by email, so no ids are
-- hardcoded and the script still works if an account is deleted and recreated.
-- No passwords appear here; those are set in the dashboard only.

insert into public.profiles (id, email, role, display_name)
select u.id, u.email, seed.role, seed.display_name
from auth.users u
join (
    values
        ('dispatcher@runsheet.test', 'dispatcher', 'Dispatch Office'),
        ('ali@runsheet.test',        'driver',     'Ali'),
        ('hassan@runsheet.test',     'driver',     'Hassan')
) as seed (email, role, display_name)
  on seed.email = u.email
on conflict (id) do update
    set email        = excluded.email,
        role         = excluded.role,
        display_name = excluded.display_name;

-- Check: this should list exactly three rows.
-- A missing row means that account was not created in the dashboard,
-- or its email is spelled differently there.
select p.email, p.role, p.display_name
from public.profiles p
order by p.role, p.display_name;
