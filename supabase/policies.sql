-- Delivery Run Sheet - access rules.
--
-- Run this in the Supabase SQL Editor after schema.sql and seed_profiles.sql.
-- Safe to run more than once: every object is dropped or replaced first.
--
-- These rules ARE the permission system. There is no server enforcing anything
-- on the side; Postgres itself refuses whatever is not allowed here.
--
-- Two different mechanisms are at work, doing different jobs:
--
--   GRANTs   decide which TABLES and COLUMNS a role may touch at all.
--   POLICIES decide which ROWS, within what the grants already allow.
--
-- Both are needed. A policy can only narrow what a grant has opened - it can
-- never widen it. This project was created with "automatically expose new
-- tables" switched off, so `authenticated` starts with no privileges at all,
-- and the grants below are what make the tables reachable in the first place.

-- ---------------------------------------------------------------------------
-- Who am I?
--
-- auth.uid() is the signed-in user's id, provided by Supabase.
-- This function turns that into their role.
--
-- It is `security definer` for one specific reason: a policy ON profiles that
-- reads FROM profiles would call itself forever. A security definer function
-- runs as its owner and skips RLS, which breaks that loop. It only ever
-- returns the caller's own role, so it hands out nothing.
--
-- search_path is set to '' so no name can be resolved through a shadowed
-- schema; everything inside the function is written out in full.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
    select role from public.profiles where id = auth.uid()
$fn$;

revoke execute on function public.current_user_role() from public, anon;
grant  execute on function public.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Grants: which tables and columns each role may touch.
-- ---------------------------------------------------------------------------

-- anon is the not-signed-in visitor. It gets nothing, on anything, ever.
-- Signing in goes through the Auth API, which needs no table privileges.
revoke all on public.profiles   from anon;
revoke all on public.deliveries from anon;

grant usage on schema public to authenticated;

-- Start from nothing, then hand back exactly what the app needs.
revoke all on public.profiles   from authenticated;
revoke all on public.deliveries from authenticated;

-- Reading: both tables. Which ROWS come back is the policies' job, below.
grant select on public.profiles   to authenticated;
grant select on public.deliveries to authenticated;

-- Creating deliveries. Only a dispatcher gets past the policy.
grant insert on public.deliveries to authenticated;

-- Settings edits only. `role` is deliberately absent from this list, so no
-- request of any shape can promote a driver to dispatcher.
grant update (display_name, message_template) on public.profiles to authenticated;

-- Assigning a driver, marking delivered, and correcting the customer details
-- when the dispatcher mistyped something.
--
-- Note that grants apply to the `authenticated` role, which covers BOTH of our
-- roles - they cannot tell a dispatcher from a driver. On its own this would
-- let a driver rewrite the address in the same statement that marks a delivery
-- delivered. The guard trigger further down is what prevents that.
grant update (
    driver_id,
    status,
    customer_name,
    customer_phone,
    address,
    latitude,
    longitude
) on public.deliveries to authenticated;

-- Nobody is granted delete on anything.

-- ---------------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select     on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

-- Read: your own profile always. A dispatcher also reads every profile,
-- because they need the list of drivers to assign from, and the assigned
-- driver's name and template to build the WhatsApp message.
create policy profiles_select
    on public.profiles for select to authenticated
    using (
        id = auth.uid()
        or public.current_user_role() = 'dispatcher'
    );

-- Write: your own row only. With the column grant above, that means display
-- name and message template, and nothing else.
create policy profiles_update_own
    on public.profiles for update to authenticated
    using      (id = auth.uid())
    with check (id = auth.uid());

-- No insert or delete policy: accounts are made by hand in the dashboard.

-- ---------------------------------------------------------------------------
-- deliveries policies
--
-- A note on `with check`: when several policies apply to the same command,
-- Postgres ORs their USING clauses together, and ORs their WITH CHECK clauses
-- together. So each WITH CHECK below repeats its own role test rather than
-- leaning on its USING clause. Without that, a driver could satisfy the
-- dispatcher's WITH CHECK simply by leaving the status alone, and hand their
-- delivery to another driver.
-- ---------------------------------------------------------------------------
drop policy if exists deliveries_select                   on public.deliveries;
drop policy if exists deliveries_insert_dispatcher        on public.deliveries;
drop policy if exists deliveries_update_dispatcher_assign on public.deliveries;
drop policy if exists deliveries_update_driver_deliver    on public.deliveries;

-- Read: a dispatcher sees everything. A driver sees only their own.
-- This is also why a driver opening someone else's delivery gets a "not
-- found" page: to them, that row genuinely does not exist.
create policy deliveries_select
    on public.deliveries for select to authenticated
    using (
        public.current_user_role() = 'dispatcher'
        or driver_id = auth.uid()
    );

