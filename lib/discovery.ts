export type AreaFilters = { q?: string; region?: string; hub?: string; camping?: string; approach?: string; page?: string };
export const AREA_PAGE_SIZE = 12;
export function areaWhere(filters: AreaFilters) {
  const q = filters.q?.trim().slice(0, 120);
  const reviewedCamp = { reviewStatus: "reviewed", campground: { reviewStatus: "reviewed" } };
  return {
    reviewStatus: "reviewed", parentAreaId: null,
    ...(q ? { OR: [
      ...["name", "region", "summary", "bestFor"].map(key => ({ [key]: { contains: q, mode: "insensitive" as const } })),
      { hubLinks: { some: { hub: { name: { contains: q, mode: "insensitive" as const } } } } }
    ] } : {}),
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.hub ? { hubLinks: { some: { hub: { slug: filters.hub } } } } : {}),
    ...(filters.camping === "yes" ? { campgroundLinks: { some: reviewedCamp } } : {}),
    ...(filters.approach === "short" ? { approachMinutes: { lte: 15 } } : {}),
    ...(filters.approach === "moderate" ? { approachMinutes: { gt: 15, lte: 30 } } : {}),
    ...(filters.approach === "long" ? { AND: [{ OR: [{ approachMinutes: null }, { approachMinutes: { gt: 30 } }] }] } : {})
  };
}
export function discoveryPage(value: string | undefined, total: number) {
  const parsed = Number(value);
  return Math.min(Math.max(1, Math.ceil(total / AREA_PAGE_SIZE)),
    Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1);
}
