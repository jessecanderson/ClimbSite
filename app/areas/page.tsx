import Link from "next/link";
import { getAreaDiscovery } from "@/lib/queries";
import type { AreaFilters } from "@/lib/discovery";
import { AreaExplorer } from "@/components/AreaExplorer";

export default async function AreasPage({ searchParams }: { searchParams: Promise<AreaFilters> }) {
  const raw = await searchParams;
  const filters: AreaFilters = Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === "string"));
  const { areas, total, regions, hubs, page, pageSize } = await getAreaDiscovery(filters);
  const pageHref = (next: number) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([key, value]) => key !== "page" && Boolean(value)) as [string, string][]);
    params.set("page", String(next)); return `/areas?${params}`;
  };
  return (
    <main className="page discovery-page">
      <header className="workspace-header">
        <p className="eyebrow">Explore · Climbing areas</p>
        <h1>Find your next climbing stop.</h1>
        <p>Compare the approach, climbing style, and nearby camps. Add a favorite to your plan.</p>
      </header>
      <form className="card area-filters" method="get">
        <label className="field filter-search"><span>Search areas</span><input className="input" type="search" name="q" maxLength={120} defaultValue={filters.q ?? ""} placeholder="Area, destination, or climbing style" /></label>
        <label className="field"><span>Region</span><select className="input" name="region" defaultValue={filters.region ?? ""}><option value="">All regions</option>{regions.map(region => <option key={region}>{region}</option>)}</select></label>
        <label className="field"><span>Destination</span><select className="input" name="hub" defaultValue={filters.hub ?? ""}><option value="">All destinations</option>{hubs.map(hub => <option key={hub.id} value={hub.slug}>{hub.name}</option>)}</select></label>
        <label className="field"><span>Approach</span><select className="input" name="approach" defaultValue={filters.approach ?? ""}><option value="">Any length</option><option value="short">15 min or less</option><option value="moderate">16–30 min</option><option value="long">Over 30 min / varies</option></select></label>
        <label className="filter-check"><input type="checkbox" name="camping" value="yes" defaultChecked={filters.camping === "yes"} />Has nearby camping</label>
        <div className="filter-actions"><button className="button" type="submit">Apply filters</button><Link className="ghost-button" href="/areas">Clear</Link></div>
      </form>
      <div className="results-head" aria-live="polite"><strong>{total} {total === 1 ? "area" : "areas"}</strong><span>{total > 0 ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : "Try a broader search or clear your filters."}</span></div>
      {areas.length ? <AreaExplorer areas={areas} /> : <div className="empty"><p>No areas match these filters.</p><Link href="/areas" className="button">Clear filters</Link></div>}
      {total > pageSize ? <nav className="pagination" aria-label="Results pages">
        {page > 1 ? <Link className="ghost-button" href={pageHref(page - 1)}>Previous</Link> : <span />}
        <span>Page {page} of {Math.ceil(total / pageSize)}</span>
        {page * pageSize < total ? <Link className="ghost-button" href={pageHref(page + 1)}>Next</Link> : <span />}
      </nav> : null}
    </main>
  );
}
