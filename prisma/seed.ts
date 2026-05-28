import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const reviewedAt = new Date("2026-05-28T00:00:00.000Z");

const hubs = [
  {
    slug: "red-river-gorge",
    name: "Red River Gorge",
    region: "Kentucky",
    summary:
      "A dense sandstone sport-climbing destination with climber-friendly camping, private preserves, and varied weekend logistics around Slade.",
    seasonNotes: "Best in spring and fall; summer humidity and winter seepage can shape crag choice.",
    lat: 37.784,
    lng: -83.68,
    sourceName: "Red River Gorge Climbers' Coalition",
    sourceUrl: "https://rrgcc.org/"
  },
  {
    slug: "northeast-alabama",
    name: "Northeast Alabama",
    region: "Alabama",
    summary:
      "A compact weekend zone pairing Cherokee Rock Village camping and climbing with Little River Canyon objectives near Fort Payne.",
    seasonNotes: "Fall through spring is usually the comfortable climbing window.",
    lat: 34.33,
    lng: -85.64,
    sourceName: "Cherokee Rock Village",
    sourceUrl: "https://www.cherokeerockvillage.com/"
  },
  {
    slug: "obed-clear-creek",
    name: "Obed / Clear Creek",
    region: "Tennessee",
    summary:
      "Steep sandstone climbing around Obed Wild & Scenic River and Clear Creek, with access and camping decisions spread across several trailheads.",
    seasonNotes: "Fall and spring are prime; check NPS guidance for parking, waste, and cliff access.",
    lat: 36.105,
    lng: -84.62,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/obed/planyourvisit/rockclimbing.htm"
  },
  {
    slug: "chattanooga-south-cumberland",
    name: "Chattanooga / South Cumberland",
    region: "Tennessee",
    summary:
      "A Southeast trad and sport circuit including Tennessee Wall, Foster Falls, Denny Cove, and nearby state-park camping options.",
    seasonNotes: "Winter sun and shoulder-season temps are major planning factors.",
    lat: 35.18,
    lng: -85.45,
    sourceName: "Southeastern Climbers Coalition",
    sourceUrl: "https://www.seclimbers.org/"
  },
  {
    slug: "new-river-gorge",
    name: "New River Gorge",
    region: "West Virginia",
    summary:
      "A major Eastern sandstone destination with many private campgrounds, NPS primitive camping rules, and area-specific parking concerns.",
    seasonNotes: "NPS notes late April to mid-June and mid-September to late October are often best.",
    lat: 37.93,
    lng: -81.08,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/neri/planyourvisit/climbing.htm"
  },
  {
    slug: "north-georgia",
    name: "North Georgia",
    region: "Georgia",
    summary:
      "A smaller but useful Southeast hub for Tallulah Gorge and nearby state-park logistics where permits and closures matter.",
    seasonNotes: "Always check state park permit, release, and closure notices before planning.",
    lat: 34.74,
    lng: -83.39,
    sourceName: "Georgia State Parks",
    sourceUrl: "https://gastateparks.org/TallulahGorge"
  }
];

