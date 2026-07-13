# ClimbSite

ClimbSite is a climber-focused trip-planning app. It connects climbing areas, nearby camping, approach notes, parking/road friction, and outbound source links so weekend climbers can plan the whole trip without replacing guidebooks or reservation systems.

## MVP

- Red River Gorge starter dataset
- Browse curated climbing areas
- Compare nearby camping options per area
- View climbing areas and campgrounds on a Leaflet/OpenStreetMap map
- Sign in with Auth.js-backed accounts and save road trips
- Manually add climbing stops to a trip
- Link out to official campground/climbing sources

## Stack

- Next.js App Router
- React
- Prisma
- Postgres for local and deployed data
- Leaflet/OpenStreetMap
- Auth.js with the Prisma adapter

## Local Development

Install dependencies:

```bash
corepack pnpm install
```

Create and seed the database. Prisma is configured for Postgres, so `DATABASE_URL` must start with
`postgresql://` or `postgres://`.

```bash
corepack pnpm db:push
corepack pnpm db:seed
```

Run the app:

```bash
corepack pnpm dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` if needed:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/climbsite?sslmode=require"
AUTH_SECRET="generate-a-long-random-secret"
AUTH_URL="http://localhost:3000"
AUTH_EMAIL_FALLBACK="true"

# Magic-link email sign-in
AUTH_RESEND_KEY="re_..."
AUTH_EMAIL_FROM="ClimbSite <login@climbsite.app>"

# Optional OAuth providers
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_APPLE_ID=""
AUTH_APPLE_SECRET=""

# Recreation.gov RIDB imports
RIDB_API_KEY=""

# National Park Service campground imports
NPS_API_KEY=""
```

`AUTH_SECRET` is required in production. Local development has a fallback secret so pages can render
before credentials are configured, but real deployments should always set a generated secret.
`AUTH_EMAIL_FALLBACK` should be `true` only for local development or private testing.

Auth providers are enabled only when their env vars are present:

- Resend magic links require `AUTH_RESEND_KEY` and `AUTH_EMAIL_FROM`.
- Google sign-in requires `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
- Apple sign-in requires `AUTH_APPLE_ID` and `AUTH_APPLE_SECRET`.

Production tester auth should use real providers:

```bash
AUTH_URL="https://climbsite.vercel.app"
AUTH_EMAIL_FALLBACK="false"
AUTH_EMAIL_FROM="ClimbSite <login@climbsite.app>"
```

Configure Resend for the `climbsite.app` sender domain before inviting testers. Configure Google
OAuth with this production callback URL:

```text
https://climbsite.vercel.app/api/auth/callback/google
```

Changing configured providers does not remove existing users, trips, or admin roles. Auth.js does
not automatically link an OAuth identity to an existing same-email account; users should continue
with their original method until an authenticated account-linking flow is implemented.

## Authentication

ClimbSite uses Auth.js as the account layer. Trips are owned by `User.id`, not by a provider account.
Automatic same-email provider linking remains disabled because Auth.js correctly treats it as unsafe
between arbitrary providers.

Current auth routes:

- `/login` shows configured sign-in methods.
- `/login/check-email` confirms that a magic link was sent.
- `/account` shows account identity, saved trip count, and future billing status.
- `/api/auth/[...nextauth]` is the Auth.js route handler.

After changing `prisma/schema.prisma`, run:

```bash
corepack pnpm db:generate
corepack pnpm db:push
```

If `.env` is not the Postgres env file, load the deployed/local Postgres env before pushing:

```bash
set -a; source .env.local; set +a; corepack pnpm db:push
```

## Admin Account

Yes, ClimbSite needs an admin account before API imports are exposed. Imported campground and
climbing records should be reviewed before becoming public trip-planning data.

Users default to `USER`. Promote a trusted account to `ADMIN` after the user has signed in once:

```sql
update "User"
set role = 'ADMIN'
where email = 'you@example.com';
```

Admin functionality is available at `/admin/imports` for users with `role = ADMIN`. The current
review screen shows recent import runs, filters candidates by status/entity type, and supports:

- Accepting a candidate as a new quarantined `needs_review` record.
- Linking a candidate to an existing campground or climbing area as an `ExternalReference`.
- Marking a candidate as `NEEDS_RESEARCH`.
- Ignoring a candidate.

Imported records remain review-gated. Accepting a candidate creates an imported record that still
needs editorial review; public discovery only exposes records and area/camp relationships with
`reviewStatus = reviewed`.

Canonical editing and publication are available at `/admin/content`. Admins can create records
manually, edit accepted imports, publish or unpublish areas and campgrounds, and create reviewed
area-to-campground logistics relationships. Publication requires complete editorial text and an
authoritative source URL; relationships require both endpoint records to be reviewed first.

## API Integration Roadmap

The next major feature is API imports for metadata, not reservations. ClimbSite should keep linking
out to official reservation and climbing-detail sources.

Recommended integration order and current status:

1. Done: add source-aware database models:
   `DataSource`, `ExternalReference`, `ImportRun`, and `ImportCandidate`.
