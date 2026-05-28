import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Clock, ExternalLink, MapPin, Mountain, Tent } from "lucide-react";
import { DynamicAreaMap } from "@/components/DynamicAreaMap";
import { getHubBySlug } from "@/lib/queries";

export default async function HubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hub = await getHubBySlug(slug);

  if (!hub) {
    notFound();
  }

  const points = [
    ...hub.areas.map(({ climbingArea }) => ({
      name: climbingArea.name,
      lat: climbingArea.lat,
      lng: climbingArea.lng,
      kind: "area" as const,
      detail: climbingArea.bestFor
    })),
    ...hub.campgrounds.map(({ campground }) => ({
      name: campground.name,
      lat: campground.lat,
      lng: campground.lng,
      kind: "campground" as const,
      detail: campground.type
    }))
  ];

  return (
    <main className="page">
      <Link className="ghost-button" href="/hubs">
        <ArrowLeft size={17} />
        Hubs
      </Link>

      <section className="section two-col">
        <div>
          <p className="eyebrow">{hub.region}</p>
          <h1>{hub.name}</h1>
          <p className="lead">{hub.summary}</p>
          <div className="meta-row">
            <span className="pill">
              <BadgeCheck size={14} />
              Curated destination
            </span>
            <span className="pill">
              <Mountain size={14} />
              {hub.areas.length} climbing areas
            </span>
            <span className="pill">
              <Tent size={14} />
              {hub.campgrounds.length} camp options
            </span>
          </div>
          {hub.seasonNotes ? (
            <article className="card">
              <h3>Season Notes</h3>
              <p>{hub.seasonNotes}</p>
            </article>
          ) : null}
        </div>
        <div className="panel map-frame">
          <DynamicAreaMap points={points} />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Areas</p>
            <h2>Climbing stops in this hub</h2>
          </div>
        </div>
        <div className="grid">
          {hub.areas.map(({ climbingArea }) => (
            <Link className="card" href={`/areas/${climbingArea.slug}`} key={climbingArea.id}>
              <div className="meta-row">
                <span className="pill">
                  <BadgeCheck size={14} />
                  {climbingArea.reviewStatus === "reviewed" ? "Curated" : "Needs review"}
                </span>
                <span className="pill">
                  <Clock size={14} />
                  {climbingArea.approachMinutes ?? "Varies"} min approach
                </span>
              </div>
              <h3>{climbingArea.name}</h3>
              <p>{climbingArea.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Camping</p>
            <h2>Overnight options</h2>
          </div>
        </div>
        <div className="grid">
          {hub.campgrounds.map(({ campground }) => (
            <article className="card" key={campground.id}>
              <div className="meta-row">
                <span className="pill">
                  <Tent size={14} />
                  {campground.type}
                </span>
                <span className="pill">
                  <MapPin size={14} />
                  {campground.reviewStatus === "reviewed" ? "Curated" : "Needs review"}
                </span>
              </div>
              <h3>{campground.name}</h3>
              <p>{campground.summary}</p>
              <p>{campground.campingFit}</p>
              {campground.reservationUrl ? (
                <a className="ghost-button" href={campground.reservationUrl} target="_blank">
                  <ExternalLink size={17} />
                  Reserve / details
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
