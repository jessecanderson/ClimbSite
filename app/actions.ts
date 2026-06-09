"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const emailSchema = z.string().email();
const authProviderSchema = z.enum(["google", "apple"]);
const candidateStatusSchema = z.enum(["IGNORED", "NEEDS_RESEARCH"]);
const tripSchema = z.object({
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(1000).optional()
});
const stopNotesSchema = z.string().trim().max(500).optional();

async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function loginAction(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  const provider =
    process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM ? "resend" : "email-fallback";

  await signIn(provider, { email, redirectTo: "/trips" });
}

export async function oauthLoginAction(formData: FormData) {
  const provider = authProviderSchema.parse(formData.get("provider"));
  await signIn(provider, { redirectTo: "/trips" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
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
  const data = tripSchema.parse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined
  });

  const result = await prisma.trip.updateMany({
    where: {
      id: tripId,
      userId: user.id
    },
    data: {
      name: data.name,
      notes: data.notes,
      updatedAt: new Date()
    }
  });

  if (result.count === 0) {
    redirect("/trips");
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
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

export async function updateStopNotesAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const stopId = z.string().cuid().parse(formData.get("stopId"));
  const notes = stopNotesSchema.parse(formData.get("notes") || undefined);

  const stop = await prisma.tripStop.findFirst({
    where: {
      id: stopId,
      tripId,
      trip: { userId: user.id }
    }
  });

  if (!stop) {
    redirect("/trips");
  }

  await prisma.tripStop.update({
    where: { id: stopId },
    data: { notes }
  });
  await prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(model: "campground" | "climbingArea", name: string) {
  const base = slugify(name) || "imported-record";
  let candidate = base;
  let suffix = 2;

  while (
    model === "campground"
      ? await prisma.campground.findUnique({ where: { slug: candidate } })
      : await prisma.climbingArea.findUnique({ where: { slug: candidate } })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function mappedObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function optionalString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function amenitiesText(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).join("; ");
  }

  return optionalString(value, "Needs review from source details.");
}

async function createExternalReference(candidateId: string, entityId: string) {
  const candidate = await prisma.importCandidate.findUniqueOrThrow({
    where: { id: candidateId }
  });

  await prisma.externalReference.upsert({
    where: {
      sourceId_entityType_externalId: {
        sourceId: candidate.sourceId,
        entityType: candidate.entityType,
        externalId: candidate.externalId
      }
    },
    update: {
      sourceUrl: candidate.sourceUrl,
      campgroundId: candidate.entityType === "CAMPGROUND" ? entityId : null,
      climbingAreaId: candidate.entityType === "CLIMBING_AREA" ? entityId : null
    },
    create: {
      sourceId: candidate.sourceId,
      entityType: candidate.entityType,
      externalId: candidate.externalId,
      sourceUrl: candidate.sourceUrl,
      campgroundId: candidate.entityType === "CAMPGROUND" ? entityId : null,
      climbingAreaId: candidate.entityType === "CLIMBING_AREA" ? entityId : null
    }
  });

  return candidate;
}

export async function updateImportCandidateStatusAction(formData: FormData) {
  await requireAdmin();
  const candidateId = z.string().cuid().parse(formData.get("candidateId"));
  const status = candidateStatusSchema.parse(formData.get("status"));

  await prisma.importCandidate.update({
    where: { id: candidateId },
    data: { status }
  });

  revalidatePath("/admin/imports");
}

export async function linkImportCandidateAction(formData: FormData) {
  await requireAdmin();
  const candidateId = z.string().cuid().parse(formData.get("candidateId"));
  const targetId = z.string().cuid().parse(formData.get("targetId"));
  const candidate = await createExternalReference(candidateId, targetId);

  await prisma.importCandidate.update({
    where: { id: candidateId },
    data: {
      status: "LINKED",
      matchedCampgroundId: candidate.entityType === "CAMPGROUND" ? targetId : null,
      matchedAreaId: candidate.entityType === "CLIMBING_AREA" ? targetId : null
    }
  });

  revalidatePath("/admin/imports");
}

export async function acceptImportCandidateAction(formData: FormData) {
  await requireAdmin();
  const candidateId = z.string().cuid().parse(formData.get("candidateId"));
  const candidate = await prisma.importCandidate.findUniqueOrThrow({
    where: { id: candidateId }
  });

  if (candidate.lat === null || candidate.lng === null) {
    await prisma.importCandidate.update({
      where: { id: candidateId },
      data: { status: "NEEDS_RESEARCH" }
    });
    revalidatePath("/admin/imports");
    return;
  }

  const mapped = mappedObject(candidate.mappedPayload);
  const sourceName = optionalString(mapped.sourceName, "Imported source");
  const sourceUrl = optionalString(mapped.sourceUrl, candidate.sourceUrl ?? "");

  if (candidate.entityType === "CAMPGROUND") {
    const campground = await prisma.campground.create({
      data: {
        slug: await uniqueSlug("campground", candidate.name),
        name: candidate.name,
        type: optionalString(mapped.type, "Campground"),
        summary: optionalString(mapped.summary, "Imported campground candidate. Needs editorial review."),
        amenities: amenitiesText(mapped.amenities),
        campingFit: "Imported campground candidate. Review fit for climbers before relying on this option.",
        reservationUrl: optionalString(mapped.reservationUrl, sourceUrl),
        sourceName,
        sourceUrl,
        lat: candidate.lat,
        lng: candidate.lng,
        sourceType: "imported",
        reviewStatus: "needs_review"
      }
    });

    await createExternalReference(candidateId, campground.id);
    await prisma.importCandidate.update({
      where: { id: candidateId },
      data: {
        status: "ACCEPTED",
        matchedCampgroundId: campground.id
      }
    });
  } else {
    const area = await prisma.climbingArea.create({
      data: {
        slug: await uniqueSlug("climbingArea", candidate.name),
        name: candidate.name,
        region: candidate.region ?? "Needs review",
        summary: optionalString(mapped.summary, "Imported climbing area candidate. Needs editorial review."),
        bestFor: optionalString(mapped.bestFor, "Climbing area"),
        approach: optionalString(mapped.approach, "Needs review from source and local access information."),
        approachMinutes: null,
        parking: optionalString(mapped.parking, "Needs review from source and local access information."),
        roadDifficulty: optionalString(mapped.roadDifficulty, "Needs review"),
        lat: candidate.lat,
        lng: candidate.lng,
        sourceType: "imported",
        reviewStatus: "needs_review",
        sourceName,
        sourceUrl
      }
    });

    await createExternalReference(candidateId, area.id);
    await prisma.importCandidate.update({
      where: { id: candidateId },
      data: {
        status: "ACCEPTED",
        matchedAreaId: area.id
      }
    });
  }

  revalidatePath("/admin/imports");
  revalidatePath("/areas");
  revalidatePath("/hubs");
}
