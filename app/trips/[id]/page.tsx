import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeCheck, CheckCircle2, Clock, ExternalLink, MapPin, Plus, Save, Tent, Trash2 } from "lucide-react";
import {
  addStopAction,
  removeStopAction,
  selectCampgroundAction,
  updateStopNotesAction,
  updateTripAction
} from "@/app/actions";
import { DeleteTripButton } from "@/components/DeleteTripButton";
import { ShareTripButton } from "@/components/ShareTripButton";
import { getCurrentUser } from "@/lib/auth";
import { getAreas, getTripForUser } from "@/lib/queries";
import { DynamicAreaMap } from "@/components/DynamicAreaMap";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const [trip, areas] = await Promise.all([getTripForUser(id, user.id), getAreas()]);

  if (!trip) {
    notFound();
  }

  const selectedCampCount = trip.stops.filter((stop) => stop.selectedCampgroundId).length;
  const missingCampCount = trip.stops.length - selectedCampCount;
  const shareSummary = [
    `${trip.name}`,
    trip.notes ? `Notes: ${trip.notes}` : null,
    "",
    ...trip.stops.map((stop) => {
      const selectedLink = stop.climbingArea.campgroundLinks.find(
        (link) => link.campgroundId === stop.selectedCampgroundId
      );

      return [
        `Stop ${stop.order}: ${stop.climbingArea.name}`,
        `Area source: ${stop.climbingArea.sourceUrl ?? "No source link saved"}`,
        selectedLink
          ? `Camp: ${selectedLink.campground.name} (${selectedLink.driveMinutes} min, ${selectedLink.miles} mi)`
          : "Camp: Not selected",
        selectedLink?.campground.reservationUrl
          ? `Camp details: ${selectedLink.campground.reservationUrl}`
          : null,
        stop.notes ? `Stop notes: ${stop.notes}` : null
      ]
        .filter(Boolean)
        .join("\n");
    })
  ]
    .filter((line) => line !== null)
    .join("\n");
  const points = trip.stops.flatMap((stop) => [
    {
      name: stop.climbingArea.name,
      lat: stop.climbingArea.lat,
      lng: stop.climbingArea.lng,
      kind: "area" as const,
      detail: `Stop ${stop.order}`
    },
    ...[
      stop.selectedCampground ??
        stop.climbingArea.campgroundLinks[0]?.campground
    ].filter(Boolean).map((campground) => ({
      name: campground.name,
      lat: campground.lat,
      lng: campground.lng,
      kind: "campground" as const,
      detail: `Camp for stop ${stop.order}`
    }))
  ]);

  return (
    <main className="page">
      <section className="two-col">
        <div>
          <p className="eyebrow">Saved Trip</p>
          <h1>{trip.name}</h1>
          <p className="lead">{trip.notes || "Add stops to compare camping logistics around each climbing day."}</p>
          <div className="meta-row">
            <span className="pill">{trip.stops.length} stops</span>
            <span className="pill">{selectedCampCount} camps selected</span>
            {missingCampCount > 0 ? <span className="pill">{missingCampCount} missing camps</span> : null}
            <span className="pill">Updated {trip.updatedAt.toLocaleDateString()}</span>
          </div>
          <div className="actions">
            <ShareTripButton summary={shareSummary} />
            <DeleteTripButton tripId={trip.id} tripName={trip.name} />
          </div>
        </div>
        <div className="panel map-frame">
          {points.length > 0 ? <DynamicAreaMap points={points} /> : <div className="empty">Add a stop to build the map.</div>}
        </div>
      </section>

      <section className="section">
        <div className="grid">
          <article className="card">
            <h3>Edit Trip</h3>
            <form className="form" action={updateTripAction}>
              <input type="hidden" name="tripId" value={trip.id} />
              <label className="field">
                <span>Trip name</span>
                <input className="input" name="name" required defaultValue={trip.name} />
              </label>
              <label className="field">
                <span>Notes</span>
                <textarea className="input" name="notes" defaultValue={trip.notes ?? ""} />
              </label>
              <button className="button" type="submit">
                <Save size={17} />
                Save trip
              </button>
            </form>
          </article>
          <article className="card">
            <h3>Trip Status</h3>
            <p>
              {missingCampCount === 0 && trip.stops.length > 0
                ? "Every climbing stop has a selected campground."
                : "Choose one campground for each climbing stop before the trip is ready."}
            </p>
            <div className="meta-row">
              <span className="pill">
                <CheckCircle2 size={14} />
                {selectedCampCount} selected
              </span>
              <span className="pill">
                <Tent size={14} />
                {missingCampCount} open
              </span>
            </div>
          </article>
          <article className="card">
            <h3>Data Quality</h3>
            <p>
              Curated badges mean the logistics were manually reviewed. Use each area and campground
              source link for current route, access, permit, closure, and booking details.
            </p>
          </article>
        </div>
      </section>

      <section className="section two-col">
        <div>
          <div className="section-head">
            <div>
              <p className="eyebrow">Itinerary</p>
              <h2>Manual climbing stops</h2>
            </div>
          </div>

          {trip.stops.length === 0 ? (
            <div className="empty">
              <p>No stops yet. Add a climbing area from the panel to start comparing nearby camps.</p>
              <Link className="button" href="/areas">
                Browse areas
              </Link>
            </div>
          ) : (
            <div className="list">
              {trip.stops.map((stop) => (
                <article className="card" key={stop.id}>
                  {(() => {
                    const selectedLink = stop.climbingArea.campgroundLinks.find(
                      (link) => link.campgroundId === stop.selectedCampgroundId
                    );

                    return (
                      <>
                  <div className="section-head">
                    <div className="split-title">
                      <span className="stop-index">{stop.order}</span>
                      <div>
                        <h3>{stop.climbingArea.name}</h3>
                        <p>{stop.climbingArea.bestFor}</p>
                      </div>
                    </div>
                    <form action={removeStopAction}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <input type="hidden" name="stopId" value={stop.id} />
                      <button className="ghost-button" type="submit" title="Remove stop">
                        <Trash2 size={17} />
                      </button>
                    </form>
                  </div>
                  <div className="meta-row">
                    <span className="pill">
                      <Clock size={14} />
                      {stop.climbingArea.approachMinutes ?? "Varies"} min approach
                    </span>
                    <span className="pill">
                      <MapPin size={14} />
                      {stop.climbingArea.roadDifficulty}
                    </span>
                  </div>
                  <p>{stop.climbingArea.approach}</p>
                  <form className="form compact-form" action={updateStopNotesAction}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <input type="hidden" name="stopId" value={stop.id} />
                    <label className="field">
                      <span>Stop notes</span>
                      <textarea
                        className="input"
                        name="notes"
                        defaultValue={stop.notes ?? ""}
                        placeholder="Routes to research, partner notes, weather backup..."
                      />
                    </label>
                    <button className="ghost-button" type="submit">
                      <Save size={17} />
                      Save notes
                    </button>
                  </form>

                  {selectedLink ? (
                    <div className="selected-camp">
                      <div>
                        <p className="eyebrow">Selected Camp</p>
                        <h3>{selectedLink.campground.name}</h3>
                        <p>{selectedLink.logisticsNote}</p>
                        <div className="meta-row">
                          <span className="pill">
                            <CheckCircle2 size={14} />
                            Chosen for this stop
                          </span>
                          <span className="pill">{selectedLink.driveMinutes} min drive</span>
                          <span className="pill">{selectedLink.miles} mi</span>
                        </div>
                      </div>
                      {selectedLink.campground.reservationUrl ? (
                        <a className="button" href={selectedLink.campground.reservationUrl} target="_blank">
                          <ExternalLink size={17} />
                          Camping / booking details
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div className="empty">Choose a campground for this stop.</div>
                  )}

                  <div className="list">
                    {stop.climbingArea.campgroundLinks.map((link) => (
                      <div className="subitem" key={link.id}>
                        <h3>{link.campground.name}</h3>
                        <p>{link.logisticsNote}</p>
                        <div className="meta-row">
                          <span className="pill">
                            <BadgeCheck size={14} />
                            {link.reviewStatus === "reviewed" ? "Curated" : "Needs review"}
                          </span>
                          <span className="pill">{link.driveMinutes} min drive</span>
                          <span className="pill">{link.miles} mi</span>
                          <span className="pill">{link.campground.type}</span>
                        </div>
                        <p>{link.campground.amenities}</p>
                        <p>{link.campground.campingFit}</p>
                        <div className="actions">
                          <form action={selectCampgroundAction}>
                            <input type="hidden" name="tripId" value={trip.id} />
                            <input type="hidden" name="stopId" value={stop.id} />
                            <input type="hidden" name="campgroundId" value={link.campground.id} />
                            <button
                              className={link.campgroundId === stop.selectedCampgroundId ? "button" : "ghost-button"}
                              type="submit"
                            >
                              <CheckCircle2 size={17} />
                              {link.campgroundId === stop.selectedCampgroundId ? "Selected" : "Use this camp"}
                            </button>
                          </form>
                        {link.campground.reservationUrl ? (
                          <a className="ghost-button" href={link.campground.reservationUrl} target="_blank">
                            <ExternalLink size={17} />
                            Camping / booking details
                          </a>
                        ) : null}
                        </div>
                      </div>
                    ))}
                    {stop.climbingArea.campgroundLinks.length === 0 ? (
                      <div className="empty">
                        No campground links are reviewed for this area yet. Use the area source link
                        for current access details while this stop gets researched.
                      </div>
                    ) : null}
                  </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="card">
          <h2>Add a stop</h2>
          <p>Choose the next climbing area in your road trip. Stop ordering is the order you add them.</p>
          <form className="form" action={addStopAction}>
            <input type="hidden" name="tripId" value={trip.id} />
            <label className="field">
              <span>Climbing area</span>
              <select className="input" name="climbingAreaId" required>
                {areas.map((area) => (
                  <option value={area.id} key={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Stop notes</span>
              <textarea className="input" name="notes" placeholder="Routes, rest-day ideas, partner notes..." />
            </label>
            <button className="button" type="submit">
              <Plus size={17} />
              Add stop
            </button>
          </form>
          <div className="actions">
            <Link className="ghost-button" href="/areas">
              Browse area details
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
