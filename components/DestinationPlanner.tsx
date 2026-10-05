"use client";

import { useMemo, useState } from "react";
import { Check, Clock, ExternalLink, MapPin, Route, Tent } from "lucide-react";

import { compareCamps, type PlanningArea } from "@/lib/camp-comparison";

export function DestinationPlanner({ hubSlug, areas }: { hubSlug: string; areas: PlanningArea[] }) {
  const [selected, setSelected] = useState(() => new Set(areas[0] ? [areas[0].id] : []));
  const selectedAreas = areas.filter((area) => selected.has(area.id));
  const camps = useMemo(() => compareCamps(selectedAreas), [selectedAreas]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <form className="destination-planner" action="/trips/new" method="get">
      <input type="hidden" name="hub" value={hubSlug} />
      <div className="area-selection-grid">
        {areas.map((area) => {
          const isSelected = selected.has(area.id);
          return (
            <label className={`planning-area-card${isSelected ? " is-selected" : ""}`} key={area.id}>
              <input type="checkbox" name="area" value={area.slug} checked={isSelected} onChange={() => toggle(area.id)} />
              <span className="selection-check" aria-hidden="true"><Check size={15} /></span>
              <span className="planning-area-content">
                <span className="eyebrow">{area.parentName ? `Subarea · ${area.parentName}` : isSelected ? "Selected stop" : "Climbing area"}</span>
                <strong>{area.name}</strong>
                <small>{area.bestFor}</small>
                <span className="metric-row">
                  <span><Clock size={15} /> {area.approachMinutes ?? "Varies"} min approach</span>
                  <span><MapPin size={15} /> {area.roadDifficulty}</span>
                  <span><Tent size={15} /> {area.campgroundLinks.length} nearby</span>
                </span>
                <small className="friction-note">Parking: {area.parking}</small>
              </span>
            </label>
          );
        })}
      </div>

      <div className="comparison-head">
        <div>
          <p className="eyebrow">Camp comparison</p>
          <h2>Compare the morning drive</h2>
          <p>Coverage comes first, followed by the longest drive and total drive time (shorter is better). Totals include one one-way camp-to-area drive per covered stop; these are curated estimates, not live routes or availability.</p>
        </div>
        <button className="button" type="submit" disabled={selected.size === 0}>
          <Route size={17} /> Continue with {selected.size || "no"} {selected.size === 1 ? "stop" : "stops"}
        </button>
      </div>

      {selected.size === 0 ? (
        <div className="empty">Select at least one climbing area to compare nearby camping.</div>
      ) : camps.length === 0 ? (
        <div className="empty">No reviewed campground relationships are available for these areas yet.</div>
      ) : (
        <div className="camp-comparison-list">
          {camps.map((item, index) => (
            <article className="camp-comparison-row" key={item.campground.id}>
              <div>
                <span className="recommendation">{index === 0 ? "Top planning suggestion" : `Option ${index + 1}`}</span>
                <h3>{item.campground.name}</h3>
                <p className="camp-coverage">Serves {item.links.length} of {selectedAreas.length} stops</p>
                <p className="camp-drive-summary">Longest drive: {item.longestDriveMinutes} min · Total: {item.totalDriveMinutes} min{item.missingAreas.length ? " across covered stops" : ""}</p>
                {item.missingAreas.length ? <p className="field-error">No reviewed drive for: {item.missingAreas.join(", ")}</p> : null}
                <span className="camp-type"><Tent size={15} /> {item.campground.type}</span>
              </div>
              <div className="drive-list">
                {item.links.map((link) => (
                  <div key={link.areaId}>
                    <strong>{link.area}</strong>
                    <span>{link.driveMinutes} min · {link.miles} mi</span>
                  </div>
                ))}
              </div>
              <div className="camp-fit">
                <strong>Climbing fit</strong>
                <p>{item.campground.campingFit}</p>
                <details><summary>Amenities & logistics</summary><p>{item.campground.amenities}</p>{item.links.map(link => <p key={link.areaId}><strong>{link.area}:</strong> {link.note}</p>)}</details>
              </div>
              {item.campground.reservationUrl || item.campground.sourceUrl ? (
                <a className="ghost-button" href={item.campground.reservationUrl ?? item.campground.sourceUrl ?? undefined} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} /> Verify details
                </a>
              ) : <span className="muted-label">No source link</span>}
            </article>
          ))}
        </div>
      )}
    </form>
  );
}
