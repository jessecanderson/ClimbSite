import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, Compass, MapPin, Tent, Route } from "lucide-react";
import { DynamicAreaMap } from "@/components/DynamicAreaMap";
import { getAreas, getHubs } from "@/lib/queries";

export default async function HomePage() {
  const [areas, hubs] = await Promise.all([getAreas(), getHubs()]);
  const mapPoints = areas.flatMap((area) => [
    { name: area.name, lat: area.lat, lng: area.lng, kind: "area" as const, detail: area.bestFor, href: `/areas/${area.slug}` },
    ...area.campgroundLinks.slice(0, 1).map((link) => ({
      name: link.campground.name,
      lat: link.campground.lat,
      lng: link.campground.lng,
      kind: "campground" as const,
      detail: `${link.driveMinutes} min from ${area.name}`,
      href: link.campground.reservationUrl ?? undefined
    }))
  ]);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Southeast Climbing Trips</p>
          <h1>Plan the climb and the place you sleep.</h1>
          <p className="lead">
            Build weekend climbing road trips around crags, camping options, drive time, parking,
            and approach friction. ClimbSite links out to the right source instead of trying to own
            guidebook or booking data.
          </p>
          <div className="actions">
            <Link className="button" href="/trips/new">
              <Route size={18} />
              Start a trip
            </Link>
            <Link className="ghost-button" href="/areas">
              <MapPin size={18} />
              Browse areas
            </Link>
            <Link className="ghost-button" href="/hubs">
              <Compass size={18} />
              Browse hubs
            </Link>
          </div>
        </div>
        <div className="panel map-frame">
          <DynamicAreaMap points={mapPoints} />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Planning Layer</p>
            <h2>Climber-specific logistics</h2>
          </div>
        </div>
        <div className="grid">
          <article className="card">
            <Tent color="#2f5f4b" />
            <h3>Camping first</h3>
            <p>Compare climber-relevant camping options near each stop, with outbound links for details.</p>
          </article>
          <article className="card">
            <Clock color="#a14f35" />
            <h3>Approach and drive friction</h3>
            <p>See the practical difference between a close crag and an easy morning from camp.</p>
          </article>
          <article className="card">
            <Route color="#c28b31" />
            <h3>Guidebook links</h3>
            <p>Use ClimbSite to pair climbing areas with camp logistics, then follow source links for route details.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Destination Hubs</p>
            <h2>Curated Southeast weekends</h2>
          </div>
          <Link className="ghost-button" href="/hubs">
            View all
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="grid">
          {hubs.slice(0, 3).map((hub) => (
            <Link className="card" href={`/hubs/${hub.slug}`} key={hub.id}>
              <div className="meta-row">
                <span className="pill">
                  <BadgeCheck size={14} />
                  Curated hub
                </span>
              </div>
              <h3>{hub.name}</h3>
              <p>{hub.summary}</p>
              <div className="meta-row">
                <span className="pill">
                  <MapPin size={14} />
                  {hub.region}
                </span>
                <span className="pill">
                  <Tent size={14} />
                  {hub.campgrounds.length} camp options
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
