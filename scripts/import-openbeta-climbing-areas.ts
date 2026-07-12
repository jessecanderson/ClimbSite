import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const openBetaEndpoint = "https://api.openbeta.io";
const defaultTerms = [
  "Red River Gorge",
  "Muir Valley",
  "Pendergrass-Murray",
  "Obed",
  "Clear Creek",
  "Tennessee Wall",
  "Foster Falls",
  "Denny Cove",
  "Castle Rock",
  "New River Gorge",
  "Endless Wall",
  "Kaymoor",
  "Summersville Lake",
  "Cherokee Rock Village",
  "Little River Canyon",
  "Tallulah Gorge",
  "Mount Yonah",
  "Currahee Mountain"
];

const stateNamesByCode: Record<string, string> = {
  AL: "Alabama",
  GA: "Georgia",
  KY: "Kentucky",
  TN: "Tennessee",
  WV: "West Virginia"
};

type CliOptions = {
  terms: string[];
  state?: string;
  limit: number;
  includeChildren: boolean;
};

type OpenBetaArea = {
  uuid: string;
  area_name: string;
  shortCode?: string | null;
  ancestors: string[];
  pathTokens: string[];
  totalClimbs: number;
  metadata: {
    lat?: number | null;
    lng?: number | null;
    leaf: boolean;
    isBoulder?: boolean | null;
    isDestination: boolean;
  };
  content?: {
    description?: string | null;
    areaLocation?: string | null;
  } | null;
  children?: OpenBetaChildArea[];
};

type OpenBetaChildArea = {
  uuid: string;
  area_name: string;
  shortCode?: string | null;
  ancestors: string[];
  pathTokens: string[];
  totalClimbs: number;
  metadata: {
    lat?: number | null;
    lng?: number | null;
    leaf: boolean;
    isBoulder?: boolean | null;
    isDestination: boolean;
  };
  content?: {
    description?: string | null;
    areaLocation?: string | null;
  } | null;
};

