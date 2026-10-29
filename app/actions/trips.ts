"use server";

import { adjacentStopIndex } from "@/lib/itinerary";
import { reportOperationalEvent } from "@/lib/observability";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { formDate, FormValidationError, isDateInTrip, validationState, type FormState } from "@/lib/form-state";
import { withTripLock } from "@/lib/trip-mutations";
import { prisma } from "@/lib/prisma";


const tripSchema = z.object({ name: z.string().trim().min(1).max(80), notes: z.string().trim().max(1000).optional() });
const stopNotesSchema = z.string().trim().max(500).optional();
const moveDirectionSchema = z.enum(["up", "down"]);
async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function createTripAction(formData: FormData) {
  const user = await requireUser();
  const climbingAreaIds = [
    ...new Set(z.array(z.string().cuid()).max(20).parse(formData.getAll("climbingAreaId")))
  ];
  const data = tripSchema.parse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined
  });
  const startDate = formDate(formData, "startDate");
  const endDate = formDate(formData, "endDate");

  if (startDate && endDate && endDate < startDate) {
    throw new FormValidationError({ endDate: "End date must be on or after the start date." });
  }

  const selectedAreas = climbingAreaIds.length
    ? await prisma.climbingArea.findMany({
        where: { id: { in: climbingAreaIds }, reviewStatus: "reviewed" },
        select: { id: true }
      })
    : [];

  if (selectedAreas.length !== climbingAreaIds.length) {
    throw new FormValidationError({ form: "One of your selected areas is no longer available. Return to Explore to choose another." });
  }

  const trip = selectedAreas.length
    ? await prisma.trip.create({
        data: {
          name: data.name,
          notes: data.notes ?? null,
          startDate,
          endDate,
          userId: user.id,
          stops: {
            create: climbingAreaIds.map((climbingAreaId, index) => ({
              climbingAreaId,
              order: index + 1
            }))
          }
        }
      })
    : await prisma.trip.create({
        data: {
          name: data.name,
          notes: data.notes ?? null,
          startDate,
          endDate,
          userId: user.id
        }
      });

  redirect(`/trips/${trip.id}`);
}

export async function deleteTripAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));

  await prisma.trip.deleteMany({
    where: {
      id: tripId,
      userId: user.id
    }
  });

  revalidatePath("/trips");
  redirect("/trips");
}

export async function updateTripAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const data = tripSchema.parse({ name: formData.get("name"), notes: formData.get("notes") || undefined });
  const startDate = formDate(formData, "startDate");
  const endDate = formDate(formData, "endDate");
  if (startDate && endDate && endDate < startDate) {
    throw new FormValidationError({ endDate: "End date must be on or after the start date." });
  }
  const result = await withTripLock(tripId, user.id, async (tx) => {
    const stops = await tx.tripStop.findMany({ where: { tripId } });
    if (stops.some(stop => !isDateInTrip(stop.plannedDate, startDate, endDate))) {
      throw new FormValidationError({ startDate: "A stop falls outside these dates. Update its climbing date first, or widen the trip dates.", endDate: "All climbing dates must fit within the trip." });
    }
    await tx.trip.update({ where: { id: tripId }, data: { ...data, notes: data.notes ?? null, startDate, endDate, updatedAt: new Date() } });
    return true;
  });
  if (!result) redirect("/trips");
  revalidateTrip(tripId);
}

export async function addStopAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const climbingAreaId = z.string().cuid().parse(formData.get("climbingAreaId"));
  const notes = z.object({ notes: stopNotesSchema }).parse({ notes: formData.get("notes") || undefined }).notes;
  const result = await withTripLock(tripId, user.id, async (tx) => {
    const stops = await tx.tripStop.findMany({ where: { tripId }, orderBy: { order: "asc" } });
    if (stops.some(stop => stop.climbingAreaId === climbingAreaId)) {
      throw new FormValidationError({ climbingAreaId: "That climbing area is already in this trip." });
    }
    const area = await tx.climbingArea.findUnique({ where: { id: climbingAreaId, reviewStatus: "reviewed" }, select: { id: true } });
    if (!area) throw new FormValidationError({ climbingAreaId: "This area is no longer available. Choose another stop." });
    await tx.tripStop.create({ data: { tripId, climbingAreaId, notes, order: (stops.at(-1)?.order ?? 0) + 1 } });
    await tx.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    return true;
  });
  if (!result) redirect("/trips");
  revalidateTrip(tripId);
}

