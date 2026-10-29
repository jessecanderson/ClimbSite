"use client";
export function TripExportButtons({ tripId }: { tripId: string }) {
  return <>
    <button type="button" className="ghost-button" onClick={() => window.print()}>Print itinerary</button>
    <a className="ghost-button" href={`/trips/${tripId}/export`} download>Download itinerary</a>
  </>;
}
