import Link from "next/link";
import { BadgeCheck, Clock, ExternalLink, MapPin, Search, Tent } from "lucide-react";
import { getAreas } from "@/lib/queries";
import { formatTripDate } from "@/lib/dates";

export default async function AreasPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; region?: string; hub?: string; camping?: string; approach?: string }>;
}) {
  const filters = await searchParams;
  const areas = await getAreas();
  const regions = [...new Set(areas.map((area) => area.region))].sort();
  const hubs = [
    ...new Map(
      areas.flatMap((area) => area.hubLinks.map(({ hub }) => [hub.slug, hub] as const))
    ).values()
  ].sort((a, b) => a.name.localeCompare(b.name));
  const query = filters.q?.trim().toLowerCase() ?? "";
  const filteredAreas = areas.filter((area) => {
    const matchesQuery =
      !query ||
      [area.name, area.region, area.summary, area.bestFor, ...area.hubLinks.map(({ hub }) => hub.name)].some((value) =>
        value.toLowerCase().includes(query)
      );
    const matchesRegion = !filters.region || area.region === filters.region;
    const matchesHub =
      !filters.hub || area.hubLinks.some(({ hub }) => hub.slug === filters.hub);
    const matchesCamping = filters.camping !== "yes" || area.campgroundLinks.length > 0;
    const matchesApproach =
      !filters.approach ||
      (filters.approach === "short" && area.approachMinutes !== null && area.approachMinutes <= 15) ||
      (filters.approach === "moderate" &&
        area.approachMinutes !== null &&
        area.approachMinutes > 15 &&
        area.approachMinutes <= 30) ||
      (filters.approach === "long" &&
        (area.approachMinutes === null || area.approachMinutes > 30));

    return matchesQuery && matchesRegion && matchesHub && matchesCamping && matchesApproach;
  });

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Explore · All areas</p>
          <h1>Browse every climbing area.</h1>
          <p className="lead">
            Curated and reviewed climbing stops with approach, parking, nearby camping context, and
            outbound source links for route and access details.
          </p>
        </div>
      </div>

      <form className="card area-filters" method="get">
        <label className="field filter-search">
          <span>Search areas</span>
          <div className="input-with-icon">
            <Search size={17} />
            <input
              className="input"
              type="search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Area, region, or climbing style"
            />
          </div>
        </label>
        <label className="field">
          <span>Region</span>
          <select className="input" name="region" defaultValue={filters.region ?? ""}>
            <option value="">All regions</option>
            {regions.map((region) => (
              <option value={region} key={region}>{region}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Destination</span>
          <select className="input" name="hub" defaultValue={filters.hub ?? ""}>
            <option value="">All destinations</option>
            {hubs.map((hub) => (
              <option value={hub.slug} key={hub.id}>{hub.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Approach</span>
          <select className="input" name="approach" defaultValue={filters.approach ?? ""}>
            <option value="">Any length</option>
            <option value="short">15 min or less</option>
            <option value="moderate">16–30 min</option>
            <option value="long">Over 30 min / varies</option>
          </select>
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            name="camping"
            value="yes"
            defaultChecked={filters.camping === "yes"}
          />
          Has nearby camping
        </label>
        <div className="filter-actions">
          <button className="button" type="submit">Apply filters</button>
          <Link className="ghost-button" href="/areas">Clear</Link>
        </div>
      </form>

      <div className="results-head" aria-live="polite">
        <strong>{filteredAreas.length} {filteredAreas.length === 1 ? "area" : "areas"}</strong>
        <span>matching your filters</span>
      </div>

      {filteredAreas.length > 0 ? (
        <div className="grid">
        {filteredAreas.map((area) => (
          <article className="card" key={area.id}>
            <h3>{area.name}</h3>
            <p>{area.summary}</p>
            <div className="meta-row">
              <span className="pill">
                <BadgeCheck size={14} />
                {area.reviewStatus === "reviewed" ? "Curated" : "Needs review"}
              </span>
              {area.lastReviewedAt ? (
                <span className="pill">Reviewed {formatTripDate(area.lastReviewedAt)}</span>
              ) : null}
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
              <Link className="button" href={`/areas/${area.slug}`}>
                Compare camping
              </Link>
              {area.sourceUrl ? (
                <a className="ghost-button" href={area.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={17} />
                  Route / access source
                </a>
              ) : null}
            </div>
          </article>
        ))}
        </div>
      ) : (
        <div className="empty">
          <p>No climbing areas match those filters.</p>
          <Link className="ghost-button" href="/areas">Clear filters</Link>
        </div>
      )}
    </main>
  );
}
