import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, Mountain, Tent } from "lucide-react";
import { getHubs } from "@/lib/queries";

export default async function HubsPage() {
  const hubs = await getHubs();

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Southeast Hubs</p>
          <h1>Weekend climbing destinations</h1>
          <p className="lead">
            Browse destination hubs that group climbing areas, campgrounds, access notes, and source links.
          </p>
        </div>
      </div>

      <div className="grid">
        {hubs.map((hub) => (
          <Link className="card" href={`/hubs/${hub.slug}`} key={hub.id}>
            <div className="meta-row">
              <span className="pill">
                <MapPin size={14} />
                {hub.region}
              </span>
              <span className="pill">
                <BadgeCheck size={14} />
                Curated hub
              </span>
            </div>
            <h3>{hub.name}</h3>
            <p>{hub.summary}</p>
            <div className="meta-row">
              <span className="pill">
                <Mountain size={14} />
                {hub.areas.length} areas
              </span>
              <span className="pill">
                <Tent size={14} />
                {hub.campgrounds.length} camp options
              </span>
            </div>
            <span className="ghost-button">
              Open hub
              <ArrowRight size={17} />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
