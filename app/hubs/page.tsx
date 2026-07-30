import Link from "next/link";
import { ArrowRight, CalendarCheck, MapPin, Mountain, Tent } from "lucide-react";
import { getHubs } from "@/lib/queries";

export default async function HubsPage() {
  const hubs = await getHubs();

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Explore the Southeast</p>
          <h1>Choose a destination.</h1>
          <p className="lead">
            Start with a region, then compare climbing stops and the camps that make the morning drive work.
          </p>
        </div>
      </div>

      <div className="destination-index-layout">
        <aside className="explore-aside"><strong>Explore</strong><p>Destinations group nearby climbing areas and curated campground relationships.</p><Link href="/areas">Browse every climbing area <ArrowRight size={15} /></Link></aside>
        <div className="destination-list">
        {hubs.map((hub, index) => (
          <article className="destination-list-card" key={hub.id}>
            <span className="destination-number">{String(index + 1).padStart(2, "0")}</span>
            <div>
            <h3>{hub.name}</h3>
            <p>{hub.summary}</p>
            {hub.seasonNotes ? <p className="season-note compact"><CalendarCheck size={15} /><span>{hub.seasonNotes}</span></p> : null}
            </div>
            <div className="destination-list-actions">
              <div className="meta-row">
                <span className="pill">
                  <MapPin size={14} />
                  {hub.region}
                </span>
                <span className="pill">
                  <Mountain size={14} />
                  {hub.areas.length} areas
                </span>
                <span className="pill">
                  <Tent size={14} />
                  {hub.campgrounds.length} camp options
                </span>
              </div>
              <Link className="button" href={`/hubs/${hub.slug}`}>
                Explore destination
                <ArrowRight size={17} />
              </Link>
            </div>
          </article>
        ))}
        </div>
      </div>
    </main>
  );
}
