import Link from "next/link";
import { BadgeCheck, Clock, ExternalLink, MapPin, Tent } from "lucide-react";
import { getAreas } from "@/lib/queries";

export default async function AreasPage() {
  const areas = await getAreas();

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Climbing Areas</p>
          <h1>Southeast climbing areas</h1>
          <p className="lead">Curated and reviewed climbing stops with approach, parking, and nearby camping context.</p>
        </div>
      </div>

      <div className="grid">
        {areas.map((area) => (
          <Link className="card" href={`/areas/${area.slug}`} key={area.id}>
            <h3>{area.name}</h3>
            <p>{area.summary}</p>
            <div className="meta-row">
              <span className="pill">
                <BadgeCheck size={14} />
                {area.reviewStatus === "reviewed" ? "Curated" : "Needs review"}
              </span>
              <span className="pill">
                <MapPin size={14} />
                {area.hubLinks[0]?.hub.name ?? area.region}
              </span>
              <span className="pill">
                <Clock size={14} />
                {area.approachMinutes ?? "Varies"} min
              </span>
              <span className="pill">
                <Tent size={14} />
                {area.campgroundLinks.length} nearby
              </span>
            </div>
            {area.sourceUrl ? (
              <span className="pill">
                <ExternalLink size={14} />
                Source link
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
