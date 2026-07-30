export type MatchCandidate = {
  entityType: "CAMPGROUND" | "CLIMBING_AREA";
  name: string;
  normalizedName: string;
  lat: number | null;
  lng: number | null;
  mappedPayload?: unknown;
};

export type MatchTarget = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export function normalizeImportName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function distanceKilometers(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) {
  const earthRadiusKm = 6371;
  const radians = Math.PI / 180;
  const latDistance = (toLat - fromLat) * radians;
  const lngDistance = (toLng - fromLng) * radians;
  const haversine =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(fromLat * radians) *
      Math.cos(toLat * radians) *
      Math.sin(lngDistance / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

export function suggestedImportTarget(candidate: MatchCandidate, targets: MatchTarget[]) {
  if (candidate.lat === null || candidate.lng === null) return null;

  const candidateName = candidate.normalizedName || normalizeImportName(candidate.name);
  const sameNameTargets = targets.filter(
    (target) => normalizeImportName(target.name) === candidateName
  );

  const maximumDistanceKm = candidate.entityType === "CLIMBING_AREA" ? 15 : 5;

  if (sameNameTargets.length === 1) {
    const target = sameNameTargets[0];
    const distanceKm = distanceKilometers(candidate.lat, candidate.lng, target.lat, target.lng);

    if (distanceKm <= maximumDistanceKm) {
      return { target, distanceKm, reason: "direct" as const };
    }
  }

  if (candidate.entityType === "CLIMBING_AREA") {
    const { parentName } = importHierarchy(candidate.mappedPayload);
    const parentTargets = parentName
      ? targets.filter((target) => normalizeImportName(target.name) === normalizeImportName(parentName))
      : [];

    if (parentTargets.length === 1) {
      const target = parentTargets[0];
      const distanceKm = distanceKilometers(candidate.lat, candidate.lng, target.lat, target.lng);

      if (distanceKm <= 25) {
        return { target, distanceKm, reason: "parent" as const };
      }
    }
  }

  return null;
}

export function importHierarchy(mappedPayload: unknown) {
  if (!mappedPayload || typeof mappedPayload !== "object" || Array.isArray(mappedPayload)) {
    return { parentName: null, pathTokens: [] as string[] };
  }

  const mapped = mappedPayload as Record<string, unknown>;
  const parentName =
    typeof mapped.parentName === "string" && mapped.parentName.trim()
      ? mapped.parentName.trim()
      : null;
  const pathTokens = Array.isArray(mapped.pathTokens)
    ? mapped.pathTokens.filter((token): token is string => typeof token === "string")
    : [];

  return { parentName, pathTokens };
}