const areas = [
  {
    hubSlugs: ["red-river-gorge"],
    slug: "muir-valley",
    name: "Muir Valley",
    region: "Red River Gorge, Kentucky",
    summary:
      "Privately managed sport climbing preserve with dense route development, clear trail systems, and reliable beginner-to-moderate options.",
    bestFor: "Sport climbing, first RRG trips, high route density",
    approach: "Signed trails from the main lot; many walls are 10-30 minutes from parking.",
    approachMinutes: 20,
    parking: "Dedicated preserve parking; follow current preserve rules and donation guidance.",
    roadDifficulty: "Paved and maintained roads to the parking area.",
    lat: 37.7248,
    lng: -83.6349,
    sourceName: "Muir Valley",
    sourceUrl: "https://muirvalley.org/"
  },
  {
    hubSlugs: ["red-river-gorge"],
    slug: "pmrp",
    name: "Pendergrass-Murray Recreational Preserve",
    region: "Red River Gorge, Kentucky",
    summary:
      "Large RRG climbing preserve with many classic sport sectors and a wilder, more spread-out feel than the most compact destinations.",
    bestFor: "Sport climbing, bigger days, varied grades",
    approach: "Expect gravel-road access, multiple parking areas, and approaches that vary widely by wall.",
    approachMinutes: 30,
    parking: "Use signed preserve lots and check current access guidance before driving in.",
    roadDifficulty: "Gravel roads; conditions can be rough after weather.",
    lat: 37.7856,
    lng: -83.6884,
    sourceName: "Red River Gorge Climbers' Coalition",
    sourceUrl: "https://rrgcc.org/"
  },
  {
    hubSlugs: ["red-river-gorge"],
    slug: "motherlode",
    name: "The Motherlode",
    region: "Red River Gorge, Kentucky",
    summary:
      "Steep, powerful sport climbing zone known for hard classics and a concentrated set of destination walls.",
    bestFor: "Experienced sport climbers, steep endurance routes",
    approach: "Moderate approach from preserve access with steep sections and wall-specific navigation.",
    approachMinutes: 25,
    parking: "Preserve parking; limited space during peak weekends.",
    roadDifficulty: "Gravel preserve access; verify current conditions.",
    lat: 37.7892,
    lng: -83.7061,
    sourceName: "Red River Gorge Climbers' Coalition",
    sourceUrl: "https://rrgcc.org/"
  },
  {
    hubSlugs: ["red-river-gorge"],
    slug: "natural-bridge",
    name: "Natural Bridge / Roadside Corridor",
    region: "Red River Gorge, Kentucky",
    summary:
      "Convenient corridor near Slade with fast food, lodging, state park amenities, and nearby climbing access.",
    bestFor: "Short weekends, mixed groups, easy logistics",
    approach: "Approach details depend heavily on the exact crag; use current guide/source links before climbing.",
    approachMinutes: 20,
    parking: "State park and roadside access rules vary by destination.",
    roadDifficulty: "Mostly paved travel near Slade and Natural Bridge.",
    lat: 37.7779,
    lng: -83.6808,
    sourceName: "Kentucky State Parks",
    sourceUrl: "https://parks.ky.gov/slade/parks/resort/natural-bridge-state-resort-park"
  },
  {
    hubSlugs: ["northeast-alabama"],
    slug: "cherokee-rock-village",
    name: "Cherokee Rock Village",
    region: "Northeast Alabama",
    summary:
      "Sandstone boulderfield and cliff band above Weiss Lake with sport, trad, bouldering, camping, and big-view weekend-trip logistics.",
    bestFor: "Moderate sport/trad, bouldering, groups, on-site camping",
    approach: "Most climbing is a short walk from the park road, parking pullouts, and campground loops.",
    approachMinutes: 10,
    parking: "Park-managed lots and camping areas; check current day-use and camping rules before arrival.",
    roadDifficulty: "Paved county roads into the park with internal park roads and pullouts.",
    lat: 34.2066,
    lng: -85.6589,
    sourceName: "Cherokee Rock Village",
    sourceUrl: "https://www.cherokeerockvillage.com/"
  },
  {
    hubSlugs: ["northeast-alabama"],
    slug: "little-river-canyon",
    name: "Little River Canyon",
    region: "Northeast Alabama",
    summary:
      "River canyon climbing near Fort Payne with exposed sandstone routes, overlook access, and more committing terrain than Cherokee Rock Village.",
    bestFor: "Experienced climbers, canyon climbing, trad and sport objectives",
    approach:
      "Access is typically from canyon overlooks and rim trails; expect exposed terrain and verify current closures and route information.",
    approachMinutes: 25,
    parking: "Use National Preserve overlooks and designated parking areas only.",
    roadDifficulty: "Paved scenic-drive access, with wall-specific approaches from overlooks.",
    lat: 34.3946,
    lng: -85.6261,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/liri/planyourvisit/rock-climbing.htm"
  }
];

