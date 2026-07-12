import { prisma } from "@/lib/prisma";

export function getAreas() {
  return prisma.climbingArea.findMany({
    where: { reviewStatus: "reviewed" },
    orderBy: [{ region: "asc" }, { name: "asc" }],
    include: {
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

export function getAreaBySlug(slug: string) {
  return prisma.climbingArea.findUnique({
    where: { slug, reviewStatus: "reviewed" },
    include: {
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
      areas: {
        where: { climbingArea: { reviewStatus: "reviewed" } },
        orderBy: { rank: "asc" },
        include: {
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
      },
      campgrounds: {
        where: { campground: { reviewStatus: "reviewed" } },
        orderBy: { rank: "asc" },
        include: { campground: true }
      }
    }
  });
}

export function getHubBySlug(slug: string) {
  return prisma.destinationHub.findUnique({
    where: { slug },
    include: {
      areas: {
        where: { climbingArea: { reviewStatus: "reviewed" } },
        orderBy: { rank: "asc" },
        include: {
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
