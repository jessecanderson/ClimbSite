import { formatDateInput, formatTripDate, formatTripDateRange } from "./dates";
import { selectedCampLink } from "./trip-planning";

type DatedStop = { plannedDate: Date | null; order: number };
export function groupStops<T extends DatedStop>(stops: T[]) {
  const groups = new Map<string, T[]>();
  for (const stop of [...stops].sort((a, b) => a.order - b.order)) {
    const key = formatDateInput(stop.plannedDate) || "undated";
    groups.set(key, [...(groups.get(key) ?? []), stop]);
  }
  return [...groups.entries()].sort(([a], [b]) => a === "undated" ? 1 : b === "undated" ? -1 : a.localeCompare(b))
    .map(([key, items]) => ({ key, label: key === "undated" ? "Undated stops" : formatTripDate(new Date(`${key}T12:00:00Z`)), stops: items }));
}
export function adjacentStopIndex<T extends DatedStop & { id: string }>(stops: T[], id: string, direction: "up" | "down") {
  const index = stops.findIndex(s => s.id === id);
  if (index < 0) return -1;
  const day = formatDateInput(stops[index].plannedDate);
  const step = direction === "up" ? -1 : 1;
  for (let i = index + step; i >= 0 && i < stops.length; i += step) {
    if (formatDateInput(stops[i].plannedDate) === day) return i;
  }
  return -1;
}

type Camp = { name: string; reservationUrl: string | null; lastReviewedAt: Date | null };
type PlanStop = DatedStop & { notes: string | null; selectedCampgroundId: string | null;
  selectedCampground: Camp | null;
  climbingArea: { name: string; sourceUrl: string | null; reviewStatus: string; lastReviewedAt: Date | null;
    campgroundLinks: { campgroundId: string; driveMinutes: number; miles: number; campground: Camp }[] } };
export type TripPlan = { name: string; notes: string | null; startDate: Date | null; endDate: Date | null; stops: PlanStop[] };
export function itineraryText(trip: TripPlan) {
  return [trip.name, formatTripDateRange(trip.startDate, trip.endDate) ?? "Trip dates not set", trip.notes ?? "",
    ...groupStops(trip.stops).flatMap(group => ["", group.label, ...group.stops.map((stop, index) => {
      const camp = selectedCampLink(stop);
      return [`${index + 1}. ${stop.climbingArea.name}`,
        `Access source: ${stop.climbingArea.sourceUrl ?? "No source link saved — verify access before departure"}`,
        `Area reviewed: ${stop.climbingArea.lastReviewedAt ? formatTripDate(stop.climbingArea.lastReviewedAt) : "No review date"}`,
        camp ? `Camp: ${camp.campground.name} (${camp.driveMinutes} min, ${camp.miles} mi)` : stop.selectedCampgroundId ? "Camp needs reconfirmation" : "Camp not selected",
        camp ? `Camping source: ${camp.campground.reservationUrl ?? "No booking link saved"}` : null,
        camp ? `Camp reviewed: ${camp.campground.lastReviewedAt ? formatTripDate(camp.campground.lastReviewedAt) : "No review date"}` : null,
        stop.notes ? `Notes: ${stop.notes}` : null].filter(Boolean).join("\n");
    })]), "", "Before departure: verify access, closures, permits, and reservations with the linked sources.",
    "Review dates describe editorial checks, not live conditions or reservation availability."].join("\n");
}
