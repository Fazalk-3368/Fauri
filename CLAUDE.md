# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # next dev (Turbopack)
npm run build        # next build --webpack  <- --webpack is deliberate, see below
npm run lint         # eslint
npx tsc --noEmit     # typecheck; not part of build, run it explicitly
```

**`--webpack` on build is intentional.** Turbopack crashed on this project's CSS
(commit `1b0b249`). Dev still uses Turbopack. If you rewrite `globals.css`,
smoke-test **both** `next dev` and `npm run build` before assuming it is fine.

**There is no test runner.** Verification is `tsc --noEmit`, `eslint`, a
production build, and driving the app in a browser. For pure functions, the
established pattern is to compile the single module with `tsc --outDir` into a
scratch directory and exercise it with `node -e` (set `NODE_PATH` to the
project's `node_modules`, since the output lands outside the project).

**Database changes are applied by pasting the migration file into the Supabase
dashboard SQL editor.** The project is not linked to the Supabase CLI. Write the
file into `supabase/migrations/` with a new timestamp, then hand it over along
with a verification `SELECT` that returns one readable PASS/FAIL row per change.

**Deployment:** push to `main`; Vercel builds and deploys. The only public alias
is `https://fauri-ten.vercel.app` — every other deployment URL 302s to a Vercel
SSO login because Deployment Protection is on.

## What this is

Fauri is an on-demand marketplace for emergency tradework in Pakistan. A
customer posts a job with a map pin, every qualified tradesman inside the radius
is notified, they bid, the customer picks one, and cash changes hands at the
door. Bilingual English/Urdu with full RTL. Next.js 16 App Router, React 19,
Tailwind v4, Supabase (Postgres + PostGIS), MapLibre.

## Architecture

### The security model lives in the database, not the app

This is the single most important thing to understand. The React app is a thin
client. Authorization is enforced by Postgres RLS and `SECURITY DEFINER`
functions, so it applies identically to anything hitting PostgREST with the anon
key — the UI is **not** the privacy boundary.

Policy predicates (all in `supabase/migrations/`, defined in `…090200` and
tightened in `…20260925090000`):

- `can_view_job(job_id)` — owner, assigned provider, anyone who bid, or anyone
  the matcher pinged **while the job is still `open`**
- `can_view_job_chat(job_id)` — deliberately narrower than the above, so a
  losing bidder can see the job but never the conversation
- `can_message_job(job_id)` — as above plus a status check
- `shares_job_with(other)` — gates contact details; only an actual assignment
  counts, never a bid
- `is_admin()` — `role` comes from an allowlist in `handle_new_user`, never from
  client-supplied signup metadata

Column-level grants stop clients writing fields the platform owns: a provider
cannot set their own `rating_avg`, `verification_status`, `commission_rate` or
`current_location`; a customer cannot flip a job to `completed`.

### Writes go through RPCs; reads come back shaped

Every state transition is an RPC, not a table write — the ledger and the event
timeline cannot be skipped:

`create_job`, `accept_offer` (locks the job row, rejects rival bids in one
transaction), `update_job_status`, `complete_job`, `cancel_job`,
`update_provider_location`, `mark_notifications_read`.

Direct table writes are limited to: inserting/updating your own `job_offers`,
inserting `messages` and `reviews`, and updating your own profile fields.

Read paths are also RPCs that return pre-shaped JSON and do their own
field-level filtering: `job_detail` (nulls the counterpart's phone unless you
are the customer or the assigned provider), `customer_jobs`, `nearby_open_jobs`.
Because these are `SECURITY DEFINER` they bypass RLS, which is why every direct
`profiles` / `provider_profiles` query in the app is self-scoped to `user.id`.

### The matcher, and why notification rows matter twice

