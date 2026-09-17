# Delivery Run Sheet

A small shop dispatches customer deliveries to its drivers.

- **Dispatcher** sees every delivery, creates deliveries, and assigns or reassigns a driver
  while a delivery is still pending.
- **Driver** sees only the deliveries assigned to them, and marks their own pending
  deliveries as delivered.

Statuses are `pending` and `delivered`. Delivered is final.

## Stack

| Part      | Technology                                            | Hosting |
| --------- | ----------------------------------------------------- | ------- |
| Frontend  | React, Vite, TypeScript, React Router, Tailwind        | Vercel  |
| Backend   | Spring Boot, Java 21, Maven                            | Render  |
| Database  | Supabase Postgres, over JDBC with Spring Data JPA      | Supabase |
| Auth      | Supabase Auth (email + password, sign-ups disabled)    | Supabase |
| Maps      | Geoapify, called only from the backend                 | -       |

## Layout

    frontend/   React app
    backend/    Spring Boot API

## Live URLs

_Filled in once deployed._

## Running locally

_Filled in once there is something to run._

## Notes

_Design decisions and shortcuts, written up at the end._
