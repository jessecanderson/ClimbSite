import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const reviewedAt = new Date("2026-06-05T00:00:00.000Z");

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
      "A Southeast trad and sport circuit including Tennessee Wall, Foster Falls, Denny Cove, Castle Rock, and nearby state-park camping options.",
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
    slug: "north-georgia",
    name: "North Georgia",
    region: "Georgia",
    summary:
      "A smaller but useful Southeast hub for Tallulah Gorge, Mount Yonah, Currahee, and nearby state-park logistics where permits and closures matter.",
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
    hubSlugs: ["obed-clear-creek"],
    slug: "lilly-bluff",
    name: "Lilly Bluff",
    region: "Obed / Clear Creek, Tennessee",
    summary:
      "NPS-managed Obed climbing zone with steep sandstone, overlooks, and a developed access point near Wartburg.",
    bestFor: "Sport climbing, steep sandstone, first Obed visit",
    approach: "Use the Lilly Bluff access and signed trails; most approaches are moderate but cliff-edge terrain demands care.",
    approachMinutes: 20,
    parking: "NPS parking at Lilly Bluff; respect closures and capacity on peak weekends.",
    roadDifficulty: "Paved roads to the access area.",
    lat: 36.1033,
    lng: -84.6766,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/obed/planyourvisit/rockclimbing.htm"
  },
  {
    hubSlugs: ["obed-clear-creek"],
    slug: "south-clear-creek",
    name: "South Clear Creek",
    region: "Obed / Clear Creek, Tennessee",
    summary:
      "Clear Creek climbing corridor with varied sandstone walls, smaller parking areas, and crag-specific access decisions.",
    bestFor: "Sport climbing, quieter days, varied grades",
    approach: "Approaches vary by wall and access point; use current NPS and local access information before committing.",
    approachMinutes: 25,
    parking: "Use designated pullouts and trailheads only; do not block roads or private drives.",
    roadDifficulty: "Mostly paved county roads with small pullouts.",
    lat: 36.091,
    lng: -84.659,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/obed/planyourvisit/rockclimbing.htm"
  },
  {
    hubSlugs: ["obed-clear-creek"],
    slug: "obed-wartburg-boulders",
    name: "Wartburg / Obed Boulders",
    region: "Obed / Clear Creek, Tennessee",
    summary:
      "Bouldering and short-objective access around the Obed corridor, useful for mixed-weather or shorter-session trip planning.",
    bestFor: "Bouldering, short sessions, rest-day options",
    approach: "Access is location-specific; verify public access and land management rules before visiting.",
    approachMinutes: 15,
    parking: "Use legal parking only and avoid blocking rural roads.",
    roadDifficulty: "Paved and gravel rural roads depending on objective.",
    lat: 36.104,
    lng: -84.593,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/obed/planyourvisit/rockclimbing.htm"
  },
  {
    hubSlugs: ["chattanooga-south-cumberland"],
    slug: "tennessee-wall",
    name: "Tennessee Wall",
    region: "Chattanooga, Tennessee",
    summary:
      "Classic south-facing sandstone trad cliff along the Tennessee River, especially popular in cooler months.",
    bestFor: "Traditional climbing, winter sun, experienced parties",
    approach: "A short but uphill trail leads from the parking area to the cliffline.",
    approachMinutes: 20,
    parking: "Use the designated lot and follow current access rules for the Prentice Cooper area.",
    roadDifficulty: "Paved and gravel roads depending on approach route and seasonal gates.",
    lat: 35.114,
    lng: -85.418,
    sourceName: "Southeastern Climbers Coalition",
    sourceUrl: "https://www.seclimbers.org/"
  },
  {
    hubSlugs: ["chattanooga-south-cumberland"],
    slug: "foster-falls",
    name: "Foster Falls",
    region: "South Cumberland, Tennessee",
    summary:
      "State-park sport climbing area with a waterfall setting, developed trail access, and campground logistics nearby.",
    bestFor: "Sport climbing, mixed groups, state-park camping",
    approach: "Descend from the park area to the base trail, then walk along the cliffline to selected walls.",
    approachMinutes: 20,
    parking: "Use South Cumberland State Park parking and follow posted access rules.",
    roadDifficulty: "Paved roads to the park access.",
    lat: 35.1824,
    lng: -85.6736,
    sourceName: "Tennessee State Parks",
    sourceUrl: "https://tnstateparks.com/parks/south-cumberland"
  },
  {
    hubSlugs: ["chattanooga-south-cumberland"],
    slug: "denny-cove",
    name: "Denny Cove",
    region: "South Cumberland, Tennessee",
    summary:
      "Access Fund and state-managed climbing area with steep sandstone sport climbing and a purpose-built access trail.",
    bestFor: "Sport climbing, steep routes, newer destination walls",
    approach: "Follow the maintained trail system from the parking area to the cliffline.",
    approachMinutes: 25,
    parking: "Use the signed Denny Cove parking area; avoid overflow impacts on local roads.",
    roadDifficulty: "Paved rural roads to the access area.",
    lat: 35.096,
    lng: -85.79,
    sourceName: "Access Fund",
    sourceUrl: "https://www.accessfund.org/"
  },
  {
    hubSlugs: ["chattanooga-south-cumberland"],
    slug: "castle-rock",
    name: "Castle Rock",
    region: "Chattanooga, Tennessee",
    summary:
      "Chattanooga-area sandstone climbing preserve with quick urban access and a compact set of sport and trad options.",
    bestFor: "Short sessions, local Chattanooga days, mixed sport/trad",
    approach: "Short trail access from preserve parking; check current preserve rules before visiting.",
    approachMinutes: 10,
    parking: "Use designated preserve parking only.",
    roadDifficulty: "Paved city and neighborhood roads.",
    lat: 35.038,
    lng: -85.361,
    sourceName: "Southeastern Climbers Coalition",
    sourceUrl: "https://www.seclimbers.org/"
  },
  {
    hubSlugs: ["new-river-gorge"],
    slug: "endless-wall",
    name: "Endless Wall",
    region: "New River Gorge, West Virginia",
    summary:
      "Classic New River Gorge cliffline with major trad and sport routes, rim trails, and high weekend demand.",
    bestFor: "Trad and sport climbing, classic NRG routes, experienced groups",
    approach: "Use the Endless Wall trailheads and established approaches; cliff-top terrain is exposed.",
    approachMinutes: 25,
    parking: "NPS trailhead parking is limited; arrive early and use legal overflow only.",
    roadDifficulty: "Paved roads to trailheads.",
    lat: 38.0505,
    lng: -81.061,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/neri/planyourvisit/climbing.htm"
  },
  {
    hubSlugs: ["new-river-gorge"],
    slug: "kaymoor",
    name: "Kaymoor",
    region: "New River Gorge, West Virginia",
    summary:
      "Large New River Gorge climbing area with long approaches, many route options, and logistics that reward early planning.",
    bestFor: "Big days, varied grades, experienced parties",
    approach: "Descend established trails and stairs toward the cliffline; expect a substantial hike out.",
    approachMinutes: 35,
    parking: "Use NPS Kaymoor-area trailhead parking and respect capacity.",
    roadDifficulty: "Paved roads to trailhead areas.",
    lat: 38.022,
    lng: -81.061,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/neri/planyourvisit/climbing.htm"
  },
  {
    hubSlugs: ["new-river-gorge"],
    slug: "summersville-lake",
    name: "Summersville Lake",
    region: "New River Gorge, West Virginia",
    summary:
      "Lake-edge sport climbing destination north of the main gorge, with seasonal water and access considerations.",
    bestFor: "Sport climbing, summer lake days, combined NRG trips",
    approach: "Approaches vary with lake levels and selected walls; verify current access before driving north.",
    approachMinutes: 20,
    parking: "Use designated recreation-area parking and respect seasonal restrictions.",
    roadDifficulty: "Paved roads near Summersville with local access roads.",
    lat: 38.226,
    lng: -80.89,
    sourceName: "U.S. Army Corps of Engineers",
    sourceUrl: "https://www.lrh.usace.army.mil/Missions/Recreation/Summersville-Lake/"
  },
  {
    hubSlugs: ["new-river-gorge"],
    slug: "bridge-buttress",
    name: "Bridge Buttress",
    region: "New River Gorge, West Virginia",
    summary:
      "Convenient climbing area near the New River Gorge Bridge with quick access and classic route options.",
    bestFor: "Short sessions, first-day objectives, quick access",
    approach: "Short approaches from nearby parking and bridge-area access points.",
    approachMinutes: 15,
    parking: "Use NPS-approved parking and avoid blocking bridge-area traffic.",
    roadDifficulty: "Paved roads to bridge-area access.",
    lat: 38.068,
    lng: -81.082,
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/neri/planyourvisit/climbing.htm"
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
  },
  {
    hubSlugs: ["north-georgia"],
    slug: "tallulah-gorge",
    name: "Tallulah Gorge",
    region: "North Georgia",
    summary:
      "Permit-driven quartzite gorge climbing with seasonal restrictions, dam-release considerations, and committing access.",
    bestFor: "Experienced trad climbers, permit-aware trips, adventure days",
    approach: "Follow state park permit and access instructions; gorge access is steep and highly regulated.",
    approachMinutes: 35,
    parking: "Use Tallulah Gorge State Park parking and secure required permits before entering the gorge.",
    roadDifficulty: "Paved state park access.",
    lat: 34.739,
    lng: -83.395,
    sourceName: "Georgia State Parks",
    sourceUrl: "https://gastateparks.org/TallulahGorge"
  },
  {
    hubSlugs: ["north-georgia"],
    slug: "mount-yonah",
    name: "Mount Yonah",
    region: "North Georgia",
    summary:
      "Granite and gneiss climbing near Cleveland, Georgia, with a strenuous approach and popular camping nearby.",
    bestFor: "Trad climbing, multipitch practice, training days",
    approach: "Hike the Mount Yonah trail to the cliff access; expect a sustained uphill approach.",
    approachMinutes: 55,
    parking: "Use the signed trailhead parking and expect weekend crowding.",
    roadDifficulty: "Paved and gravel road access near the trailhead.",
    lat: 34.637,
    lng: -83.724,
    sourceName: "U.S. Forest Service",
    sourceUrl: "https://www.fs.usda.gov/conf"
  },
  {
    hubSlugs: ["north-georgia"],
    slug: "currahee-mountain",
    name: "Currahee Mountain",
    region: "North Georgia",
    summary:
      "North Georgia granite slab and face climbing area near Toccoa, useful for day trips and shoulder-season mileage.",
    bestFor: "Slab climbing, moderate trad, day trips",
    approach: "Approach from the mountain road and established access trails; route access varies by sector.",
    approachMinutes: 20,
    parking: "Use legal roadside and recreation access parking without blocking the road.",
    roadDifficulty: "Gravel mountain road; conditions vary after rain.",
    lat: 34.52,
    lng: -83.373,
    sourceName: "U.S. Forest Service",
    sourceUrl: "https://www.fs.usda.gov/conf"
  }
];