An `AFTER INSERT` trigger on `jobs` (`notify_nearby_providers`) finds every
provider who is online, offers that trade, and sits inside **both** their travel
radius and the customer's broadcast radius (`least(service_radius_km,
notify_radius_km)`), then inserts a notification row for each.

Those rows do double duty: they stream to the browser over Supabase Realtime
**and** they are the authorization anchor in `can_view_job`. Changing how they
are written changes who can read a job.

### Routing and the proxy

- `src/app/(marketing)/` — public pages, shared nav/footer in its layout
- `src/app/(app)/` — requires a session; layout redirects and renders `AppHeader`
- `src/proxy.ts` → `src/lib/supabase/proxy.ts` — Next 16's middleware
  replacement. Refreshes the Supabase cookie and gates routes.

**Adding a public route means adding it to `PUBLIC_PATHS` in
`src/lib/supabase/proxy.ts`**, or signed-out visitors get bounced to `/login`.

Two auth callbacks exist and are not interchangeable: `/auth/callback` exchanges
a PKCE `code` and needs the verifier held by the browser that began the signup;
`/auth/confirm` takes a self-contained `token_hash` and therefore works when the
email is opened on a different device.

### Types

`src/lib/types/database.ts` is hand-maintained and mirrors the SQL. Entries must
be `type` aliases, **never `interface`** — interfaces lack the implicit index
signature, which silently degrades every table and RPC to `never` rather than
erroring. Regenerate with `npx supabase gen types typescript` if the schema
drifts far.

## Conventions

### i18n

`src/lib/i18n/dictionaries.ts` holds every user-facing string. `ur` is typed as
`Mirror<Dictionary>`, so a missing Urdu key is a **build error**, not a runtime
fallback.

Claude does not write shipped Urdu. New strings go in as English in **both**
locale slots with a comment saying why, and the user supplies the translation
later. Several strings are currently in that state and are marked as such.

English copy inside the RTL page needs `dir="auto"` on its container, or bidi
drags the full stop to the wrong end of the line.

### RTL is load-bearing

The codebase has zero physical-direction utilities and should stay that way.
Use `ms/me/ps/pe/start/end/text-start/text-end`, and `ltr:`/`rtl:` pairs for any
`translate-x`. This grep must come back empty:

```bash
grep -rnE '\b(pl|pr|ml|mr|left-|right-|text-left|text-right)-' src --include='*.tsx'
```

### Design tokens

All in `src/app/globals.css`. **Light only** — dark mode was removed
deliberately, so there are no `dark:` variants and no `prefers-color-scheme`.

Two token decisions that will bite if you miss them:

- **`--brand` is a fill, `--brand-ink` is text.** The teal measures 3.1:1 as text
  on `--bg` and fails AA. Buttons use `--brand` with `--brand-fg` (near-black,
  5.8:1). Anything that is actually text uses `--brand-ink`. Every tinted
  background pairs with its `*-soft-fg`.
- **`--text-*--line-height` is `inherit` on purpose.** Tailwind's text utilities
  normally emit their own line-height, which beat the inherited value and pinned
  the entire Urdu app at Latin leading. Deferring to the cascade is what lets
  `[dir="rtl"] body { line-height: 2.1 }` reach every element.

Amber (`--urgent`) means emergency and nothing else. Ratings use `--star`,
"commission due" uses `--warn`.

Radius, shadow and type override Tailwind's **built-in** namespaces, so existing
`rounded-xl` / `shadow-sm` / `text-sm` call sites pick up the scale with no
edits. Do not reintroduce `[var(--token)]` arbitrary values; the named utilities
exist.

### Copy

No em-dashes or en-dashes in anything a user sees — dictionaries (both locales),
`alt` text, `aria-label`s, metadata. Use a period, a comma, or a hyphen.

```bash
grep -rn '—\|–' src/lib/i18n/dictionaries.ts   # must be empty
```

## Known constraints

- **Email templates cannot be edited** without custom SMTP configured in
  Supabase, which is why signup confirmation uses a link rather than a 6-digit
  code. The code path was built and then removed; see commit `9e0fd68`.
- **Browser geolocation fails on desktops in this market.** No GPS means a
  Wi-Fi-database lookup, and coverage in Pakistan is thin. Customers fall back
  to tapping the map; providers get a manual pin picker when the lookup fails.
  `MapCanvas` accepts a tap as well as a drag.
- **No settlement flow.** `commission_ledger` records what a provider owes;
  paying it happens outside the app, and `/pricing` says so.
- **Providers are not verified.** The `verification_status` column and badge
  exist but nothing sets them.
