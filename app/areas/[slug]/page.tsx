import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Clock, ExternalLink, MapPin, Route, Tent } from "lucide-react";
import { DynamicAreaMap } from "@/components/DynamicAreaMap";
import { getAreaBySlug } from "@/lib/queries";
import { formatTripDate } from "@/lib/dates";

export default async function AreaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = await getAreaBySlug(slug);

  if (!area) {
    notFound();
  }

  const points = [
    { name: area.name, lat: area.lat, lng: area.lng, kind: "area" as const, detail: area.bestFor, href: `/areas/${area.slug}` },
    ...area.campgroundLinks.map((link) => ({
      name: link.campground.name,
      lat: link.campground.lat,
      lng: link.campground.lng,
      kind: "campground" as const,
      detail: `${link.driveMinutes} min drive, ${link.miles} mi`,
      href: link.campground.reservationUrl ?? undefined
    }))
  ];

  return (
    <main className="page">
      <Link className="ghost-button" href="/areas">
        <ArrowLeft size={17} />
        Areas
      </Link>

      <section className="section two-col">
        <div>
          <p className="eyebrow">{area.region}</p>
          <h1>{area.name}</h1>
          <p className="lead">{area.summary}</p>
          <div className="meta-row">
            <span className="pill">
              <BadgeCheck size={14} />
              {area.reviewStatus === "reviewed" ? "Curated" : "Needs review"}
            </span>
            {area.lastReviewedAt ? (
              <span className="pill">Reviewed {formatTripDate(area.lastReviewedAt)}</span>
            ) : null}
            <span className="pill">
              <Route size={14} />
              {area.bestFor}
            </span>
            <span className="pill">
              <Clock size={14} />
              {area.approachMinutes ?? "Varies"} min approach
            </span>
            <span className="pill">
              <MapPin size={14} />
              {area.roadDifficulty}
            </span>
          </div>

          <div className="list">
            <article className="card">
              <h3>Route and access details</h3>
              <p>
                ClimbSite connects this climbing area to nearby overnight options, but it is not the
                route guide or access authority. Use the source link for current route, access,
                permit, and closure details before climbing.
              </p>
              {area.sourceUrl ? (
                <a className="ghost-button" href={area.sourceUrl} target="_blank">
                  <ExternalLink size={17} />
                  {area.sourceName ? `${area.sourceName} details` : "Route / access details"}
                </a>
              ) : null}
            </article>
            <article className="card">
              <h3>Approach</h3>
              <p>{area.approach}</p>
            </article>
            <article className="card">
              <h3>Parking</h3>
              <p>{area.parking}</p>
            </article>
          </div>
        </div>

        <div className="panel map-frame">
          <DynamicAreaMap points={points} />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Camping Nearby</p>
            <h2>Sleep options for this stop</h2>
          </div>
          <Link className="button" href={`/trips/new?area=${encodeURIComponent(area.slug)}`}>
            <Route size={17} />
            Start a trip here
          </Link>
        </div>

        <div className="grid">
          {area.campgroundLinks.map((link) => (
            <article className="card" key={link.id}>
              <div className="meta-row">
                <span className="pill">
                  <BadgeCheck size={14} />
                  {link.reviewStatus === "reviewed" ? "Curated logistics" : "Needs review"}
                </span>
                {link.lastReviewedAt ? (
                  <span className="pill">Reviewed {formatTripDate(link.lastReviewedAt)}</span>
                ) : null}
              </div>
              <h3>{link.campground.name}</h3>
              <p>{link.campground.summary}</p>
              <div className="meta-row">
                <span className="pill">
                  <Tent size={14} />
                  {link.campground.type}
                </span>
                <span className="pill">
                  <Clock size={14} />
                  {link.driveMinutes} min drive
                </span>
                <span className="pill">{link.miles} mi</span>
              </div>
              <p>{link.logisticsNote}</p>
              <p>{link.campground.campingFit}</p>
              {link.campground.reservationUrl ? (
                <a className="ghost-button" href={link.campground.reservationUrl} target="_blank">
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
