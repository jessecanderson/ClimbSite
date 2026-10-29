import { groupStops, type TripPlan } from "@/lib/itinerary";
import { formatTripDateRange } from "@/lib/dates";
import { selectedCampLink } from "@/lib/trip-planning";
import { ReviewStatus } from "./ReviewStatus";
export function TripDocument({ trip }: { trip: TripPlan }) {
  return <section className="trip-print" aria-label="Printable itinerary">
    <h1>{trip.name}</h1>
    <p>{formatTripDateRange(trip.startDate, trip.endDate) ?? "Trip dates not set"}</p>
    {trip.notes ? <p>{trip.notes}</p> : null}
    {groupStops(trip.stops).map(group => <section key={group.key}>
      <h2>{group.label}</h2>
      {group.stops.map((stop, index) => {
        const camp = selectedCampLink(stop);
        return <article key={`${stop.order}-${stop.climbingArea.name}`}>
          <h3>{index + 1}. {stop.climbingArea.name}</h3>
          {stop.climbingArea.sourceUrl ? <p><a href={stop.climbingArea.sourceUrl}>Access and route source</a></p> : <p>Access source unavailable; verify before departure.</p>}
          <ReviewStatus reviewedAt={stop.climbingArea.lastReviewedAt} compact />
          {camp ? <><p>Camp: {camp.campground.name} · {camp.driveMinutes} min / {camp.miles} mi from this stop</p>
            {camp.campground.reservationUrl ? <p><a href={camp.campground.reservationUrl}>Camping and booking details</a></p> : <p>Booking link unavailable.</p>}
            <ReviewStatus reviewedAt={camp.campground.lastReviewedAt} compact /></> : <p>{stop.selectedCampgroundId ? "Camp needs reconfirmation" : "Camp not selected"}</p>}
          {stop.notes ? <p>{stop.notes}</p> : null}
        </article>;
      })}
    </section>)}
    <p>Before departure: check current access, closures, permits, and reservations with the linked sources. Review dates are not live conditions reports.</p>
  </section>;
}
