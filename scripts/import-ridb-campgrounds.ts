import { PrismaClient, type Prisma } from "@prisma/client";
import { analyzeImportSync } from "../lib/import-sync";

const prisma = new PrismaClient();
const ridbBaseUrl = "https://ridb.recreation.gov/api/v1";

type CliOptions = {
  query: string;
  state?: string;
  limit: number;
  offset: number;
  maxPages: number;
};

type RidbFacility = {
  FacilityID?: string | number;
  FacilityName?: string;
  FacilityTypeDescription?: string;
  FacilityDescription?: string;
  FacilityLatitude?: string | number | null;
  FacilityLongitude?: string | number | null;
  FacilityReservationURL?: string;
  FacilityDirections?: string;
  FacilityPhone?: string;
  FacilityEmail?: string;
  FacilityAdaAccess?: string;
  FacilityMapURL?: string;
  FacilityUseFeeDescription?: string;
  FacilityState?: string;
  FacilityStreetAddress1?: string;
  FacilityStreetAddress2?: string;
  FacilityCity?: string;
  FacilityZip?: string;
  Keywords?: string;
  StayLimit?: string;
  Reservable?: boolean | string;
};

type RidbResponse = {
  RECDATA?: RidbFacility[];
  METADATA?: {
    RESULTS?: {
      CURRENT_COUNT?: number;
      TOTAL_COUNT?: number;
    };
  };
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    query: "campground",
    limit: 50,
    offset: 0,
    maxPages: 1
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--query" && next) {
      options.query = next;
      index += 1;
    } else if (arg === "--state" && next) {
      options.state = next.toUpperCase();
      index += 1;
    } else if (arg === "--limit" && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--offset" && next) {
      options.offset = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--max-pages" && next) {
      options.maxPages = Number.parseInt(next, 10);
      index += 1;
    }
  }

  if (!Number.isFinite(options.limit) || options.limit < 1 || options.limit > 500) {
    throw new Error("--limit must be between 1 and 500");
  }

  if (!Number.isFinite(options.offset) || options.offset < 0) {
    throw new Error("--offset must be 0 or greater");
  }

  if (!Number.isFinite(options.maxPages) || options.maxPages < 1 || options.maxPages > 20) {
    throw new Error("--max-pages must be between 1 and 20");
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

function parseCoordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinatePair(latValue: string | number | null | undefined, lngValue: string | number | null | undefined) {
  const lat = parseCoordinate(latValue);
  const lng = parseCoordinate(lngValue);

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

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function sourceUrlForFacility(facility: RidbFacility) {
  if (facility.FacilityReservationURL) {
    return facility.FacilityReservationURL;
  }

  if (facility.FacilityID) {
    return `https://www.recreation.gov/camping/campgrounds/${facility.FacilityID}`;
  }

  return null;
}

function looksLikeCampground(facility: RidbFacility) {
  const haystack = [
    facility.FacilityName,
    facility.FacilityTypeDescription,
    facility.FacilityDescription,
    facility.Keywords
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("campground") || haystack.includes("camping");
}

function mappedPayloadForFacility(facility: RidbFacility): Prisma.InputJsonObject {
  const sourceUrl = sourceUrlForFacility(facility);

  return {
    sourceName: "ridb.recreation.gov",
    sourceUrl,
    type: facility.FacilityTypeDescription ?? "Federal facility",
    summary: facility.FacilityDescription ?? "",
    amenities: [
      facility.FacilityAdaAccess ? `ADA access: ${facility.FacilityAdaAccess}` : null,
      facility.FacilityUseFeeDescription ? `Fees: ${facility.FacilityUseFeeDescription}` : null,
      facility.StayLimit ? `Stay limit: ${facility.StayLimit}` : null,
      facility.Reservable !== undefined ? `Reservable: ${String(facility.Reservable)}` : null
    ].filter(Boolean),
    reservationUrl: sourceUrl,
    directions: facility.FacilityDirections ?? null,
    phone: facility.FacilityPhone ?? null,
    email: facility.FacilityEmail ?? null,
    address: {
      street1: facility.FacilityStreetAddress1 ?? null,
      street2: facility.FacilityStreetAddress2 ?? null,
      city: facility.FacilityCity ?? null,
      state: facility.FacilityState ?? null,
      zip: facility.FacilityZip ?? null
    }
  };
}

async function fetchFacilities(options: CliOptions, offset: number, apiKey: string) {
  const url = new URL(`${ridbBaseUrl}/facilities`);
  url.searchParams.set("query", options.query);
  url.searchParams.set("limit", String(options.limit));
  url.searchParams.set("offset", String(offset));

  if (options.state) {
    url.searchParams.set("state", options.state);
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      apikey: apiKey
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RIDB request failed with ${response.status}: ${body.slice(0, 500)}`);
  }

  return (await response.json()) as RidbResponse;
}

async function main() {
  const apiKey = process.env.RIDB_API_KEY;

  if (!apiKey) {
    throw new Error("RIDB_API_KEY is required. Register for a key at https://ridb.recreation.gov/.");
  }

  const options = parseArgs(process.argv.slice(2));
  const source = await prisma.dataSource.upsert({
    where: { key: "ridb" },
    update: {
      name: "ridb.recreation.gov",
      baseUrl: ridbBaseUrl,
      docsUrl: "https://ridb.recreation.gov/docs",
      termsUrl: "https://ridb.recreation.gov/access-agreement-ridb"
    },
    create: {
      key: "ridb",
      name: "ridb.recreation.gov",
      baseUrl: ridbBaseUrl,
      docsUrl: "https://ridb.recreation.gov/docs",
      termsUrl: "https://ridb.recreation.gov/access-agreement-ridb"
    }
  });

  const run = await prisma.importRun.create({
    data: {
      sourceId: source.id,
      entityType: "CAMPGROUND",
      params: toJson(options)
    }
  });

  let fetchedCount = 0;
  let candidateCount = 0;
  let skippedCount = 0;

  try {
    for (let page = 0; page < options.maxPages; page += 1) {
      const offset = options.offset + page * options.limit;
      const data = await fetchFacilities(options, offset, apiKey);
      const facilities = data.RECDATA ?? [];

      fetchedCount += facilities.length;

      for (const facility of facilities) {
        const externalId = facility.FacilityID ? String(facility.FacilityID) : null;
        const name = facility.FacilityName?.trim();

        if (!externalId || !name || !looksLikeCampground(facility)) {
          skippedCount += 1;
          continue;
        }

        const { lat, lng } = coordinatePair(
          facility.FacilityLatitude,
          facility.FacilityLongitude
        );
        const sourceUrl = sourceUrlForFacility(facility);
        const rawPayload = toJson(facility);
        const mappedPayload = toJson(mappedPayloadForFacility(facility));
        const existing = await prisma.importCandidate.findUnique({
          where: { sourceId_entityType_externalId: { sourceId: source.id, entityType: "CAMPGROUND", externalId } },
          select: { rawPayload: true, mappedPayload: true, status: true }
        });
        const sync = analyzeImportSync(existing, rawPayload, mappedPayload);

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
            region: facility.FacilityState ?? options.state ?? null,
            sourceUrl,
            lat,
            lng,
            rawPayload,
            mappedPayload,
            ...sync
          },
          create: {
            sourceId: source.id,
            importRunId: run.id,
            entityType: "CAMPGROUND",
            externalId,
            name,
            normalizedName: normalizeName(name),
            region: facility.FacilityState ?? options.state ?? null,
            sourceUrl,
            lat,
            lng,
            rawPayload,
            mappedPayload,
            ...sync
          }
        });

        candidateCount += 1;
      }

      const currentCount = data.METADATA?.RESULTS?.CURRENT_COUNT ?? facilities.length;

      if (currentCount < options.limit || facilities.length === 0) {
        break;
      }
    }

    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        fetchedCount,
        candidateCount,
        skippedCount
      }
    });

    console.log(
      `RIDB campground import complete: fetched=${fetchedCount} candidates=${candidateCount} skipped=${skippedCount}`
    );
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
  .finally(async () => {
    await prisma.$disconnect();
  });