-- Create: dispatchers only. A new delivery always starts pending, and is
-- always stamped as created by whoever is signed in.
create policy deliveries_insert_dispatcher
    on public.deliveries for insert to authenticated
    with check (
        public.current_user_role() = 'dispatcher'
        and created_by = auth.uid()
        and status = 'pending'
    );

-- Assign or reassign: dispatchers only, and only while still pending.
-- Requiring 'pending' on the way out stops a dispatcher marking something
-- delivered - that is the driver's job, not theirs.
create policy deliveries_update_dispatcher_assign
    on public.deliveries for update to authenticated
    using (
        public.current_user_role() = 'dispatcher'
        and status = 'pending'
    )
    with check (
        public.current_user_role() = 'dispatcher'
        and status = 'pending'
    );

-- Mark delivered: a driver, on their own pending delivery, and the only
-- change allowed is pending -> delivered. The row must still belong to them
-- afterwards, so they cannot hand it to someone else; and it must come out
-- delivered, so they cannot change anything while leaving it pending.
create policy deliveries_update_driver_deliver
    on public.deliveries for update to authenticated
    using (
        public.current_user_role() = 'driver'
        and driver_id = auth.uid()
        and status = 'pending'
    )
    with check (
        public.current_user_role() = 'driver'
        and driver_id = auth.uid()
        and status = 'delivered'
    );

-- No delete policy, and no delete grant: nothing is ever deleted.

-- ---------------------------------------------------------------------------
-- Delivered records the time.
--
-- The app only ever sets status; this stamps the clock, so the timestamp is
-- always the real moment and never something the browser chose. Column
-- privileges apply to the columns an UPDATE statement itself names, so this
-- can write delivered_at even though `authenticated` cannot.
-- ---------------------------------------------------------------------------
create or replace function public.stamp_delivered_at()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
    if new.status = 'delivered' and old.status = 'pending' then
        new.delivered_at := now();
    end if;
    return new;
end;
$fn$;

drop trigger if exists deliveries_stamp_delivered_at on public.deliveries;
create trigger deliveries_stamp_delivered_at
    before update on public.deliveries
    for each row
    execute function public.stamp_delivered_at();

-- ---------------------------------------------------------------------------
-- Only a dispatcher corrects customer details.
--
-- The column grants above cannot express this, because both of our roles are
-- the same database role. A policy cannot express it either: WITH CHECK only
-- sees the new row, so it cannot tell whether a column changed. Comparing OLD
-- with NEW needs a trigger.
--
-- Without this, a driver marking a delivery delivered could rewrite the
-- customer's name, phone and address in the same statement.
-- ---------------------------------------------------------------------------
create or replace function public.guard_customer_details()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
    if (new.customer_name, new.customer_phone, new.address,
        new.latitude, new.longitude)
        is distinct from (old.customer_name, old.customer_phone, old.address,
                          old.latitude, old.longitude)
       and public.current_user_role() <> 'dispatcher'
    then
        raise exception 'Only a dispatcher can change customer details';
    end if;

    return new;
end;
$fn$;

drop trigger if exists deliveries_guard_customer_details on public.deliveries;
create trigger deliveries_guard_customer_details
    before update on public.deliveries
    for each row
    execute function public.guard_customer_details();

-- ---------------------------------------------------------------------------
-- Tell the Supabase API layer to pick up the new privileges straight away,
-- rather than waiting for its cache to refresh on its own.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Check: what `authenticated` ended up with. Expect exactly these twelve rows,
-- and nothing at all for anon.
--
--   authenticated | deliveries | INSERT | (whole table)
--   authenticated | deliveries | SELECT | (whole table)
--   authenticated | deliveries | UPDATE | address
--   authenticated | deliveries | UPDATE | customer_name
--   authenticated | deliveries | UPDATE | customer_phone
--   authenticated | deliveries | UPDATE | driver_id
--   authenticated | deliveries | UPDATE | latitude
--   authenticated | deliveries | UPDATE | longitude
--   authenticated | deliveries | UPDATE | status
--   authenticated | profiles   | SELECT | (whole table)
--   authenticated | profiles   | UPDATE | display_name
--   authenticated | profiles   | UPDATE | message_template
-- ---------------------------------------------------------------------------
select grantee, table_name, privilege_type, scope
from (
    select g.grantee::text,
           g.table_name::text,
           g.privilege_type::text,
           '(whole table)' as scope
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name in ('profiles', 'deliveries')
      and g.grantee in ('anon', 'authenticated')
      and g.privilege_type <> 'UPDATE'
    union all
    select c.grantee::text,
           c.table_name::text,
           c.privilege_type::text,
           c.column_name::text
    from information_schema.column_privileges c
    where c.table_schema = 'public'
      and c.table_name in ('profiles', 'deliveries')
      and c.grantee in ('anon', 'authenticated')
      and c.privilege_type = 'UPDATE'
) all_grants
order by grantee, table_name, privilege_type, scope;
