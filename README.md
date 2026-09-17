# Delivery Run Sheet

A small shop dispatches customer deliveries to its drivers.

- **Dispatcher** sees every delivery, creates deliveries, and assigns or reassigns a driver
  while a delivery is still pending.
- **Driver** sees only the deliveries assigned to them, and marks their own pending
  deliveries as delivered.

Statuses are `pending` and `delivered`. Delivered is final.

## Stack

| Part     | Technology                                         | Hosting |
| -------- | -------------------------------------------------- | ------- |
| Frontend | React, Vite, TypeScript, React Router, Tailwind     | Vercel  |
| Database | Supabase Postgres, read directly from the browser   | Supabase |
| Auth     | Supabase Auth (email + password, sign-ups disabled) | Supabase |
| Rules    | Postgres Row Level Security policies                | Supabase |
| Maps     | Geoapify, called from one Vercel serverless function | Vercel |

There is no separate backend. Permissions are enforced by RLS policies in the
database, so they apply no matter what the browser asks for. The one piece of
server-side code is a single Vercel function that holds the Geoapify key, which
cannot live in the browser.

## Layout

    frontend/   React app, plus the one serverless function
    supabase/   schema.sql, policies.sql, seed_profiles.sql

## Live URLs

_Filled in once deployed._

## Running locally

_Filled in once there is something to run._

## Notes

_Design decisions and shortcuts, written up at the end._