const campgrounds = [
  {
    hubSlugs: ["red-river-gorge"],
    slug: "lago-linda",
    name: "Lago Linda Hideaway",
    type: "Private campground",
    summary: "Climber-friendly private campground and cabin base south of the main Red River Gorge climbing corridors.",
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
    summary: "Established Daniel Boone National Forest campground near Slade with quick access to Natural Bridge and northern RRG logistics.",
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
    summary: "Iconic climber hub in Slade with basic camping, food, gear, and social energy close to the main corridors.",
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
    summary: "Climber-oriented camping with cabins and RV/tent options west of Slade and near southern preserve access.",
    amenities: "Tent sites, cabins, RV sites, showers, communal spaces",
    campingFit: "Good for groups that want campground amenities and access to multiple RRG sectors.",
    reservationUrl: "https://landofthearches.com/",
    sourceName: "Land of the Arches",
    sourceUrl: "https://landofthearches.com/",
    lat: 37.7364,
    lng: -83.7734
  },
  {
    hubSlugs: ["obed-clear-creek"],
    slug: "obed-rock-creek-campground",
    name: "Rock Creek Campground",
    type: "NPS campground",
    summary: "Primitive NPS campground for Obed Wild & Scenic River trips near Wartburg and Lilly Bluff access.",
    amenities: "Primitive campsites, picnic tables, fire rings, vault toilets",
    campingFit: "Best official campground base for simple Obed climbing weekends.",
    reservationUrl: "https://www.nps.gov/obed/planyourvisit/camping.htm",
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/obed/planyourvisit/camping.htm",
    lat: 36.107,
    lng: -84.604
  },
  {
    hubSlugs: ["obed-clear-creek"],
    slug: "frozen-head-state-park-campground",
    name: "Frozen Head State Park Campground",
    type: "State park campground",
    summary: "Developed state park campground near Wartburg with trail access and more amenities than primitive Obed camping.",
    amenities: "Campsites, bathhouse, trails, picnic areas",
    campingFit: "Good for Obed trips where campground amenities matter.",
    reservationUrl: "https://tnstateparks.com/parks/frozen-head",
    sourceName: "Tennessee State Parks",
    sourceUrl: "https://tnstateparks.com/parks/frozen-head",
    lat: 36.125,
    lng: -84.505
  },
  {
    hubSlugs: ["obed-clear-creek"],
    slug: "lilly-pad-campground",
    name: "Lilly Pad Campground",
    type: "Private climber campground",
    summary: "Private climber-oriented camping and community base near the Obed and Clear Creek climbing areas.",
    amenities: "Tent camping, communal spaces, climber-focused logistics",
    campingFit: "Best for climbers who want a social base close to Obed access.",
    reservationUrl: "https://www.lillypadcampground.com/",
    sourceName: "Lilly Pad Campground",
    sourceUrl: "https://www.lillypadcampground.com/",
    lat: 36.091,
    lng: -84.633
  },
  {
    hubSlugs: ["chattanooga-south-cumberland"],
    slug: "foster-falls-campground",
    name: "Foster Falls Campground",
    type: "State park campground",
    summary: "South Cumberland State Park campground at the Foster Falls access point.",
    amenities: "Tent sites, bathhouse or restroom access seasonally, trail access",
    campingFit: "Simplest base for Foster Falls climbing days.",
    reservationUrl: "https://tnstateparks.com/parks/south-cumberland",
    sourceName: "Tennessee State Parks",
    sourceUrl: "https://tnstateparks.com/parks/south-cumberland",
    lat: 35.1805,
    lng: -85.673
  },
  {
    hubSlugs: ["chattanooga-south-cumberland"],
    slug: "raccoon-mountain-campground",
    name: "Raccoon Mountain Campground",
    type: "Private campground",
    summary: "Private Chattanooga campground with RV, cabin, and tent options near the west side of town.",
    amenities: "Tent sites, RV sites, cabins, bathhouse, pool seasonally",
    campingFit: "Good for Chattanooga trips mixing Tennessee Wall, Castle Rock, and city logistics.",
    reservationUrl: "https://raccoonmountain.com/",
    sourceName: "Raccoon Mountain",
    sourceUrl: "https://raccoonmountain.com/",
    lat: 35.0206,
    lng: -85.4074
  },
  {
    hubSlugs: ["chattanooga-south-cumberland"],
    slug: "cloudland-canyon-state-park-campground",
    name: "Cloudland Canyon State Park Campground",
    type: "State park campground",
    summary: "Georgia state park campground west of Chattanooga with developed sites and cabin options.",
    amenities: "Tent/RV sites, cottages, bathhouses, trails",
    campingFit: "Useful developed base for Chattanooga-area climbing when state-park amenities are preferred.",
    reservationUrl: "https://gastateparks.org/CloudlandCanyon",
    sourceName: "Georgia State Parks",
    sourceUrl: "https://gastateparks.org/CloudlandCanyon",
    lat: 34.8404,
    lng: -85.4822
  },
  {
    hubSlugs: ["new-river-gorge"],
    slug: "aac-new-river-gorge-campground",
    name: "American Alpine Club Campground",
    type: "Private climber campground",
    summary: "Climber-focused campground near Fayetteville built around New River Gorge trip logistics.",
    amenities: "Tent sites, bathhouse, communal pavilion, climber community",
    campingFit: "Best default base for many NRG climbing trips.",
    reservationUrl: "https://americanalpineclub.org/new-river-gorge-campground",
    sourceName: "American Alpine Club",
    sourceUrl: "https://americanalpineclub.org/new-river-gorge-campground",
    lat: 38.042,
    lng: -81.106
  },
  {
    hubSlugs: ["new-river-gorge"],
    slug: "rifrafters-campground",
    name: "Rifrafters Campground",
    type: "Private campground",
    summary: "Private campground near Fayetteville with cabins, RV, and tent options for New River Gorge trips.",
    amenities: "Tent sites, RV sites, cabins, bathhouse",
    campingFit: "Good for climbers who want private campground amenities close to Fayetteville.",
    reservationUrl: "https://rifrafters.com/",
    sourceName: "Rifrafters Campground",
    sourceUrl: "https://rifrafters.com/",
    lat: 38.018,
    lng: -81.099
  },
  {
    hubSlugs: ["new-river-gorge"],
    slug: "army-camp-campground",
    name: "Army Camp Campground",
    type: "NPS primitive campground",
    summary: "Primitive NPS camping option in New River Gorge National Park and Preserve.",
    amenities: "Primitive sites, limited facilities, no hookups",
    campingFit: "Useful low-frills public camping option for NRG trips.",
    reservationUrl: "https://www.nps.gov/neri/planyourvisit/camping.htm",
    sourceName: "National Park Service",
    sourceUrl: "https://www.nps.gov/neri/planyourvisit/camping.htm",
    lat: 37.997,
    lng: -81.09
  },
  {
    hubSlugs: ["new-river-gorge"],
    slug: "battle-run-campground",
    name: "Battle Run Campground",
    type: "Corps of Engineers campground",
    summary: "Developed campground at Summersville Lake, useful for lake climbing and NRG trips north of Fayetteville.",
    amenities: "Reservable sites, lake access, bathhouse, developed campground facilities",
    campingFit: "Best for Summersville Lake climbing days and lake-focused trips.",
    reservationUrl: "https://www.recreation.gov/camping/campgrounds/232677",
    sourceName: "Recreation.gov",
    sourceUrl: "https://www.recreation.gov/camping/campgrounds/232677",
    lat: 38.222,
    lng: -80.912
  },
  {
    hubSlugs: ["northeast-alabama"],
    slug: "cherokee-rock-village-campground",
    name: "Cherokee Rock Village Campground",
    type: "Park campground",
    summary: "On-site camping inside Cherokee Rock Village, making it the simplest base for climbing without a morning drive.",
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
    summary: "Established state park base near Fort Payne and Mentone with campground amenities and reasonable access to Little River Canyon.",
    amenities: "Improved campsites, primitive camping, cabins, bathhouses, trails",
    campingFit: "Best for Little River Canyon trips where campground amenities matter more than sleeping at the crag.",
    reservationUrl: "https://www.alapark.com/parks/desoto-state-park",
    sourceName: "Alabama State Parks",
    sourceUrl: "https://www.alapark.com/parks/desoto-state-park",
    lat: 34.5006,
    lng: -85.6224
  },
  {
    hubSlugs: ["north-georgia"],
    slug: "tallulah-gorge-state-park-campground",
    name: "Tallulah Gorge State Park Campground",
    type: "State park campground",
    summary: "State park campground at Tallulah Gorge with immediate access to gorge permit logistics and park facilities.",
    amenities: "Tent/RV sites, bathhouses, trails, visitor center nearby",
    campingFit: "Best base for Tallulah Gorge permit days and park-focused trips.",
    reservationUrl: "https://gastateparks.org/TallulahGorge",
    sourceName: "Georgia State Parks",
    sourceUrl: "https://gastateparks.org/TallulahGorge",
    lat: 34.739,
    lng: -83.395
  },
  {
    hubSlugs: ["north-georgia"],
    slug: "yonah-mountain-campground",
    name: "Yonah Mountain Campground",
    type: "Private campground",
    summary: "Private campground near Cleveland and Mount Yonah with tent, RV, and cabin options.",
    amenities: "Tent sites, RV sites, cabins, bathhouse",
    campingFit: "Convenient base for Mount Yonah weekends and North Georgia day trips.",
    reservationUrl: "https://yonahcampground.com/",
    sourceName: "Yonah Mountain Campground",
    sourceUrl: "https://yonahcampground.com/",
    lat: 34.635,
    lng: -83.742
  },
  {
    hubSlugs: ["north-georgia"],
    slug: "tugaloo-state-park-campground",
    name: "Tugaloo State Park Campground",
    type: "State park campground",
    summary: "Lake Hartwell state park campground useful for Currahee and northeast Georgia trips.",
    amenities: "Tent/RV sites, cottages, lake access, bathhouses",
    campingFit: "Good developed campground option for Currahee Mountain and North Georgia exploring.",
    reservationUrl: "https://gastateparks.org/Tugaloo",
    sourceName: "Georgia State Parks",
    sourceUrl: "https://gastateparks.org/Tugaloo",
    lat: 34.499,
    lng: -83.077
  },
  {
    hubSlugs: ["north-georgia"],
    slug: "black-rock-mountain-state-park-campground",
    name: "Black Rock Mountain State Park Campground",
    type: "State park campground",
    summary: "High-elevation state park campground in northeast Georgia for broader Tallulah and mountain-trip logistics.",
    amenities: "Tent/RV sites, cottages, trails, bathhouses",
    campingFit: "Scenic developed option for North Georgia trips where driving between areas is acceptable.",
    reservationUrl: "https://gastateparks.org/BlackRockMountain",
    sourceName: "Georgia State Parks",
    sourceUrl: "https://gastateparks.org/BlackRockMountain",
    lat: 34.906,
    lng: -83.409
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
  ["lilly-bluff", "obed-rock-creek-campground", 8, 15, "Official primitive campground option for Obed trips.", 1],
  ["lilly-bluff", "lilly-pad-campground", 3, 7, "Closest climber-oriented private camping near Lilly Bluff.", 2],
  ["lilly-bluff", "frozen-head-state-park-campground", 15, 25, "More developed state park amenities near Wartburg.", 3],
  ["south-clear-creek", "lilly-pad-campground", 4, 9, "Convenient private camping for Clear Creek climbing days.", 1],
  ["south-clear-creek", "obed-rock-creek-campground", 9, 18, "Simple public camping within the broader Obed corridor.", 2],
  ["obed-wartburg-boulders", "lilly-pad-campground", 5, 10, "Social climber base for short bouldering or mixed-weather sessions.", 1],
  ["obed-wartburg-boulders", "frozen-head-state-park-campground", 12, 22, "Developed park base with more campground structure.", 2],
  ["tennessee-wall", "raccoon-mountain-campground", 12, 22, "Good west-Chattanooga base for Tennessee Wall and city services.", 1],
  ["tennessee-wall", "cloudland-canyon-state-park-campground", 34, 48, "Developed state park option if combining Chattanooga with northwest Georgia.", 2],
  ["foster-falls", "foster-falls-campground", 0.5, 2, "On-site campground is the simplest base for Foster Falls days.", 1],
  ["foster-falls", "raccoon-mountain-campground", 36, 45, "Works for a Chattanooga-based trip with a longer drive to Foster Falls.", 2],
  ["denny-cove", "foster-falls-campground", 11, 18, "Closest developed state park camping for Denny Cove weekends.", 1],
  ["denny-cove", "cloudland-canyon-state-park-campground", 38, 55, "Useful for broader South Cumberland and northwest Georgia trips.", 2],
  ["castle-rock", "raccoon-mountain-campground", 10, 20, "Convenient private campground near Chattanooga services.", 1],
  ["castle-rock", "cloudland-canyon-state-park-campground", 25, 40, "Developed state park camping within reach of Chattanooga climbing.", 2],
  ["endless-wall", "aac-new-river-gorge-campground", 7, 14, "Climber-focused campground near Fayetteville with fast access to classic NRG areas.", 1],
  ["endless-wall", "rifrafters-campground", 10, 18, "Private campground option with cabins and RV/tent amenities.", 2],
  ["endless-wall", "army-camp-campground", 12, 22, "Primitive NPS camping for lower-cost public-land logistics.", 3],
  ["kaymoor", "aac-new-river-gorge-campground", 6, 14, "Good climber base for substantial Kaymoor days.", 1],
  ["kaymoor", "rifrafters-campground", 8, 16, "Private campground amenities after longer approach days.", 2],
  ["bridge-buttress", "aac-new-river-gorge-campground", 5, 12, "Quick access to bridge-area climbing and Fayetteville services.", 1],
  ["bridge-buttress", "rifrafters-campground", 8, 15, "Good private campground option for short-session NRG trips.", 2],
  ["summersville-lake", "battle-run-campground", 3, 8, "Best developed campground for lake climbing days.", 1],
  ["summersville-lake", "aac-new-river-gorge-campground", 25, 35, "Works for trips combining Summersville and Fayetteville-area climbing.", 2],
  ["cherokee-rock-village", "cherokee-rock-village-campground", 0.4, 2, "On-site camping is the easiest base for Cherokee Rock Village climbing days.", 1],
  ["cherokee-rock-village", "desoto-state-park-campground", 33, 45, "More developed campground amenities, but a longer drive back to Cherokee Rock Village.", 2],
  ["little-river-canyon", "desoto-state-park-campground", 8, 16, "Established campground base near the canyon with easy access to Fort Payne and Mentone services.", 1],
  ["little-river-canyon", "cherokee-rock-village-campground", 30, 42, "Works for a combined Cherokee Rock Village and Little River Canyon weekend, but expect a morning drive.", 2],
  ["tallulah-gorge", "tallulah-gorge-state-park-campground", 0.5, 2, "Best base for permit logistics and state park access.", 1],
  ["tallulah-gorge", "black-rock-mountain-state-park-campground", 20, 32, "Scenic developed campground if Tallulah sites are unavailable.", 2],
  ["mount-yonah", "yonah-mountain-campground", 5, 10, "Closest private campground base for Mount Yonah weekends.", 1],
  ["mount-yonah", "tallulah-gorge-state-park-campground", 35, 50, "Works for a North Georgia trip combining Yonah and Tallulah.", 2],
  ["currahee-mountain", "tugaloo-state-park-campground", 18, 28, "Developed lake campground option near Currahee and Toccoa.", 1],
  ["currahee-mountain", "yonah-mountain-campground", 34, 45, "Useful if combining Currahee with Mount Yonah objectives.", 2]
] as const;

async function main() {
  await prisma.areaCampgroundLink.deleteMany();
  await prisma.hubClimbingArea.deleteMany();
  await prisma.hubCampground.deleteMany();

  for (const hub of hubs) {
    await prisma.destinationHub.upsert({
      where: { slug: hub.slug },
      update: hub,
      create: hub
    });
  }

  for (const area of areas) {
    const { hubSlugs, ...data } = area;
    const climbingArea = await prisma.climbingArea.upsert({
      where: { slug: data.slug },
      update: {
        ...data,
        sourceType: "curated",
        reviewStatus: "reviewed",
        lastReviewedAt: reviewedAt
      },
      create: {
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
    const created = await prisma.campground.upsert({
      where: { slug: data.slug },
      update: {
        ...data,
        sourceType: "curated",
        reviewStatus: "reviewed",
        lastReviewedAt: reviewedAt
      },
      create: {
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
