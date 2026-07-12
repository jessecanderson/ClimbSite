import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Plus,
  Save,
  Tent,
  Trash2
} from "lucide-react";
import {
  addStopAction,
  moveStopAction,
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
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateInput, formatTripDate, formatTripDateRange } from "@/lib/dates";
import { ArrowDown, ArrowUp, CalendarDays } from "lucide-react";

export default async function TripDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { error, notice } = await searchParams;
  const [trip, areas] = await Promise.all([getTripForUser(id, user.id), getAreas()]);

  if (!trip) {
    notFound();
  }

  const selectedCampCount = trip.stops.filter((stop) => stop.selectedCampgroundId).length;
  const missingCampCount = trip.stops.length - selectedCampCount;
  const completionPercent =
    trip.stops.length > 0 ? Math.round((selectedCampCount / trip.stops.length) * 100) : 0;
  const availableAreas = areas.filter(
    (area) => !trip.stops.some((stop) => stop.climbingAreaId === area.id)
  );
  const tripDateRange = formatTripDateRange(trip.startDate, trip.endDate);
  const shareSummary = [
    `${trip.name}`,
    tripDateRange ? `Dates: ${tripDateRange}` : null,
    trip.notes ? `Notes: ${trip.notes}` : null,
    "",
    ...trip.stops.map((stop) => {
      const selectedLink = stop.climbingArea.campgroundLinks.find(
        (link) => link.campgroundId === stop.selectedCampgroundId
      );

      return [
        `Stop ${stop.order}: ${stop.climbingArea.name}`,
        stop.plannedDate ? `Climbing date: ${formatTripDate(stop.plannedDate)}` : null,
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
      detail: `Stop ${stop.order}`,
      href: `/areas/${stop.climbingArea.slug}`
    },
    ...(stop.selectedCampground
      ? [
          {
            name: stop.selectedCampground.name,
            lat: stop.selectedCampground.lat,
            lng: stop.selectedCampground.lng,
            kind: "campground" as const,
            detail: `Selected camp for stop ${stop.order}`,
            href: stop.selectedCampground.reservationUrl ?? undefined
          }
        ]
      : [])
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
            {tripDateRange ? (
              <span className="pill">
                <CalendarDays size={14} />
                {tripDateRange}
              </span>
            ) : null}
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

      <section className="section two-col">
        <div>
          <div className="section-head">
            <div>
              <p className="eyebrow">Itinerary</p>
              <h2>Build your climbing plan</h2>
              <p>
                {trip.stops.length === 0
                  ? "Add your first climbing area to get started."
                  : missingCampCount === 0
                    ? "Every stop has a camp selected. Your core plan is ready to verify."
                    : `Choose camping for ${missingCampCount} more ${missingCampCount === 1 ? "stop" : "stops"}.`}
              </p>
            </div>
          </div>

          {trip.stops.length > 0 ? (
            <div
              className="trip-progress"
              role="progressbar"
              aria-label="Stops with selected camping"
              aria-valuemin={0}
              aria-valuemax={trip.stops.length}
              aria-valuenow={selectedCampCount}
            >
              <div className="trip-progress-head">
                <strong>Camping selections</strong>
                <span>{selectedCampCount} of {trip.stops.length}</span>
              </div>
              <div className="progress-track">
                <span className="progress-fill" style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          ) : null}

          {trip.stops.length === 0 ? (
            <div className="empty">
              <p>No stops yet. Add a climbing area from the panel to start comparing nearby camps.</p>
              <Link className="button" href="/areas">
                Browse areas
              </Link>
            </div>
          ) : (
            <div className="list">
              {trip.stops.map((stop) => {
                const selectedLink = stop.climbingArea.campgroundLinks.find(
                  (link) => link.campgroundId === stop.selectedCampgroundId
                );

                return (
                  <details className="trip-stop" key={stop.id} open={trip.stops.length === 1}>
                    <summary className="trip-stop-summary">
                      <span className="split-title">
                        <span className="stop-index">{stop.order}</span>
                        <span>
                          <strong className="trip-stop-name">{stop.climbingArea.name}</strong>
                          <span className="trip-stop-subtitle">{stop.climbingArea.bestFor}</span>
                          {stop.plannedDate ? (
                            <span className="trip-stop-date">
                              <CalendarDays size={13} />
                              {formatTripDate(stop.plannedDate)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={
                          selectedLink
                            ? "stop-status stop-status-ready"
                            : "stop-status stop-status-needed"
                        }
                      >
                        {selectedLink ? (
                          <>
                            <CheckCircle2 size={15} />
                            {selectedLink.campground.name}
                          </>
                        ) : (
                          <>
                            <Tent size={15} />
                            Camp needed
                          </>
                        )}
                      </span>
                    </summary>

                    <div className="trip-stop-body">
                      <div className="stop-toolbar">
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
                        <div className="stop-actions">
                          <form action={moveStopAction}>
                            <input type="hidden" name="tripId" value={trip.id} />
                            <input type="hidden" name="stopId" value={stop.id} />
                            <SubmitButton
                              ariaLabel={`Move ${stop.climbingArea.name} earlier`}
                              className="ghost-button icon-button"
                              disabled={stop.order === 1}
                              name="direction"
                              pendingLabel="…"
                              title="Move stop earlier"
                              value="up"
                            >
                              <ArrowUp size={17} />
                            </SubmitButton>
                          </form>
                          <form action={moveStopAction}>
                            <input type="hidden" name="tripId" value={trip.id} />
                            <input type="hidden" name="stopId" value={stop.id} />
                            <SubmitButton
                              ariaLabel={`Move ${stop.climbingArea.name} later`}
                              className="ghost-button icon-button"
                              disabled={stop.order === trip.stops.length}
                              name="direction"
                              pendingLabel="…"
                              title="Move stop later"
                              value="down"
                            >
                              <ArrowDown size={17} />
                            </SubmitButton>
                          </form>
                          <form action={removeStopAction}>
                          <input type="hidden" name="tripId" value={trip.id} />
                          <input type="hidden" name="stopId" value={stop.id} />
                          <SubmitButton className="ghost-button" pendingLabel="Removing…" title="Remove stop">
                            <Trash2 size={17} />
                            Remove
                          </SubmitButton>
                          </form>
                        </div>
                      </div>
                      <p>{stop.climbingArea.approach}</p>
                      <div className="card-actions">
                        <Link className="ghost-button" href={`/areas/${stop.climbingArea.slug}`}>
                          View area details
                        </Link>
                        {stop.climbingArea.sourceUrl ? (
                          <a className="ghost-button" href={stop.climbingArea.sourceUrl} target="_blank">
                            <ExternalLink size={17} />
                            Route / access source
                          </a>
                        ) : null}
                      </div>
                      <form className="form compact-form" action={updateStopNotesAction}>
                        <input type="hidden" name="tripId" value={trip.id} />
                        <input type="hidden" name="stopId" value={stop.id} />
                        <label className="field">
                          <span>Climbing date</span>
                          <input
                            className="input"
                            type="date"
                            name="plannedDate"
                            defaultValue={formatDateInput(stop.plannedDate)}
                            min={formatDateInput(trip.startDate) || undefined}
                            max={formatDateInput(trip.endDate) || undefined}
                          />
                        </label>
                        <label className="field">
                          <span>Stop notes</span>
                          <textarea
                            className="input"
                            name="notes"
                            defaultValue={stop.notes ?? ""}
                            placeholder="Routes to research, partner notes, weather backup..."
                          />
                        </label>
                        <SubmitButton
                          className="ghost-button"
                          pendingLabel="Saving…"
                          successLabel="Notes saved"
                        >
                          <Save size={17} />
                          Save notes
                        </SubmitButton>
                      </form>

                      {!selectedLink ? (
                        <div className="empty camp-prompt">Choose a campground for this stop.</div>
                      ) : null}

                      <div className="list">
                        {stop.climbingArea.campgroundLinks.map((link) => (
                          <div
                            className={`camp-option${
                              link.campgroundId === stop.selectedCampgroundId
                                ? " camp-option-selected"
                                : ""
                            }`}
                            key={link.id}
                          >
                            {link.campgroundId === stop.selectedCampgroundId ? (
                              <p className="eyebrow">Selected Camp</p>
                            ) : null}
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
                            <details className="option-details">
                              <summary>Amenities and camping fit</summary>
                              <p>{link.campground.amenities}</p>
                              <p>{link.campground.campingFit}</p>
                            </details>
                            <div className="actions">
                              <form action={selectCampgroundAction}>
                                <input type="hidden" name="tripId" value={trip.id} />
                                <input type="hidden" name="stopId" value={stop.id} />
                                <input type="hidden" name="campgroundId" value={link.campground.id} />
                                <SubmitButton
                                  className={
                                    link.campgroundId === stop.selectedCampgroundId
                                      ? "button"
                                      : "ghost-button"
                                  }
                                  disabled={link.campgroundId === stop.selectedCampgroundId}
                                  pendingLabel="Selecting…"
                                >
                                  <CheckCircle2 size={17} />
                                  {link.campgroundId === stop.selectedCampgroundId
                                    ? "Selected"
                                    : "Use this camp"}
                                </SubmitButton>
                              </form>
                              {link.campground.reservationUrl ? (
                                <a
                                  className="ghost-button"
                                  href={link.campground.reservationUrl}
                                  target="_blank"
                                >
                                  <ExternalLink size={17} />
                                  Camping / booking details
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        {stop.climbingArea.campgroundLinks.length === 0 ? (
                          <div className="empty">
                            No campground links are reviewed for this area yet. Use the area source
                            link for current access details while this stop gets researched.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>

        <aside className="planner-sidebar">
          <article className="card" id="add-stop">
            <h2>Add a stop</h2>
            <p>Choose the next climbing area. Stops appear in the order you add them.</p>
            {notice === "duplicate-area" ? (
              <p className="form-message form-message-error" role="alert">
                That climbing area is already in this trip.
              </p>
            ) : null}
            {availableAreas.length > 0 ? (
              <form className="form" action={addStopAction}>
              <input type="hidden" name="tripId" value={trip.id} />
              <label className="field">
                <span>Climbing area</span>
                <select className="input" name="climbingAreaId" required>
                  {availableAreas.map((area) => (
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
              <SubmitButton pendingLabel="Adding stop…">
                <Plus size={17} />
                Add stop
              </SubmitButton>
              </form>
            ) : (
              <p className="form-message">Every available area is already in this trip.</p>
            )}
            <div className="actions">
              <Link className="ghost-button" href="/areas">
                Browse area details
              </Link>
            </div>
          </article>

          <details className="card settings-card">
            <summary>Edit trip name and notes</summary>
            <form className="form" action={updateTripAction}>
              <input type="hidden" name="tripId" value={trip.id} />
              <label className="field">
                <span>Trip name</span>
                <input className="input" name="name" required defaultValue={trip.name} />
              </label>
              <div className="form-row">
                <label className="field">
                  <span>Start date</span>
                  <input
                    className="input"
                    type="date"
                    name="startDate"
                    defaultValue={formatDateInput(trip.startDate)}
                  />
                </label>
                <label className="field">
                  <span>End date</span>
                  <input
                    className="input"
                    type="date"
                    name="endDate"
                    defaultValue={formatDateInput(trip.endDate)}
                  />
                </label>
              </div>
              {error === "date-order" ? (
                <p className="form-message form-message-error" role="alert">
                  End date must be on or after the start date.
                </p>
              ) : null}
              <label className="field">
                <span>Notes</span>
                <textarea className="input" name="notes" defaultValue={trip.notes ?? ""} />
              </label>
              <SubmitButton pendingLabel="Saving trip…" successLabel="Trip saved">
                <Save size={17} />
                Save trip
              </SubmitButton>
            </form>
          </details>

          <article className="planning-note">
            <BadgeCheck size={18} />
            <p>
              Curated badges mean logistics were manually reviewed. Verify current access,
              closures, permits, and booking details with each linked source.
            </p>
          </article>
        </aside>
      </section>
    </main>
  );
}
