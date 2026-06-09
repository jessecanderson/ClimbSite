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
          <p className="lead">
            Curated and reviewed climbing stops with approach, parking, nearby camping context, and
            outbound source links for route and access details.
          </p>
        </div>
      </div>

      <div className="grid">
        {areas.map((area) => (
          <article className="card" key={area.id}>
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
            <div className="card-actions">
              <Link className="ghost-button" href={`/areas/${area.slug}`}>
                View area
              </Link>
              {area.sourceUrl ? (
                <a className="ghost-button" href={area.sourceUrl} target="_blank">
                  <ExternalLink size={17} />
                  Route / access source
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
