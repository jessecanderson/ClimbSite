"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const emailSchema = z.string().email();
const tripSchema = z.object({
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(1000).optional()
});

async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function loginAction(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  await createSession(email);
  redirect("/trips");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function createTripAction(formData: FormData) {
  const user = await requireUser();
  const data = tripSchema.parse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined
  });

  const trip = await prisma.trip.create({
    data: {
      name: data.name,
      notes: data.notes,
      userId: user.id
    }
  });

  redirect(`/trips/${trip.id}`);
}

export async function addStopAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const climbingAreaId = z.string().cuid().parse(formData.get("climbingAreaId"));
  const notes = z.string().trim().max(500).optional().parse(formData.get("notes") || undefined);

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: user.id },
    include: { stops: true }
  });

  if (!trip) {
    redirect("/trips");
  }

  await prisma.tripStop.create({
    data: {
      tripId,
      climbingAreaId,
      notes,
      order: trip.stops.length + 1
    }
  });

  await prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
  revalidatePath(`/trips/${tripId}`);
}

export async function removeStopAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const stopId = z.string().cuid().parse(formData.get("stopId"));

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: user.id },
    include: { stops: { orderBy: { order: "asc" } } }
  });

  if (!trip) {
    redirect("/trips");
  }

  await prisma.tripStop.deleteMany({ where: { id: stopId, tripId } });

  const remainingStops = await prisma.tripStop.findMany({
    where: { tripId },
    orderBy: { order: "asc" }
  });

  await prisma.$transaction(
    remainingStops.map((stop, index) =>
      prisma.tripStop.update({
        where: { id: stop.id },
        data: { order: index + 1 }
      })
    )
  );

  await prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
  revalidatePath(`/trips/${tripId}`);
}

export async function selectCampgroundAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const stopId = z.string().cuid().parse(formData.get("stopId"));
  const campgroundId = z.string().cuid().parse(formData.get("campgroundId"));

  const stop = await prisma.tripStop.findFirst({
    where: {
      id: stopId,
      tripId,
      trip: { userId: user.id }
    },
    include: { climbingArea: true }
  });

  if (!stop) {
    redirect("/trips");
  }

  const linkedCampground = await prisma.areaCampgroundLink.findUnique({
    where: {
      climbingAreaId_campgroundId: {
        climbingAreaId: stop.climbingAreaId,
        campgroundId
      }
    }
  });

  if (!linkedCampground) {
    redirect(`/trips/${tripId}`);
  }

  await prisma.tripStop.update({
    where: { id: stopId },
    data: { selectedCampgroundId: campgroundId }
  });

  await prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
  revalidatePath(`/trips/${tripId}`);
}