type OpenBetaResponse = {
  data?: {
    areas?: OpenBetaArea[];
  };
  errors?: Array<{ message: string }>;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    terms: defaultTerms,
    limit: 5,
    includeChildren: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--terms" && next) {
      options.terms = next.split("|").map((term) => term.trim()).filter(Boolean);
      index += 1;
    } else if (arg === "--state" && next) {
      options.state = next.toUpperCase();
      index += 1;
    } else if (arg === "--limit" && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--include-children" && next) {
      options.includeChildren = next !== "false";
      index += 1;
    }
  }

  if (options.terms.length === 0) {
    throw new Error("--terms must include at least one search term");
  }

  if (!Number.isFinite(options.limit) || options.limit < 1 || options.limit > 25) {
    throw new Error("--limit must be between 1 and 25");
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

function coordinatePair(latValue?: number | null, lngValue?: number | null) {
  if (
    latValue === null ||
    latValue === undefined ||
    lngValue === null ||
    lngValue === undefined ||
    !Number.isFinite(latValue) ||
    !Number.isFinite(lngValue) ||
    latValue < -90 ||
    latValue > 90 ||
    lngValue < -180 ||
    lngValue > 180 ||
    (latValue === 0 && lngValue === 0)
  ) {
    return { lat: null, lng: null };
  }

  return { lat: latValue, lng: lngValue };
}

function sourceUrlForArea(area: Pick<OpenBetaArea, "uuid">) {
  return `https://openbeta.io/areas/${area.uuid}`;
}

function regionForArea(area: Pick<OpenBetaArea, "pathTokens">) {
  return area.pathTokens.filter((token) => token !== "USA").join(", ") || null;
}

function matchesState(area: Pick<OpenBetaArea, "pathTokens">, state?: string) {
  if (!state) {
    return true;
  }

  const stateName = stateNamesByCode[state] ?? state;
  return area.pathTokens.some((token) => token.toLowerCase() === stateName.toLowerCase());
}

function mappedPayloadForArea(
  area: Pick<OpenBetaArea, "uuid" | "area_name" | "pathTokens" | "totalClimbs" | "metadata" | "content">,
  parentName?: string
): Prisma.InputJsonObject {
  const sourceUrl = sourceUrlForArea(area);

  return {
    sourceName: "openbeta.io",
    sourceUrl,
    summary: area.content?.description ?? "",
    bestFor: area.metadata.isBoulder ? "Bouldering area" : "Climbing area",
    approach: area.content?.areaLocation ?? "",
    parking: "Needs review from source and local access information.",
    roadDifficulty: "Needs review",
    totalClimbs: area.totalClimbs,
    pathTokens: area.pathTokens,
    parentName: parentName ?? null,
    isLeaf: area.metadata.leaf,
    isBoulder: area.metadata.isBoulder ?? false,
    isDestination: area.metadata.isDestination
  };
}

function areaCandidateRows(area: OpenBetaArea, includeChildren: boolean) {
  const rows: Array<{ area: OpenBetaArea | OpenBetaChildArea; parentName?: string }> = [{ area }];

  if (includeChildren) {
    for (const child of area.children ?? []) {
      rows.push({ area: child, parentName: area.area_name });
    }
  }

  return rows;
}

async function fetchAreas(term: string, limit: number) {
  const query = `
    query OpenBetaAreas($term: String!, $limit: Int!) {
      areas(filter: { area_name: { match: $term } }, limit: $limit) {
        uuid
        area_name
        shortCode
        ancestors
        pathTokens
        totalClimbs
        metadata {
          lat
          lng
          leaf
          isBoulder
          isDestination
        }
        content {
          description
          areaLocation
        }
        children {
          uuid
          area_name
          shortCode
          ancestors
          pathTokens
          totalClimbs
          metadata {
            lat
            lng
            leaf
            isBoulder
            isDestination
          }
          content {
            description
            areaLocation
          }
        }
      }
    }
  `;

  const response = await fetch(openBetaEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables: { term, limit }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenBeta request failed with ${response.status}: ${body.slice(0, 500)}`);
  }

  const payload = (await response.json()) as OpenBetaResponse;

  if (payload.errors?.length) {
    throw new Error(`OpenBeta GraphQL error: ${payload.errors.map((error) => error.message).join("; ")}`);
  }

  return payload.data?.areas ?? [];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = await prisma.dataSource.upsert({
    where: { key: "openbeta" },
    update: {
      name: "openbeta.io",
      baseUrl: openBetaEndpoint,
      docsUrl: "https://github.com/OpenBeta/openbeta-graphql",
      termsUrl: "https://openbeta.io/"
    },
    create: {
      key: "openbeta",
      name: "openbeta.io",
      baseUrl: openBetaEndpoint,
      docsUrl: "https://github.com/OpenBeta/openbeta-graphql",
      termsUrl: "https://openbeta.io/"
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
    for (const term of options.terms) {
      const areas = await fetchAreas(term, options.limit);
      fetchedCount += areas.length;

      for (const area of areas) {
        if (!matchesState(area, options.state)) {
          skippedCount += 1;
          continue;
        }

        for (const row of areaCandidateRows(area, options.includeChildren)) {
          const name = row.area.area_name?.trim();
          const externalId = row.area.uuid;

          if (!name || !externalId || seenExternalIds.has(externalId)) {
            skippedCount += 1;
            continue;
          }

          seenExternalIds.add(externalId);
          const { lat, lng } = coordinatePair(row.area.metadata.lat, row.area.metadata.lng);

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
              region: regionForArea(row.area),
              sourceUrl: sourceUrlForArea(row.area),
              lat,
              lng,
              rawPayload: toJson(row.area),
              mappedPayload: toJson(mappedPayloadForArea(row.area, row.parentName))
            },
            create: {
              sourceId: source.id,
              importRunId: run.id,
              entityType: "CLIMBING_AREA",
              externalId,
              name,
              normalizedName: normalizeName(name),
              region: regionForArea(row.area),
              sourceUrl: sourceUrlForArea(row.area),
              lat,
              lng,
              rawPayload: toJson(row.area),
              mappedPayload: toJson(mappedPayloadForArea(row.area, row.parentName))
            }
          });

          candidateCount += 1;
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
      `OpenBeta climbing-area import complete: fetched=${fetchedCount} candidates=${candidateCount} skipped=${skippedCount}`
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