const campgrounds = [
  {
    hubSlugs: ["red-river-gorge"],
    slug: "lago-linda",
    name: "Lago Linda Hideaway",
    type: "Private campground",
    summary:
      "Climber-friendly private campground and cabin base south of the main Red River Gorge climbing corridors.",
    amenities: "Tent sites, cabins, bathhouse, community shelter, small lake",
    campingFit: "Good for weekend climbers who want simple camping near southern RRG crags.",
    reservationUrl: "https://www.lagolinda.com/",
    sourceName: "Lago Linda Hideaway",
    sourceUrl: "https://www.lagolinda.com/",
    lat: 37.7049,
    lng: -83.6501
  },
  {
    hubSlugs: ["red-river-gorge"],
    slug: "koomer-ridge",
    name: "Koomer Ridge Campground",
    type: "Forest Service campground",
    summary:
      "Established Daniel Boone National Forest campground near Slade with quick access to Natural Bridge and northern RRG logistics.",
    amenities: "Tent/RV sites, vault toilets, drinking water seasonally, trail access",
    campingFit: "Best for established campground camping and easy access to Slade services.",
    reservationUrl: "https://www.recreation.gov/camping/campgrounds/233621",
    sourceName: "Recreation.gov",
    sourceUrl: "https://www.recreation.gov/camping/campgrounds/233621",
    lat: 37.7933,
    lng: -83.6407
  },
  {
    hubSlugs: ["red-river-gorge"],
    slug: "miguel-pizza",
    name: "Miguel's Pizza Campground",
    type: "Private climber campground",
    summary:
      "Iconic climber hub in Slade with basic camping, food, gear, and social energy close to the main corridors.",
    amenities: "Tent camping, restaurant, gear shop, showers, climber community",
    campingFit: "Best for social climber trips and quick access to services.",
    reservationUrl: "https://www.miguelspizza.com/",
    sourceName: "Miguel's Pizza",
    sourceUrl: "https://www.miguelspizza.com/",
    lat: 37.7826,
    lng: -83.6995
  },
  {
    hubSlugs: ["red-river-gorge"],
    slug: "land-of-the-arches",
    name: "Land of the Arches",
    type: "Private campground",
    summary:
      "Climber-oriented camping with cabins and RV/tent options west of Slade and near southern preserve access.",
    amenities: "Tent sites, cabins, RV sites, showers, communal spaces",
    campingFit: "Good for groups that want campground amenities and access to multiple RRG sectors.",
    reservationUrl: "https://landofthearches.com/",
    sourceName: "Land of the Arches",
    sourceUrl: "https://landofthearches.com/",
    lat: 37.7364,
    lng: -83.7734
  },
  {
    hubSlugs: ["northeast-alabama"],
    slug: "cherokee-rock-village-campground",
    name: "Cherokee Rock Village Campground",
    type: "Park campground",
    summary:
      "On-site camping inside Cherokee Rock Village, making it the simplest base for climbing without a morning drive.",
    amenities: "Primitive camping, RV sites, bathhouse, park access",
    campingFit: "Best for groups and short weekends focused on Cherokee Rock Village itself.",
    reservationUrl: "https://www.cherokeerockvillage.com/",
    sourceName: "Cherokee Rock Village",
    sourceUrl: "https://www.cherokeerockvillage.com/",
    lat: 34.2063,
    lng: -85.6572
  },
  {
    hubSlugs: ["northeast-alabama"],
    slug: "desoto-state-park-campground",
    name: "DeSoto State Park Campground",
    type: "State park campground",
    summary:
      "Established state park base near Fort Payne and Mentone with campground amenities and reasonable access to Little River Canyon.",
    amenities: "Improved campsites, primitive camping, cabins, bathhouses, trails",
    campingFit: "Best for Little River Canyon trips where campground amenities matter more than sleeping at the crag.",
    reservationUrl: "https://www.alapark.com/parks/desoto-state-park",
    sourceName: "Alabama State Parks",
    sourceUrl: "https://www.alapark.com/parks/desoto-state-park",
    lat: 34.5006,
    lng: -85.6224
  }
];

