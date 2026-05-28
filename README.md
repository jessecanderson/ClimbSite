# ClimbSite

ClimbSite is a climber-focused trip-planning app. It connects climbing areas, nearby camping, approach notes, parking/road friction, and outbound source links so weekend climbers can plan the whole trip without replacing guidebooks or reservation systems.

## MVP

- Red River Gorge starter dataset
- Browse curated climbing areas
- Compare nearby camping options per area
- View climbing areas and campgrounds on a Leaflet/OpenStreetMap map
- Sign in with email and save road trips
- Manually add climbing stops to a trip
- Link out to official campground/climbing sources

## Stack

- Next.js App Router
- React
- Prisma
- Postgres for local and deployed data
- Leaflet/OpenStreetMap

## Local Development

Install dependencies:

```bash
corepack pnpm install
```

Create and seed the database:

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
SESSION_COOKIE_NAME="climbsite_session"
```

## Product Boundaries

ClimbSite does not host climbing guidebook content, sell reservations, or replace campground platforms. It is the planning layer between climbing objectives and overnight logistics.
