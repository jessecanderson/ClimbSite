import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Clock, ExternalLink, MapPin, Mountain, Route, Tent } from "lucide-react";
import { DynamicAreaMap } from "@/components/DynamicAreaMap";
import { getHubBySlug } from "@/lib/queries";
import { formatTripDate } from "@/lib/dates";

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
      detail: climbingArea.bestFor,
      href: `/areas/${climbingArea.slug}`
    })),
    ...hub.campgrounds.map(({ campground }) => ({
      name: campground.name,
      lat: campground.lat,
      lng: campground.lng,
      kind: "campground" as const,
      detail: campground.type,
      href: campground.reservationUrl ?? undefined
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
            <p className="eyebrow">Plan This Hub</p>
            <h2>Choose your climbing stops</h2>
            <p>Select one or more areas to start a trip with the itinerary already in place.</p>
          </div>
        </div>
        <form className="card hub-trip-builder" action="/trips/new" method="get">
          <input type="hidden" name="hub" value={hub.slug} />
          <div className="hub-area-options">
            {hub.areas.map(({ climbingArea }, index) => (
              <label className="hub-area-option" key={climbingArea.id}>
                <input
                  type="checkbox"
                  name="area"
                  value={climbingArea.slug}
                  defaultChecked={index === 0}
                />
                <span>
                  <strong>{climbingArea.name}</strong>
                  <small>{climbingArea.bestFor}</small>
                </span>
              </label>
            ))}
          </div>
          <button className="button" type="submit">
            <Route size={17} />
            Start a trip from this hub
          </button>
        </form>
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
            <article className="card" key={climbingArea.id}>
              <div className="meta-row">
                <span className="pill">
                  <BadgeCheck size={14} />
                  {climbingArea.reviewStatus === "reviewed" ? "Curated" : "Needs review"}
                </span>
                {climbingArea.lastReviewedAt ? (
                  <span className="pill">Reviewed {formatTripDate(climbingArea.lastReviewedAt)}</span>
                ) : null}
                <span className="pill">
                  <Clock size={14} />
                  {climbingArea.approachMinutes ?? "Varies"} min approach
                </span>
              </div>
              <h3>{climbingArea.name}</h3>
              <p>{climbingArea.summary}</p>
              <div className="card-actions">
                <Link className="ghost-button" href={`/areas/${climbingArea.slug}`}>
                  View area
                </Link>
                {climbingArea.sourceUrl ? (
                  <a className="ghost-button" href={climbingArea.sourceUrl} target="_blank">
                    <ExternalLink size={17} />
                    {climbingArea.sourceName
                      ? `${climbingArea.sourceName} details`
                      : "Route / access source"}
                  </a>
                ) : null}
              </div>
            </article>
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
                {campground.lastReviewedAt ? (
                  <span className="pill">Reviewed {formatTripDate(campground.lastReviewedAt)}</span>
                ) : null}
              </div>
              <h3>{campground.name}</h3>
              <p>{campground.summary}</p>
              <p>{campground.campingFit}</p>
              {campground.reservationUrl ? (
                <a className="ghost-button" href={campground.reservationUrl} target="_blank">
                  <ExternalLink size={17} />
                  Camping / booking details
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