const links = [
  ["muir-valley", "lago-linda", 3.8, 8, "Closest simple camping base for Muir Valley days.", 1],
  ["muir-valley", "miguel-pizza", 8.6, 16, "Better for food and social logistics; slightly longer morning drive.", 2],
  ["muir-valley", "koomer-ridge", 10.8, 20, "Established campground option closer to Slade and Natural Bridge.", 3],
  ["pmrp", "miguel-pizza", 5.7, 14, "Convenient food and climber hub before heading into preserve access.", 1],
  ["pmrp", "land-of-the-arches", 7.1, 16, "Useful group base west of Slade with campground amenities.", 2],
  ["pmrp", "lago-linda", 10.6, 22, "Quiet camping option, but expect more driving to PMRP sectors.", 3],
  ["motherlode", "miguel-pizza", 6.8, 16, "Classic climber base with quick access to food and gear.", 1],
  ["motherlode", "land-of-the-arches", 7.8, 18, "Good for groups and western access logistics.", 2],
  ["natural-bridge", "koomer-ridge", 4.4, 10, "Closest established campground for Natural Bridge and Slade logistics.", 1],
  ["natural-bridge", "miguel-pizza", 2.1, 6, "Best social base and fastest access to Slade food/gear.", 2],
  ["cherokee-rock-village", "cherokee-rock-village-campground", 0.4, 2, "On-site camping is the easiest base for Cherokee Rock Village climbing days.", 1],
  ["cherokee-rock-village", "desoto-state-park-campground", 33, 45, "More developed campground amenities, but a longer drive back to Cherokee Rock Village.", 2],
  ["little-river-canyon", "desoto-state-park-campground", 8, 16, "Established campground base near the canyon with easy access to Fort Payne and Mentone services.", 1],
  ["little-river-canyon", "cherokee-rock-village-campground", 30, 42, "Works for a combined Cherokee Rock Village and Little River Canyon weekend, but expect a morning drive.", 2]
] as const;

async function main() {
  await prisma.hubClimbingArea.deleteMany();
  await prisma.hubCampground.deleteMany();
  await prisma.areaCampgroundLink.deleteMany();
  await prisma.tripStop.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.climbingArea.deleteMany();
  await prisma.campground.deleteMany();
  await prisma.destinationHub.deleteMany();

  for (const hub of hubs) {
    await prisma.destinationHub.create({ data: hub });
  }

  for (const area of areas) {
    const { hubSlugs, ...data } = area;
    const climbingArea = await prisma.climbingArea.create({
      data: {
        ...data,
        sourceType: "curated",
        reviewStatus: "reviewed",
        lastReviewedAt: reviewedAt
      }
    });

    for (const [rank, hubSlug] of hubSlugs.entries()) {
      const hub = await prisma.destinationHub.findUniqueOrThrow({ where: { slug: hubSlug } });
      await prisma.hubClimbingArea.create({
        data: { hubId: hub.id, climbingAreaId: climbingArea.id, rank: rank + 1 }
      });
    }
  }

  for (const campground of campgrounds) {
    const { hubSlugs, ...data } = campground;
    const created = await prisma.campground.create({
      data: {
        ...data,
        sourceType: "curated",
        reviewStatus: "reviewed",
        lastReviewedAt: reviewedAt
      }
    });

    for (const [rank, hubSlug] of hubSlugs.entries()) {
      const hub = await prisma.destinationHub.findUniqueOrThrow({ where: { slug: hubSlug } });
      await prisma.hubCampground.create({
        data: { hubId: hub.id, campgroundId: created.id, rank: rank + 1 }
      });
    }
  }

  for (const [areaSlug, campgroundSlug, miles, driveMinutes, logisticsNote, rank] of links) {
    const [climbingArea, campground] = await Promise.all([
      prisma.climbingArea.findUniqueOrThrow({ where: { slug: areaSlug } }),
      prisma.campground.findUniqueOrThrow({ where: { slug: campgroundSlug } })
    ]);

    await prisma.areaCampgroundLink.create({
      data: {
        climbingAreaId: climbingArea.id,
        campgroundId: campground.id,
        miles,
        driveMinutes,
        logisticsNote,
        rank,
        sourceType: "curated",
        reviewStatus: "reviewed",
        lastReviewedAt: reviewedAt
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
