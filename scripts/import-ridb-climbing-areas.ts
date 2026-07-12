import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const ridbBaseUrl = "https://ridb.recreation.gov/api/v1";
const defaultActivityIds = ["7", "100041", "100040", "100035"];

type CliOptions = {
  state?: string;
  activityIds: string[];
  limit: number;
  offset: number;
  maxPages: number;
};

type RidbActivity = {
  ActivityID?: string | number;
  ActivityName?: string;
  RecAreaActivityDescription?: string;
};

type RidbAddress = {
  AddressStateCode?: string;
  City?: string;
};

type RidbLink = {
  LinkType?: string;
  Title?: string;
  URL?: string;
};

type RidbRecArea = {
  RecAreaID?: string | number;
  RecAreaName?: string;
  RecAreaDescription?: string;
  RecAreaDirections?: string;
  RecAreaLatitude?: string | number | null;
  RecAreaLongitude?: string | number | null;
  RecAreaMapURL?: string;
  RecAreaReservationURL?: string;
  RecAreaPhone?: string;
  RecAreaEmail?: string;
  Keywords?: string;
  ACTIVITY?: RidbActivity[];
  LINK?: RidbLink[];
  RECAREAADDRESS?: RidbAddress[];
};

type RidbResponse = {
  RECDATA?: RidbRecArea[];
  METADATA?: {
    RESULTS?: {
      CURRENT_COUNT?: number;
      TOTAL_COUNT?: number;
    };
  };
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    activityIds: defaultActivityIds,
    limit: 50,
    offset: 0,
    maxPages: 1
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--state" && next) {
      options.state = next.toUpperCase();
      index += 1;
    } else if (arg === "--activities" && next) {
      options.activityIds = next.split(",").map((activity) => activity.trim()).filter(Boolean);
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

  if (options.activityIds.length === 0) {
    throw new Error("--activities must include at least one RIDB activity id");
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
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
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

function stateForRecArea(recArea: RidbRecArea, fallbackState?: string) {
  const states = recArea.RECAREAADDRESS?.map((address) => address.AddressStateCode)
    .filter(Boolean)
    .join(", ");

  return states || fallbackState || null;
}

function sourceUrlForRecArea(recArea: RidbRecArea) {
  const officialLink = recArea.LINK?.find((link) => link.URL && /official/i.test(link.LinkType ?? ""));

  if (officialLink?.URL) {
    return officialLink.URL;
  }

  if (recArea.RecAreaReservationURL) {
    return recArea.RecAreaReservationURL;
  }

  if (recArea.RecAreaID) {
    return `https://www.recreation.gov/recarea/${recArea.RecAreaID}`;
  }

  return null;
}

function climbingActivitiesForRecArea(recArea: RidbRecArea) {
  return (recArea.ACTIVITY ?? []).filter((activity) => /climbing/i.test(activity.ActivityName ?? ""));
}

function mappedPayloadForRecArea(recArea: RidbRecArea): Prisma.InputJsonObject {
  const sourceUrl = sourceUrlForRecArea(recArea);
  const activities = climbingActivitiesForRecArea(recArea);

  return {
    sourceName: "ridb.recreation.gov",
    sourceUrl,
    summary: recArea.RecAreaDescription ?? "",
    bestFor: activities.map((activity) => activity.ActivityName).filter(Boolean).join(", ") || "Climbing",
    approach: recArea.RecAreaDirections ?? "",
    parking: "Needs review from source and local access information.",
    roadDifficulty: "Needs review",
    activities: activities.map((activity) => ({
      id: activity.ActivityID,
      name: activity.ActivityName,
      description: activity.RecAreaActivityDescription ?? ""
    })),
    phone: recArea.RecAreaPhone ?? null,
    email: recArea.RecAreaEmail ?? null,
    mapUrl: recArea.RecAreaMapURL ?? null,
    addresses: recArea.RECAREAADDRESS ?? []
  };
}

async function fetchRecAreas(options: CliOptions, activityId: string, offset: number, apiKey: string) {
  const url = new URL(`${ridbBaseUrl}/recareas`);
  url.searchParams.set("activity", activityId);
  url.searchParams.set("limit", String(options.limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("full", "true");

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
      entityType: "CLIMBING_AREA",
      params: toJson(options)
    }
  });

  let fetchedCount = 0;
  let candidateCount = 0;
  let skippedCount = 0;
  const seenExternalIds = new Set<string>();

  try {
    for (const activityId of options.activityIds) {
      for (let page = 0; page < options.maxPages; page += 1) {
        const offset = options.offset + page * options.limit;
        const data = await fetchRecAreas(options, activityId, offset, apiKey);
        const recAreas = data.RECDATA ?? [];

        fetchedCount += recAreas.length;

        for (const recArea of recAreas) {
          const externalId = recArea.RecAreaID ? String(recArea.RecAreaID) : null;
          const name = recArea.RecAreaName?.trim();

          if (!externalId || !name || seenExternalIds.has(externalId)) {
            skippedCount += 1;
            continue;
          }

          seenExternalIds.add(externalId);

          const { lat, lng } = coordinatePair(
            recArea.RecAreaLatitude,
            recArea.RecAreaLongitude
          );
          const sourceUrl = sourceUrlForRecArea(recArea);

          await prisma.importCandidate.upsert({
            where: {
              sourceId_entityType_externalId: {
                sourceId: source.id,
                entityType: "CLIMBING_AREA",
                externalId
              }
            },
            update: {
              importRunId: run.id,
              name,
              normalizedName: normalizeName(name),
              region: stateForRecArea(recArea, options.state),
              sourceUrl,
              lat,
              lng,
              rawPayload: toJson(recArea),
              mappedPayload: toJson(mappedPayloadForRecArea(recArea))
            },
            create: {
              sourceId: source.id,
              importRunId: run.id,
              entityType: "CLIMBING_AREA",
              externalId,
              name,
              normalizedName: normalizeName(name),
              region: stateForRecArea(recArea, options.state),
              sourceUrl,
              lat,
              lng,
              rawPayload: toJson(recArea),
              mappedPayload: toJson(mappedPayloadForRecArea(recArea))
            }
          });

          candidateCount += 1;
        }

        const currentCount = data.METADATA?.RESULTS?.CURRENT_COUNT ?? recAreas.length;

        if (currentCount < options.limit || recAreas.length === 0) {
          break;
        }
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
      `RIDB climbing-area import complete: fetched=${fetchedCount} candidates=${candidateCount} skipped=${skippedCount}`
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
