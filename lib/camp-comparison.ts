export type CampLink = {
  id: string;
  rank: number;
  driveMinutes: number;
  miles: number;
  logisticsNote: string;
  campground: {
    id: string;
    name: string;
    type: string;
    amenities: string;
    campingFit: string;
    reservationUrl: string | null;
    sourceUrl: string | null;
  };
};

export type PlanningArea = {
  id: string;
  slug: string;
  name: string;
  parentName?: string | null;
  bestFor: string;
  approachMinutes: number | null;
  roadDifficulty: string;
  parking: string;
  campgroundLinks: CampLink[];
};

export function compareCamps(areas: PlanningArea[]) {
  const grouped = new Map<string, {
    campground: CampLink["campground"];
    rank: number;
    links: Array<{ areaId: string; area: string; driveMinutes: number; miles: number; note: string }>;
    missingAreas: string[];
    totalDriveMinutes: number;
    longestDriveMinutes: number;
  }>();
  for (const area of areas) {
    for (const link of area.campgroundLinks) {
      const item = grouped.get(link.campground.id) ?? {
        campground: link.campground, rank: 0, links: [], missingAreas: [], totalDriveMinutes: 0, longestDriveMinutes: 0
      };
      if (item.links.some(existing => existing.areaId === area.id)) continue;
      item.rank += link.rank;
      item.links.push({ areaId: area.id, area: area.name, driveMinutes: link.driveMinutes, miles: link.miles, note: link.logisticsNote });
      item.totalDriveMinutes += link.driveMinutes;
      item.longestDriveMinutes = Math.max(item.longestDriveMinutes, link.driveMinutes);
      grouped.set(link.campground.id, item);
    }
  }
  for (const item of grouped.values()) {
    item.missingAreas = areas.filter(area => !item.links.some(link => link.areaId === area.id)).map(area => area.name);
  }
  return [...grouped.values()].sort((a, b) =>
    b.links.length - a.links.length ||
    a.longestDriveMinutes - b.longestDriveMinutes ||
    a.totalDriveMinutes - b.totalDriveMinutes ||
    a.rank - b.rank ||
    a.campground.name.localeCompare(b.campground.name)
  );
}
