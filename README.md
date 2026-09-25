# Fauri

**فوری — ہمیشہ حاضر** · *"Immediate — always at your service."*

An on-demand marketplace for emergency tradework in Pakistan. When shops have to
shut at 9pm but a pipe bursts at 11, a customer posts the job, every qualified
tradesman inside the radius is pinged instantly, they bid a price, the customer
picks one, and cash changes hands at the door.

Think inDrive, for electricians and plumbers.

---

## Status

The web app is feature-complete and builds clean. The schema is **applied and
verified** against a live Supabase project (Postgres 17.6, PostGIS 3.3.7):

- The first 8 migrations apply cleanly from empty — 11 tables, 24 RLS policies,
  23 functions, 18 triggers, 31 indexes, 10 seeded trades. A 9th was added
  after an authorization audit (see [Schema map](#schema-map)) and has **not**
  yet been applied to the live project.
- The full lifecycle passes end to end: signup trigger → provider goes online →
  customer posts → **matcher fires with correct geography distance** → bid →
  accept → en route → in progress → complete → commission ledger → review
  rolls up the provider's rating.
- 14 authorization tests pass: an uninvolved provider cannot read a job, its
  chat or the customer's profile; a provider cannot inflate their own rating,
  self-verify, cut their own commission or self-accept an offer; a customer
  cannot flip a job to `completed` or edit the commission ledger.

What has **not** been exercised is the browser path — the app has never been
run against this database by a real signed-in user. See [Known gaps](#known-gaps).

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript | Server components keep the first paint fast on poor connections |
| Styling | Tailwind CSS v4, CSS custom properties | Light/dark from one token set, logical properties for RTL |
| Database | Supabase Postgres + PostGIS | `ST_DWithin` does the "who is nearby" matching in the database |
| Realtime | Supabase Realtime | Job pings, offers and chat arrive without polling |
| Auth | Supabase Auth (email/password) | Phone + OTP drops in later without a schema change |
| Maps | MapLibre GL | No API key needed to develop |

## How the matching works

1. A customer calls `create_job()`, which writes a `geography(Point)`.
2. An `AFTER INSERT` trigger (`notify_nearby_providers`) finds every provider who
   is **online**, offers **that trade**, and sits inside **both** their own travel
   radius and the customer's broadcast radius — then inserts a notification row
   for each.
3. Those rows stream to the provider's browser over Realtime.
4. Providers bid. `accept_offer()` locks the job row, assigns the winner and
   rejects every rival bid in one transaction, so a double-tap cannot assign two
   people.
5. `complete_job()` closes the job, records the cash amount, and writes the
   platform's cut to `commission_ledger` as a debt the provider settles later.

The notification row doubles as the authorisation anchor: `can_view_job()` lets a
provider read a job only if they own it, were assigned it, bid on it, or were
pinged about it. Nobody can browse strangers' home addresses.

## Bringing it up

### 1. Create a Supabase project

Note the project ref from the dashboard URL.

**Pick `ap-south-1` (Mumbai).** It is the closest Supabase region to Pakistan —
roughly 1,800km from Lahore versus ~6,000km for Seoul or Singapore. Every query
and every realtime message pays that round trip, and "the tradesman is pinged
instantly" is the product.

### 2. Apply the schema

Either link the CLI and push:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

```bash
npx supabase db push
```

…or paste each file in `supabase/migrations/` into the dashboard SQL editor **in
filename order**. Order matters: types, then tables, then functions, then RLS.

### 3. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
Project Settings → API.

### 4. Run it

```bash
npm run dev
```

### 5. Try the full loop

You need two accounts in two browsers (or one plus a private window):

1. Sign up as a **Tradesman**, pick trades, finish setup, hit **Go online** and
   allow location.
2. Sign up as a **Customer** in the other browser, post a job at a pin near the
   tradesman.
3. The tradesman's feed should light up within a second.
4. Bid → accept → on my way → start work → complete → review.

## Schema map

| Migration | Contents |
| --- | --- |
| `…090000_init_extensions_and_enums` | PostGIS, pgcrypto, every enum |
| `…090100_core_tables` | 11 tables, constraints, GIST + btree indexes |
| `…090200_functions_and_triggers` | New-user handling, the matcher, notification and rating triggers |
| `…090300_rpcs` | `accept_offer`, `complete_job`, `cancel_job`, the geo feeds |
| `…090400_rls_policies` | RLS on every table, plus column-level grants |
| `…090500_realtime_and_seed` | Realtime publication, 10 trade categories |
| `…090600_coordinates_and_create_job` | Generated `lat`/`lng`, `create_job`, `job_detail` |
| `…090700_customer_jobs` | The customer's job list in one round trip |
| `…20260925_tighten_authorization` | Closes three self-granted-access gaps found by audit |

### Security posture

- RLS denies by default on all 11 tables.
- Column-level grants stop a client writing fields the platform owns — a provider
  cannot set their own `rating_avg`, `verification_status` or `commission_rate`,
  and a customer cannot flip a job to `completed` to dodge the commission ledger.
- Every status change goes through a `SECURITY DEFINER` RPC with an explicit
  `search_path = ''` and fully-qualified references.
- `role` comes from an allowlist in the signup trigger, never from the signup
  metadata the browser sent, so `admin` cannot be self-served.
- Phone numbers are only readable by the two people actually assigned to a job.
  Bidding does not earn them — a losing bidder's view of the customer is
  whatever `job_detail()` chooses to return, field by field.
- The matcher's notification row lets a provider open a job only while it is
  still `open`. Once the customer picks someone, the job's address stops being
  readable by everyone who happened to be pinged, and the chat closes to
  everyone but the two parties.

## Known gaps

These are deliberate omissions, not oversights:

- **The UI has not been driven against the live database.** The SQL layer is
  tested; signing in through the browser and posting a real job is not.
- **No provider verification flow.** The `verification_status` column exists and
  the badge renders, but there is no CNIC upload or admin approval screen.
- **No push notifications.** Alerts only arrive in an open tab. A tradesman with
  the app closed hears nothing — this is the single biggest gap before real use,
  and wants web push or the mobile app.
- **No payments.** Cash only; the commission ledger records what is owed but
  there is no settlement flow.
- **OSM tiles.** Fine for development, not licensed for production traffic. Set
  `NEXT_PUBLIC_MAP_STYLE_URL` to a MapTiler or Protomaps style before launch.
- **No automated tests.**
- **Jobs never expire.** The `expired` status exists but nothing sets it; a cron
  job should close stale open jobs.
