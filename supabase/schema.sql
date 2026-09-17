-- Delivery Run Sheet - database schema
-- Run this once in the Supabase SQL Editor, before creating any users.

-- ---------------------------------------------------------------------------
-- profiles: one row per user. Users are created by hand in the Supabase
-- dashboard; this table adds the role and the settings they can edit.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    id               uuid primary key references auth.users (id) on delete cascade,
    email            text not null unique,
    role             text not null check (role in ('dispatcher', 'driver')),
    display_name     text not null,
    message_template text not null default
        $tpl$Hi {customer}, this is {driver} from the shop. I'm on my way with your order to {address}.$tpl$,
    created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- deliveries: the run sheet itself. The customer is data, not a user.
-- ---------------------------------------------------------------------------
create table if not exists public.deliveries (
    id             uuid primary key default gen_random_uuid(),
    customer_name  text not null,
    customer_phone text not null,
    address        text not null,
    status         text not null default 'pending' check (status in ('pending', 'delivered')),
    driver_id      uuid references public.profiles (id) on delete set null,
    created_by     uuid not null references public.profiles (id),
    created_at     timestamptz not null default now(),
    delivered_at   timestamptz,

    -- Phones are stored as digits only, country code included and no plus sign,
    -- so they can be dropped straight into a wa.me link.
    constraint deliveries_phone_is_digits
        check (customer_phone ~ '^[0-9]{10,}$'),

    -- "Delivered" is what records the time: the two always agree.
    constraint deliveries_delivered_at_matches_status
        check (
            (status = 'delivered' and delivered_at is not null)
         or (status = 'pending'   and delivered_at is null)
        )
);

-- A driver's list is always filtered by driver_id.
create index if not exists deliveries_driver_id_idx on public.deliveries (driver_id);

-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- The browser talks to Supabase directly, signed in as the `authenticated`
-- role. RLS is what decides which rows it may see and change: with RLS on and
-- no policies, every query matches zero rows and every write is refused.
--
-- The policies that open specific doors live in policies.sql, kept in a
-- separate file so the access rules can be read on their own.
-- ---------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.deliveries enable row level security;
