import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const npsBaseUrl = "https://developer.nps.gov/api/v1";

type CliOptions = {
  state?: string;
  parkCode?: string;
  query?: string;
  limit: number;
  maxPages: number;
};

type NpsCampground = {
  id?: string;
  name?: string;
  description?: string;
  parkCode?: string;
  latitude?: string;
  longitude?: string;
  url?: string;
  reservationUrl?: string;
  directionsOverview?: string;
  directionsUrl?: string;
  weatherOverview?: string;
  numberOfSitesReservable?: string;
  numberOfSitesFirstComeFirstServe?: string;
  totalSites?: string;
  fees?: Array<{ cost?: string; description?: string; title?: string }>;
  addresses?: Array<{
    line1?: string;
    line2?: string;
    city?: string;
    stateCode?: string;
    postalCode?: string;
    type?: string;
  }>;
  amenities?: Record<string, unknown>;
  accessibility?: Record<string, unknown>;
  contacts?: Record<string, unknown>;
  operatingHours?: Array<Record<string, unknown>>;
};

type NpsResponse = {
  total?: string;
  data?: NpsCampground[];
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { limit: 50, maxPages: 1 };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--state" && next) {
      options.state = next.toUpperCase();
      index += 1;
    } else if (arg === "--park" && next) {
      options.parkCode = next.toLowerCase();
      index += 1;
    } else if (arg === "--query" && next) {
      options.query = next;
      index += 1;
    } else if (arg === "--limit" && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--max-pages" && next) {
      options.maxPages = Number.parseInt(next, 10);
      index += 1;
    }
  }

  if (!Number.isFinite(options.limit) || options.limit < 1 || options.limit > 500) {
    throw new Error("--limit must be between 1 and 500");
  }

  if (!Number.isFinite(options.maxPages) || options.maxPages < 1 || options.maxPages > 20) {
    throw new Error("--max-pages must be between 1 and 20");
  }

  if (!options.state && !options.parkCode && !options.query) {
    throw new Error("Provide at least one of --state, --park, or --query to keep imports focused");
  }

  return options;
}

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function coordinate(value?: string) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinatesFor(campground: NpsCampground) {
  const lat = coordinate(campground.latitude);
  const lng = coordinate(campground.longitude);

  if (
    lat === null ||
    lng === null ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return { lat: null, lng: null };
  }

  return { lat, lng };
}

function regionFor(campground: NpsCampground, fallback?: string) {
  return campground.addresses?.find((address) => address.stateCode)?.stateCode ?? fallback ?? null;
}

function mappedPayload(campground: NpsCampground): Prisma.InputJsonObject {
  const sourceUrl = campground.url || campground.directionsUrl || null;

  return {
    sourceName: "National Park Service",
    sourceUrl,
    type: "NPS campground",
    summary: campground.description ?? "",
    amenities: toJson(campground.amenities ?? {}),
    accessibility: toJson(campground.accessibility ?? {}),
    reservationUrl: campground.reservationUrl || sourceUrl,
    directions: campground.directionsOverview ?? null,
    weatherOverview: campground.weatherOverview ?? null,
    parkCode: campground.parkCode ?? null,
    totalSites: campground.totalSites ?? null,
    reservableSites: campground.numberOfSitesReservable ?? null,
    firstComeFirstServeSites: campground.numberOfSitesFirstComeFirstServe ?? null,
    fees: toJson(campground.fees ?? []),
    addresses: toJson(campground.addresses ?? []),
    contacts: toJson(campground.contacts ?? {}),
    operatingHours: toJson(campground.operatingHours ?? [])
  };
}

async function fetchCampgrounds(options: CliOptions, start: number, apiKey: string) {
  const url = new URL(`${npsBaseUrl}/campgrounds`);
  url.searchParams.set("limit", String(options.limit));
  url.searchParams.set("start", String(start));
  if (options.state) url.searchParams.set("stateCode", options.state);
  if (options.parkCode) url.searchParams.set("parkCode", options.parkCode);
  if (options.query) url.searchParams.set("q", options.query);

  const response = await fetch(url, {
    headers: { accept: "application/json", "X-Api-Key": apiKey }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NPS request failed with ${response.status}: ${body.slice(0, 500)}`);
  }

  return (await response.json()) as NpsResponse;
}

async function main() {
  const apiKey = process.env.NPS_API_KEY;
  if (!apiKey) {
    throw new Error("NPS_API_KEY is required. Register at https://www.nps.gov/subjects/developer/get-started.htm");
  }

  const options = parseArgs(process.argv.slice(2));
  const source = await prisma.dataSource.upsert({
    where: { key: "nps" },
    update: {
      name: "National Park Service",
      baseUrl: npsBaseUrl,
      docsUrl: "https://www.nps.gov/subjects/developer/api-documentation.htm",
      termsUrl: "https://www.nps.gov/aboutus/disclaimer.htm"
    },
    create: {
      key: "nps",
      name: "National Park Service",
      baseUrl: npsBaseUrl,
      docsUrl: "https://www.nps.gov/subjects/developer/api-documentation.htm",
      termsUrl: "https://www.nps.gov/aboutus/disclaimer.htm"
    }
  });
  const run = await prisma.importRun.create({
    data: { sourceId: source.id, entityType: "CAMPGROUND", params: toJson(options) }
  });
  let fetchedCount = 0;
  let candidateCount = 0;
  let skippedCount = 0;

  try {
    for (let page = 0; page < options.maxPages; page += 1) {
      const start = page * options.limit;
      const response = await fetchCampgrounds(options, start, apiKey);
      const campgrounds = response.data ?? [];
      fetchedCount += campgrounds.length;

      for (const campground of campgrounds) {
        const externalId = campground.id?.trim();
        const name = campground.name?.trim();
        if (!externalId || !name) {
          skippedCount += 1;
          continue;
        }

        const { lat, lng } = coordinatesFor(campground);
        const sourceUrl = campground.url || campground.directionsUrl || null;
        await prisma.importCandidate.upsert({
          where: {
            sourceId_entityType_externalId: {
              sourceId: source.id,
              entityType: "CAMPGROUND",
              externalId
            }
          },
          update: {
            importRunId: run.id,
            name,
            normalizedName: normalizeName(name),
            region: regionFor(campground, options.state),
            sourceUrl,
            lat,
            lng,
            rawPayload: toJson(campground),
            mappedPayload: toJson(mappedPayload(campground))
          },
          create: {
            sourceId: source.id,
            importRunId: run.id,
            entityType: "CAMPGROUND",
            externalId,
            name,
            normalizedName: normalizeName(name),
            region: regionFor(campground, options.state),
            sourceUrl,
            lat,
            lng,
            rawPayload: toJson(campground),
            mappedPayload: toJson(mappedPayload(campground))
          }
        });
        candidateCount += 1;
      }

      const total = Number.parseInt(response.total ?? "0", 10);
      if (campgrounds.length < options.limit || start + campgrounds.length >= total) break;
    }

    await prisma.importRun.update({
      where: { id: run.id },
      data: { status: "SUCCEEDED", finishedAt: new Date(), fetchedCount, candidateCount, skippedCount }
    });
    console.log(`NPS campground import complete: fetched=${fetchedCount} candidates=${candidateCount} skipped=${skippedCount}`);
  } catch (error) {
    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        fetchedCount,
        candidateCount,
        skippedCount,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