2. Done: import campground/facility metadata from Recreation.gov RIDB.
3. Done: import broad climbing recreation-area metadata from Recreation.gov RIDB.
4. Done: import climbing area metadata from OpenBeta where coverage exists.
5. Done: import review-gated campground metadata from the National Park Service API.
6. Next: import NPS alerts as time-sensitive records without treating cached alerts as current.
7. Later: add OpenStreetMap/Overpass enrichment for geospatial details only after caching and rate-limit
   rules are in place.
8. Done: build admin review so imported candidates can be accepted, linked to existing records, ignored,
   or marked for research.

Good first sources:

- Recreation.gov RIDB: `https://ridb.recreation.gov/`
- National Park Service API: `https://www.nps.gov/subjects/developer/api-documentation.htm`
- OpenBeta GraphQL: `https://github.com/OpenBeta/openbeta-graphql`
- OpenStreetMap Overpass: `https://wiki.openstreetmap.org/wiki/Overpass_API`

Mountain Project should be treated as a curated outbound link source instead of an import dependency.
Its old public data API is deprecated, and guidebook-style route data should remain outside ClimbSite.

## National Park Service Campground Imports

NPS provides official National Park Service campground metadata. It complements RIDB rather than
overwriting it; candidates from both sources can be linked to one canonical campground during review.

```bash
corepack pnpm import:nps:campgrounds -- --state TN --limit 50 --max-pages 1
corepack pnpm import:nps:campgrounds -- --park grsm --limit 50 --max-pages 1
```

At least one of `--state`, `--park`, or `--query` is required. NPS imports never publish automatically.

## RIDB Campground Imports

RIDB imports store records as review candidates. They do not automatically publish new campgrounds
into trip-planning pages.

Set `RIDB_API_KEY` first. You can request/register for access through `https://ridb.recreation.gov/`.

RIDB data should be credited anywhere imported data is shown. Use this attribution:
`data source: ridb.recreation.gov`, with a link to `https://ridb.recreation.gov/`.

Run a small first import:

```bash
corepack pnpm import:ridb:campgrounds -- --state KY --query campground --limit 25 --max-pages 1
```

Useful early Southeast passes:

```bash
corepack pnpm import:ridb:campgrounds -- --state KY --query campground --limit 50 --max-pages 1
corepack pnpm import:ridb:campgrounds -- --state TN --query campground --limit 50 --max-pages 1
corepack pnpm import:ridb:campgrounds -- --state WV --query campground --limit 50 --max-pages 1
corepack pnpm import:ridb:campgrounds -- --state AL --query campground --limit 50 --max-pages 1
corepack pnpm import:ridb:campgrounds -- --state GA --query campground --limit 50 --max-pages 1
```

Script options:

- `--state KY`: optional two-letter state filter.
- `--query campground`: RIDB search text, defaults to `campground`.
- `--limit 50`: page size, 1-500.
- `--offset 0`: starting offset.
- `--max-pages 1`: page count cap, 1-20.

Each run creates an `ImportRun` row and upserts `ImportCandidate` rows keyed by RIDB facility ID.
Candidates preserve raw RIDB payloads plus mapped campground fields for later admin review.

## RIDB Climbing Area Imports

RIDB also exposes activities. The climbing-related activity IDs currently used by ClimbSite are:

- `7`: CLIMBING
- `100041`: ROCK CLIMBING
- `100040`: MOUNTAIN CLIMBING
- `100035`: ICE CLIMBING

Climbing imports use RIDB recreation areas, not facilities, and store records as review candidates.
RIDB climbing data is broad; it can describe a national forest, lake, or recreation area where
climbing exists, not necessarily a precise crag or wall. Treat these as research leads.

Run a small first import:

```bash
corepack pnpm import:ridb:climbing-areas -- --state KY --limit 25 --max-pages 1
```

Useful early passes:

```bash
corepack pnpm import:ridb:climbing-areas -- --state KY --limit 50 --max-pages 1
corepack pnpm import:ridb:climbing-areas -- --state TN --limit 50 --max-pages 1
corepack pnpm import:ridb:climbing-areas -- --state WV --limit 50 --max-pages 1
corepack pnpm import:ridb:climbing-areas -- --state AL --limit 50 --max-pages 1
corepack pnpm import:ridb:climbing-areas -- --state GA --limit 50 --max-pages 1
```

Use `--activities 7,100041` to narrow the activity IDs if needed.

## OpenBeta Climbing Area Imports

OpenBeta is the preferred API source for climbing-area candidates. ClimbSite imports area records
and immediate child areas only; it does not import routes.

Run a small import:

```bash
corepack pnpm import:openbeta:climbing-areas -- --terms "Red River Gorge|Foster Falls|New River Gorge" --limit 3
```

Use `--state KY`, `--state TN`, `--state WV`, `--state AL`, or `--state GA` to filter imported
records by OpenBeta path tokens. The importer stores OpenBeta records as `ImportCandidate` rows with
`entityType = CLIMBING_AREA` for admin review.

## Product Boundaries

ClimbSite does not host climbing guidebook content, sell reservations, or replace campground platforms. It is the planning layer between climbing objectives and overnight logistics.
Public pages should always make source attribution visible and link users out for route, access,
permit, closure, reservation, and booking details. ClimbSite stores planning summaries and
campground-to-area logistics; it is not the source of truth for climbing or camping data.
