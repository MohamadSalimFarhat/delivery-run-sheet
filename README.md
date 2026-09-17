# Delivery Run Sheet

A small shop dispatches customer deliveries to its drivers.

- **Dispatcher** sees every delivery, creates them, corrects mistakes, and
  assigns or reassigns a driver while a delivery is still pending.
- **Driver** sees only the deliveries assigned to them, messages the customer
  on WhatsApp, and marks their own deliveries as delivered.

Statuses are `pending` and `delivered`. Delivered is final.

Customers are not users. They are data inside a delivery: a name, a phone
number and an address.

## Live

- Site: https://delivery-run-sheet.vercel.app
- Repository: https://github.com/MohamadSalimFarhat/delivery-run-sheet

Sign-ins are supplied separately. There is no sign-up: accounts are created by
hand in the Supabase dashboard, sign-ups are disabled, and an email that is not
in the database is turned away.

## Stack

| Part     | Technology                                           | Hosting  |
| -------- | ---------------------------------------------------- | -------- |
| Frontend | React, Vite, TypeScript, React Router, Tailwind       | Vercel   |
| Database | Supabase Postgres, queried directly from the browser  | Supabase |
| Auth     | Supabase Auth, email and password                     | Supabase |
| Rules    | Postgres Row Level Security policies                  | Supabase |
| Maps     | Geoapify, called only from two Vercel functions       | Vercel   |

## Pages

| Route              | What it is                                            |
| ------------------ | ----------------------------------------------------- |
| `/login`           | Sign in                                               |
| `/deliveries`      | The run sheet, plus the create form for dispatchers    |
| `/deliveries/:id`  | One delivery: details, map, and the role's actions     |
| `/settings`        | Display name and WhatsApp message template            |

## What you can do

1. Sign in, and be shown only what your role is allowed to see.
2. Create a delivery, either picking the address from live map suggestions or
   pasting the location pin the customer sent, so the exact point is stored.
   Phone numbers are normalised for WhatsApp.
3. Assign or reassign a driver, while the delivery is pending.
4. Correct a customer's name, number or address, while the delivery is pending.
5. See the delivery on a map, and tap Navigate for turn-by-turn directions to
   the pinned point.
6. Ask the customer for their location pin on WhatsApp, and paste what they
   send straight onto the delivery.
7. Message the customer on WhatsApp as the driver, with the text already
   written.
8. Mark a delivery delivered, which records the time.
9. Change your display name and the message you send, in Settings.

## How the two roles are actually enforced

Permissions are Row Level Security policies inside Postgres, not checks in the
browser. The deliveries page runs exactly the same query for both roles:

```ts
supabase.from('deliveries').select('*')
```

There is no `where driver_id = me` anywhere in the client. The dispatcher gets
every row and a driver gets only their own, because the database decides. A
driver who pastes the URL of another driver's delivery gets a "not found" page:
to them that row does not exist, even though they are signed in with a valid
token and asking for it by id.

Three mechanisms carry the rules, each doing what only it can:

| Mechanism        | What it enforces                                          |
| ---------------- | --------------------------------------------------------- |
| Column grants    | Which columns are writable at all - `role` is not one      |
| Policies         | Which rows, and in which direction a status may move       |
| A trigger        | That only a dispatcher changes customer details            |

The trigger exists because grants apply to the `authenticated` role, which
covers both of our roles, and `WITH CHECK` only sees the new row so it cannot
tell whether a column changed. Comparing old with new needs a trigger.

The publishable Supabase key is in the JavaScript bundle, as it is meant to be.
On its own it opens nothing: `anon` has no privileges on either table, so an
anonymous request gets `permission denied`, and sign-ups are disabled so no new
account can be made to get around it.

## The one piece of server code

Two small Vercel functions, in `frontend/api/`. They exist because the Geoapify
key must not reach the browser, so it is set in Vercel without a `VITE_` prefix
and never enters the bundle.

- `GET /api/map?id=...` returns a PNG of a delivery's address. It takes a
  delivery id rather than an address, and looks the address up from Supabase
  using the caller's own token, so one request does the authentication, the
  permission check and the lookup at once.
- `GET /api/geocode?address=...` checks whether an address can be found, and
  returns it as the map spells it, with coordinates. Dispatchers only.
- `GET /api/address-suggest?q=...` returns up to five real places as the
  dispatcher types, each with its own exact coordinates. Dispatchers only, and
  debounced in the browser so a long address is one lookup rather than forty.
- `GET /api/resolve-location?url=...` follows a shortened maps link, which the
  browser cannot read across origins, and reports the coordinates behind it.
  Only a fixed list of map hosts may be fetched, so it cannot be turned into a
  way of making the server fetch arbitrary addresses.

## Running locally

```
cd frontend
cp .env.example .env.local     # then fill in the two VITE_ values
npm install
npm run dev
```

The two `VITE_` values come from the Supabase dashboard, under Settings → API.

The map and the address check need the serverless functions, which `npm run
dev` does not run. Both fail gracefully: the map says it only runs on the
deployed site, and the address check is skipped rather than blocking a save.
Use `vercel dev` if you want them locally.

## Database setup

Run these in the Supabase SQL Editor, in order:

1. `supabase/schema.sql` — the two tables, and RLS switched on.
2. Create the users by hand in Authentication → Users, with **Auto Confirm
   User** ticked.
3. `supabase/seed_profiles.sql` — one profile row per account, looked up by
   email so no ids are hardcoded.
4. `supabase/policies.sql` — grants, policies and triggers. Safe to re-run; it
   prints every grant at the end so the result can be checked rather than
   trusted.

Then, in Authentication → Sign In / Providers: turn **Allow new users to sign
up** off, and turn **Confirm email** off.

## Shortcuts, and why

- **No separate backend.** Supabase is the database and the auth, and RLS is
  the permission layer. A Java service in front of it would have been a second
  thing to deploy and keep running, for rules Postgres already enforces closer
  to the data.
- **The most accurate address is the customer's own pin.** The dispatcher can
  ask for one over WhatsApp and paste back whatever the customer sends - a
  Google Maps link, an Android `geo:` link, a shortened link, or two
  coordinates. Reading those messages automatically would need the WhatsApp
  Business API, a verified business account and a webhook, so a person carries
  the pin across, which is what happens with a paper run sheet anyway.
- **Addresses are pinned, not guessed.** The dispatcher picks from
  suggestions, and the coordinates that come back are stored on the delivery.
  Geocoding a typed address afterwards would only find the street, which in a
  city where many buildings have no number leaves the driver guessing. Typing
  an address by hand still works and is confirmed on save, but it only pins
  the street, and the delivery page says so.
- **Addresses are stored as Geoapify spells them**, rather than as typed, at
  the cost of losing detail like an apartment number. A real shop would keep
  both.
- **No delete, anywhere.** Nothing in the brief needs it, and not granting it
  is simpler than guarding it.
- **No realtime.** The list is read when the page opens. For a shop with three
  staff, refreshing is fine.
