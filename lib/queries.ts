import { prisma } from "@/lib/prisma";

export function getAreas() {
  return prisma.climbingArea.findMany({
    orderBy: [{ region: "asc" }, { name: "asc" }],
    include: {
      hubLinks: {
        include: { hub: true },
        orderBy: { rank: "asc" }
      },
      campgroundLinks: {
        orderBy: { rank: "asc" },
        include: { campground: true }
      }
    }
  });
}

export function getAreaBySlug(slug: string) {
  return prisma.climbingArea.findUnique({
    where: { slug },
    include: {
      hubLinks: {
        include: { hub: true },
        orderBy: { rank: "asc" }
      },
      campgroundLinks: {
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
        orderBy: { rank: "asc" },
        include: {
          climbingArea: {
            include: {
              campgroundLinks: {
                orderBy: { rank: "asc" },
                include: { campground: true }
              }
            }
          }
        }
      },
      campgrounds: {
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
        orderBy: { rank: "asc" },
        include: {
          climbingArea: {
            include: {
              campgroundLinks: {
                orderBy: { rank: "asc" },
                include: { campground: true }
              }
            }
          }
        }
      },
      campgrounds: {
        orderBy: { rank: "asc" },
        include: { campground: true }
      }
    }
  });
}

export function getCampgrounds() {
  return prisma.campground.findMany({
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