export async function updateStopNotesAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const stopId = z.string().cuid().parse(formData.get("stopId"));
  const notes = z.object({ notes: stopNotesSchema }).parse({ notes: formData.get("notes") || undefined }).notes;
  const plannedDate = formDate(formData, "plannedDate");
  const result = await withTripLock(tripId, user.id, async (tx) => {
    const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId } });
    if (!isDateInTrip(plannedDate, trip.startDate, trip.endDate)) {
      throw new FormValidationError({ plannedDate: "Choose a climbing date within the trip dates, or update the trip dates first." });
    }
    const updated = await tx.tripStop.updateMany({ where: { id: stopId, tripId }, data: { notes: notes ?? null, plannedDate } });
    if (!updated.count) throw new FormValidationError({ form: "This stop was removed. Refresh the trip to continue." });
    await tx.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    return true;
  });
  if (!result) redirect("/trips");
  revalidateTrip(tripId);
}

export async function removeStopAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const stopId = z.string().cuid().parse(formData.get("stopId"));
  const result = await withTripLock(tripId, user.id, async (tx) => {
    await tx.tripStop.deleteMany({ where: { id: stopId, tripId } });
    const stops = await tx.tripStop.findMany({ where: { tripId }, orderBy: [{ order: "asc" }, { id: "asc" }] });
    for (const [index, stop] of stops.entries()) {
      await tx.tripStop.update({ where: { id: stop.id }, data: { order: index + 1 } });
    }
    await tx.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    return true;
  });
  if (!result) redirect("/trips");
  revalidateTrip(tripId);
}

export async function moveStopAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const stopId = z.string().cuid().parse(formData.get("stopId"));
  const direction = moveDirectionSchema.parse(formData.get("direction"));
  const result = await withTripLock(tripId, user.id, async (tx) => {
    const stops = await tx.tripStop.findMany({ where: { tripId }, orderBy: [{ order: "asc" }, { id: "asc" }] });
    const currentIndex = stops.findIndex(stop => stop.id === stopId);
    const targetIndex = adjacentStopIndex(stops, stopId, direction);
    if (currentIndex >= 0 && targetIndex >= 0 && targetIndex < stops.length) {
      [stops[currentIndex], stops[targetIndex]] = [stops[targetIndex], stops[currentIndex]];
      for (const [index, stop] of stops.entries()) {
        await tx.tripStop.update({ where: { id: stop.id }, data: { order: index + 1 } });
      }
      await tx.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    }
    return true;
  });
  if (!result) redirect("/trips");
  revalidateTrip(tripId);
}

export async function selectCampgroundAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const stopId = z.string().cuid().parse(formData.get("stopId"));
  const campgroundId = z.string().cuid().nullable().parse(formData.get("campgroundId") || null);
  const result = await withTripLock(tripId, user.id, async (tx) => {
    const stop = await tx.tripStop.findFirst({ where: { id: stopId, tripId } });
    if (!stop) throw new FormValidationError({ form: "This stop was removed. Refresh the trip to continue." });
    if (campgroundId) {
      const link = await tx.areaCampgroundLink.findUnique({ where: {
        climbingAreaId_campgroundId: { climbingAreaId: stop.climbingAreaId, campgroundId },
        reviewStatus: "reviewed", campground: { reviewStatus: "reviewed" }, climbingArea: { reviewStatus: "reviewed" }
      } });
      if (!link) throw new FormValidationError({ form: "This camping option is no longer reviewed. Choose another camp." });
    }
    await tx.tripStop.update({ where: { id: stopId }, data: { selectedCampgroundId: campgroundId } });
    await tx.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    return true;
  });
  if (!result) redirect("/trips");
  revalidateTrip(tripId);
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

async function tripForm(action: (form: FormData) => Promise<void>, form: FormData, message: string): Promise<FormState> {
  try {
    await action(form);
    return { success: true, message };
  } catch (error) {
    unstable_rethrow(error);
    const state = validationState(error);
    if (state) return state;
    await reportOperationalEvent({ event: "trip.save.failed", route: "/trips/[id]" });
    return { errors: { form: "We couldn’t save your changes. Your input is still here; please try again." } };
  }
}

export async function createTripFormAction(form: FormData) { return tripForm(createTripAction, form, "Trip created."); }
export async function updateTripFormAction(form: FormData) { return tripForm(updateTripAction, form, "Trip saved."); }
export async function addStopFormAction(form: FormData) { return tripForm(addStopAction, form, "Stop added."); }
export async function updateStopFormAction(form: FormData) { return tripForm(updateStopNotesAction, form, "Stop saved."); }
export async function selectCampgroundFormAction(form: FormData) { return tripForm(selectCampgroundAction, form, form.get("campgroundId") ? "Camp selected." : "Camp selection cleared."); }
export async function removeStopFormAction(form: FormData) { return tripForm(removeStopAction, form, "Stop removed."); }
export async function moveStopFormAction(form: FormData) { return tripForm(moveStopAction, form, "Stop moved."); }

