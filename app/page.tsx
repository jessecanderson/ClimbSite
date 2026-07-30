import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, Compass, MapPin, Search, ShieldCheck, Tent } from "lucide-react";
import { getAreas, getHubs } from "@/lib/queries";

export default async function HomePage() {
  const [areas, hubs] = await Promise.all([getAreas(), getHubs()]);
  const regions = [...new Set(areas.map((area) => area.region))].sort();

  return (
    <main>
      <section className="home-hero">
        <div className="page hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Southeast field guide</p>
            <h1>Plan a climbing weekend.</h1>
            <p className="lead">Choose where to climb, compare the camp-to-crag drive, and keep the sources you need to verify before leaving home.</p>
          </div>
          <form className="search-panel" action="/areas" method="get">
            <div className="search-panel-head"><Search size={22} /><div><strong>Find your next stop</strong><span>Search reviewed destinations and climbing areas</span></div></div>
            <label className="field search-wide"><span>Destination or area</span><input className="input" type="search" name="q" placeholder="Red River Gorge, bouldering…" /></label>
            <label className="field"><span>Region</span><select className="input" name="region" defaultValue=""><option value="">Anywhere</option>{regions.map((region) => <option key={region}>{region}</option>)}</select></label>
            <label className="field"><span>Approach</span><select className="input" name="approach" defaultValue=""><option value="">Any length</option><option value="short">15 min or less</option><option value="moderate">16–30 min</option><option value="long">Over 30 min / varies</option></select></label>
            <label className="filter-check"><input type="checkbox" name="camping" value="yes" /> Nearby camping only</label>
            <button className="button search-submit" type="submit"><Search size={17} /> Explore options</button>
          </form>
        </div>
      </section>

      <section className="page section">
        <div className="section-head"><div><p className="eyebrow">Featured destinations</p><h2>Weekends worth building around</h2></div><Link className="ghost-button" href="/hubs">All destinations <ArrowRight size={17} /></Link></div>
        <div className="destination-grid">
          {hubs.slice(0, 3).map((hub, index) => (
            <article className={`destination-card destination-tone-${index % 3}`} key={hub.id}>
              <div className="destination-card-top"><span className="destination-number">0{index + 1}</span><span className="pill"><MapPin size={14} />{hub.region}</span></div>
              <div><h3>{hub.name}</h3><p>{hub.summary}</p></div>
              <div className="destination-stats"><span><strong>{hub.areas.length}</strong> climbing areas</span><span><strong>{hub.campgrounds.length}</strong> camp options</span></div>
              {hub.seasonNotes ? <p className="season-note"><CalendarCheck size={16} /> <span><strong>Season notes</strong>{hub.seasonNotes}</span></p> : null}
              <Link className="button" href={`/hubs/${hub.slug}`}>Explore destination <ArrowRight size={17} /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="page section how-it-works">
        <div><p className="eyebrow">A practical planning loop</p><h2>How ClimbSite works</h2><p>ClimbSite organizes logistics. Guidebooks, land managers, and reservation providers remain the authority.</p></div>
        <ol className="process-list">
          <li><span><Compass /></span><div><strong>Select</strong><p>Pick a destination and the climbing stops that fit your weekend.</p></div></li>
          <li><span><Tent /></span><div><strong>Compare</strong><p>See drive time, mileage, amenities, and camping fit side by side.</p></div></li>
          <li><span><CheckCircle2 /></span><div><strong>Plan</strong><p>Add dates, order stops, choose camps, and save trip notes.</p></div></li>
          <li><span><ShieldCheck /></span><div><strong>Verify</strong><p>Follow authoritative links for access, closures, and booking details.</p></div></li>
        </ol>
      </section>
    </main>
  );
}
