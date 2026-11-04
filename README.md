# Taboo Desires

A Next.js app (App Router) in `src/app`, backed entirely by Supabase.

## Frontend: Next.js

| Piece | Where |
| --- | --- |
| Routes (one `page.tsx` per URL, page titles) | `src/app` (`(site)` holds every page with the header and footer) |
| Screens rendered by those routes | `src/views` |
| Shared components, hooks, backend client | `src/components`, `src/hooks`, `src/lib` |

```sh
pnpm install
cp .env.example .env.local   # Supabase URL, publishable key, function slug
pnpm dev                      # http://localhost:5173
pnpm build && pnpm start      # production build
```

Screens are client components (`"use client"`): data loads in the browser through the `api` Edge Function, so pages are rendered with their loading state on the server and fill in once the session is known. Environment variables must start with `NEXT_PUBLIC_` to reach the browser. Deploy on Vercel or any Node host; set the three `NEXT_PUBLIC_SUPABASE_*` variables there and add the site's address to Supabase's Redirect URLs.

# Backend: Supabase

The app runs entirely on Supabase: database, file storage, backend function and sign-in (Supabase Auth with email + password and email magic links).

## How it fits together

| Piece                                                                                              | Where                                                                            |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Tables, indexes, constraints                                                                       | `supabase/migrations/20261031000000_init_schema.sql`                             |
| Storage buckets, auction-closing cron job                                                          | `supabase/migrations/20261031000100_platform.sql`                                |
| Every query and mutation (same names as before, e.g. `listings.get`)                               | `supabase/functions/_shared/modules/*.ts`                                        |
| Rules shared with the UI (plans, bidding, accounts, forum, profile fields)                         | `supabase/functions/_shared/domain/*.ts` (imported in the app as `@/shared/...`) |
| HTTP entry point (`/functions/v1/api`)                                                             | `supabase/functions/api/index.ts`                                                |
| React hooks (`useQuery`, `useMutation`, `usePaginatedQuery`, `useBackendAuth`, `Authenticated`...) | `src/lib/backend/react.tsx`                                                      |
| Typed function references (`api.listings.get`) and row types (`Doc`, `Id`)                         | `src/lib/backend/api.ts`, `src/lib/backend/types.ts`                             |
| File uploads                                                                                       | `src/lib/backend/upload.ts`                                                      |

- **Access control.** Every table has row level security turned on with no policies, so the browser can't read or write tables directly. All access goes through the `api` Edge Function, which checks the Supabase Auth access token (sent in the `x-user-token` header) and applies the same rules the Convex functions did.
- **Transactions.** Each call runs in one Postgres transaction. Writes use serializable isolation and are retried automatically on conflicts, so a mutation is all-or-nothing as before.
- **Live updates.** Any write broadcasts the changed table's name (never row data) on the public Realtime topic `db-changes`. Browsers refetch the queries that read that table. After a mutation returns, the caller's own affected queries have already been refreshed.
- **Files.** Files live in two buckets. `public-media` holds listing photos, blurred previews, avatars, profile photos and feed photos. `private-media` holds locked originals and verification photos, which are only shown through 6-hour signed URLs to people allowed to see them. Uploads use one-time signed upload URLs, and the server only accepts files the user uploaded themselves.
- **Auctions.** `pg_cron` runs `app.close_due_auctions()` every minute. Deletes cascade through foreign keys instead of background purge jobs.

## Sign-in (Supabase Auth)

Pages: `/signin` (sign in, create account, email link), `/auth/callback` (where email links land) and `/auth/reset` (choose a new password). In the Supabase dashboard:

- **Authentication → URL Configuration**: set **Site URL** to your site (e.g. `https://your-domain`) and add `https://your-domain/**` (and `http://localhost:5173/**` for development) to **Redirect URLs**. Email links only work for listed addresses.
- **Authentication → Sign In / Providers → Email**: keep it enabled with **Confirm email** on.
- Supabase's built-in email sender is rate-limited and meant for testing; for real traffic add your own SMTP under **Authentication → Emails → SMTP Settings**.

## First-time setup

1. Create a Supabase project. Then:
   ```sh
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push                     # creates tables, buckets, cron job
   npx supabase functions deploy api        # verify_jwt is off in supabase/config.toml
   ```
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_FUNCTION` (the function's slug) (Dashboard → Project Settings → API).
3. Locked videos can be up to 200 MB. Raise **Storage → Settings → Upload file size limit** to match; the Free plan allows at most 50 MB.
4. Optional: set `ALLOWED_ORIGINS=https://your-domain` as a function secret to restrict CORS.

## Moving your Convex data

```sh
# unzip the Convex snapshot export, then:
pnpm import:convex ./convex-export --out convex-import.sql
psql "<connection string from Dashboard → Connect>" -f convex-import.sql
```

Convex ids become UUIDs derived from the old id, and the import can be re-run safely. Existing users keep their accounts: each one is claimed by the first Supabase Auth login whose verified email matches. Old links that contain Convex ids (`/listing/j97...`) won't resolve.

The export you have doesn't include the uploaded files. To copy those, re-export with `npx convex export --include-file-storage --path export.zip`, unzip it, and run the import with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set.

## Local development

```sh
pnpm db:start                                     # local Supabase (Docker)
cp supabase/functions/api/env.example supabase/functions/.env   # fill in, set PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
pnpm functions:serve
pnpm dev
```

## Tests

`pnpm test` runs the backend suites in `supabase/functions/_shared/tests` against the real schema. Each test gets a fresh database: in-process PGlite by default, or any Postgres via `TEST_DATABASE_URL`. For example, with `supabase start` running:

```sh
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres pnpm test
```

## Adding a backend function

Add an exported `query(...)` or `mutation(...)` to a module in `supabase/functions/_shared/modules/`. It's picked up by `registry.ts` and becomes `api.<module>.<name>` in the app with full types. Use `ctx.db` (`get`, `first`, `select`, `insert`, `patch`, `delete`, `paginate`, or raw SQL via `rows`) and `ctx.storage`. Throw `AppError` for messages the user should see. Schema changes go in a new file in `supabase/migrations/`.
