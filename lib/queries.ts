import type { Prisma } from "@prisma/client";
import { areaWhere, discoveryPage, AREA_PAGE_SIZE, type AreaFilters } from "./discovery";
import { prisma } from "@/lib/prisma";

export function getAreas() {
  return prisma.climbingArea.findMany({
    where: { reviewStatus: "reviewed", parentAreaId: null },
    orderBy: [{ region: "asc" }, { name: "asc" }],
    include: {
      parentArea: true,
      childAreas: {
        where: { reviewStatus: "reviewed" },
        orderBy: { name: "asc" }
      },
      hubLinks: {
        include: { hub: true },
        orderBy: { rank: "asc" }
      },
      campgroundLinks: {
        where: {
          reviewStatus: "reviewed",
          campground: { reviewStatus: "reviewed" }
        },
        orderBy: { rank: "asc" },
        include: { campground: true }
      }
    }
  });
}

// Planning supports reviewed subareas without changing the top-level discovery list.
export function getPlanningAreas() {
  return prisma.climbingArea.findMany({
    where: { reviewStatus: "reviewed" },
    orderBy: [{ region: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, region: true, summary: true,
      parentArea: { select: { name: true, reviewStatus: true } }
    }
  });
}

export function getAreaBySlug(slug: string) {
  return prisma.climbingArea.findUnique({
    where: { slug, reviewStatus: "reviewed" },
    include: {
      parentArea: true,
      childAreas: {
        where: { reviewStatus: "reviewed" },
        orderBy: { name: "asc" }
      },
      hubLinks: {
        include: { hub: true },
        orderBy: { rank: "asc" }
      },
      campgroundLinks: {
        where: {
          reviewStatus: "reviewed",
          campground: { reviewStatus: "reviewed" }
        },
        orderBy: [{ rank: "asc" }, { driveMinutes: "asc" }],
        include: { campground: true }
      }
    }
  });
}

export function getHubs() {
  return prisma.destinationHub.findMany({
    orderBy: [{ region: "asc" }, { name: "asc" }],
    include: {
      areas: { where: { climbingArea: { reviewStatus: "reviewed", parentAreaId: null } }, select: { climbingAreaId: true } },
      campgrounds: { where: { campground: { reviewStatus: "reviewed" } }, select: { campgroundId: true } }
    }
  });
}

export function getHubBySlug(slug: string) {
  return prisma.destinationHub.findUnique({
    where: { slug },
    include: {
      areas: {
        where: { climbingArea: { reviewStatus: "reviewed", parentAreaId: null } },
        orderBy: { rank: "asc" },
        include: {
          climbingArea: {
            include: {
              childAreas: {
                where: { reviewStatus: "reviewed" },
                orderBy: { name: "asc" },
                include: {
                  campgroundLinks: {
                    where: { reviewStatus: "reviewed", campground: { reviewStatus: "reviewed" } },
                    orderBy: { rank: "asc" },
                    include: { campground: true }
                  }
                }
              },
              campgroundLinks: {
                where: {
                  reviewStatus: "reviewed",
                  campground: { reviewStatus: "reviewed" }
                },
                orderBy: { rank: "asc" },
                include: { campground: true }
              }
            }
          }
        }
      },
      campgrounds: {
        where: { campground: { reviewStatus: "reviewed" } },
        orderBy: { rank: "asc" },
        include: { campground: true }
      }
    }
  });
}

export function getCampgrounds() {
  return prisma.campground.findMany({
    where: { reviewStatus: "reviewed" },
    orderBy: { name: "asc" }
  });
}

export function getTripForUser(tripId: string, userId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: {
      stops: {
        orderBy: { order: "asc" },
        include: {
          selectedCampground: true,
          climbingArea: {
            include: {
              campgroundLinks: {
                where: {
                  reviewStatus: "reviewed",
                  campground: { reviewStatus: "reviewed" }
                },
                orderBy: { rank: "asc" },
                include: { campground: true }
              }
            }
          }
        }
      }
    }
  });
}

export function getTripsForUser(userId: string) {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      stops: {
        orderBy: { order: "asc" },
        include: { climbingArea: true }
      }
    }
  });
}

export function getAreaRegions() {
  return prisma.climbingArea.findMany({ where: { reviewStatus: "reviewed", parentAreaId: null },
    distinct: ["region"], select: { region: true }, orderBy: { region: "asc" } });
}

export async function getAreaDiscovery(filters: AreaFilters) {
  const where: Prisma.ClimbingAreaWhereInput = areaWhere(filters);
  const campWhere = { reviewStatus: "reviewed", campground: { reviewStatus: "reviewed" } };
  const [total, regionRows, hubs] = await Promise.all([
    prisma.climbingArea.count({ where }), getAreaRegions(),
    prisma.destinationHub.findMany({ where: { areas: { some: { climbingArea: { reviewStatus: "reviewed", parentAreaId: null } } } },
      select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } })
  ]);
  const page = discoveryPage(filters.page, total);
  const rows = await prisma.climbingArea.findMany({ where, take: AREA_PAGE_SIZE, skip: (page - 1) * AREA_PAGE_SIZE,
    orderBy: [{ region: "asc" }, { name: "asc" }, { id: "asc" }],
    select: { id: true, slug: true, name: true, region: true, summary: true, bestFor: true,
      lat: true, lng: true, approachMinutes: true, lastReviewedAt: true,
      hubLinks: { take: 1, orderBy: { rank: "asc" }, select: { hub: { select: { name: true } } } },
      _count: { select: { campgroundLinks: { where: campWhere } } }
    }
  });
  return { total, page, pageSize: AREA_PAGE_SIZE, regions: regionRows.map(r => r.region), hubs,
    areas: rows.map(({ _count, hubLinks, lastReviewedAt, ...area }) => ({ ...area,
      campgroundCount: _count.campgroundLinks, destination: hubLinks[0]?.hub.name ?? area.region,
      lastReviewedAt: lastReviewedAt?.toISOString() ?? null })) };
}
