"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Clock, MapPin, Tent } from "lucide-react";
import { DynamicAreaMap } from "./DynamicAreaMap";
import { ReviewStatus } from "./ReviewStatus";

type Area = { id: string; slug: string; name: string; region: string; destination: string;
  summary: string; bestFor: string; approachMinutes: number | null; campgroundCount: number;
  lastReviewedAt: string | null; lat: number; lng: number };
export function AreaExplorer({ areas }: { areas: Area[] }) {
  const [view, setView] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  function select(id: string, fromMap = false) {
    setSelected(id);
    if (fromMap) {
      setView("list");
      requestAnimationFrame(() => {
        const card = cardRefs.current.get(id);
        card?.scrollIntoView({ block: "nearest", behavior: "instant" });
        card?.focus({ preventScroll: true });
      });
    }
  }
  return <>
    <div className="explorer-view-toggle" role="group" aria-label="Results view">
      <button className="ghost-button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
      <button className="ghost-button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button>
    </div>
    <div className={`explorer-layout view-${view}`}>
      <div className="explorer-cards">
        {areas.map(area => <article key={area.id} tabIndex={-1} ref={node => { if (node) cardRefs.current.set(area.id, node); else cardRefs.current.delete(area.id); }}
          className={`card discovery-card${selected === area.id ? " is-selected" : ""}`}>
          <p className="eyebrow"><MapPin size={13} />{area.destination}</p>
          <h2><Link href={`/areas/${area.slug}`}>{area.name}</Link></h2>
          <p className="area-style">{area.bestFor}</p>
          <p className="area-summary">{area.summary}</p>
          <div className="discovery-metrics"><span><Clock size={16} /><strong>{area.approachMinutes === null ? "Varies" : `${area.approachMinutes} min`}</strong> approach</span><span><Tent size={16} /><strong>{area.campgroundCount}</strong> camp options</span></div>
          <ReviewStatus reviewedAt={area.lastReviewedAt} compact />
          <div className="card-actions">
            <Link className="button" href={`/trips/new?area=${encodeURIComponent(area.slug)}`}>Add to trip</Link>
            <Link className="ghost-button" href={`/areas/${area.slug}`}>Compare camping</Link>
            <button className="text-link" onClick={() => { select(area.id); setView("map"); }}>Show on map</button>
          </div>
        </article>)}
      </div>
      <aside className="explorer-map" aria-label="Map of current results">
        <p className="map-context">Map shows this page’s {areas.length} results. Select a marker to find its card.</p>
        <DynamicAreaMap points={areas.map(area => ({ id: area.id, name: area.name, lat: area.lat, lng: area.lng, kind: "area", detail: area.bestFor, href: `/areas/${area.slug}` }))}
          selectedId={selected} onSelect={id => select(id, true)} />
      </aside>
    </div>
  </>;
}
