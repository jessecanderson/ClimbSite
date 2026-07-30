"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { importHierarchy, suggestedImportTarget } from "@/lib/import-matching";
import { prisma } from "@/lib/prisma";

const emailSchema = z.string().email();
const authProviderSchema = z.enum(["google", "apple"]);
const candidateStatusSchema = z.enum(["PENDING", "IGNORED", "NEEDS_RESEARCH"]);
const tripSchema = z.object({
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(1000).optional()
});
const stopNotesSchema = z.string().trim().max(500).optional();
const moveDirectionSchema = z.enum(["up", "down"]);

function safeRedirectPath(value: FormDataEntryValue | null, fallback = "/trips") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function loginAction(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const magicLinkEnabled = Boolean(process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM);
  const emailFallbackEnabled =
    process.env.AUTH_EMAIL_FALLBACK === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.AUTH_EMAIL_FALLBACK !== "false");

  if (!magicLinkEnabled && !emailFallbackEnabled) {
    redirect("/login");
  }

  const provider =
    magicLinkEnabled ? "resend" : "email-fallback";

  await signIn(provider, { email, redirectTo });
}

export async function oauthLoginAction(formData: FormData) {
  const provider = authProviderSchema.parse(formData.get("provider"));
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  await signIn(provider, { redirectTo });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function createTripAction(formData: FormData) {
  const user = await requireUser();
  const sourceAreas = z
    .array(
      z
        .string()
        .regex(/^[a-z0-9-]+$/)
    )
    .max(20)
    .parse(formData.getAll("sourceArea"));
  const sourceHub = z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .parse(formData.get("sourceHub") || undefined);
  const climbingAreaIds = [
    ...new Set(z.array(z.string().cuid()).max(20).parse(formData.getAll("climbingAreaId")))
  ];
  const data = tripSchema.parse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined
  });
  const startDate = parseDateInput(formData.get("startDate"));
  const endDate = parseDateInput(formData.get("endDate"));

  if (startDate && endDate && endDate < startDate) {
    const params = new URLSearchParams({ error: "date-order" });
    sourceAreas.forEach((slug) => params.append("area", slug));
    if (sourceHub) params.set("hub", sourceHub);
    redirect(`/trips/new?${params.toString()}`);
  }

  const selectedAreas = climbingAreaIds.length
    ? await prisma.climbingArea.findMany({
        where: { id: { in: climbingAreaIds } },
        select: { id: true }
      })
    : [];

  if (selectedAreas.length !== climbingAreaIds.length) {
    redirect("/trips/new");
  }

  const trip = selectedAreas.length
    ? await prisma.trip.create({
        data: {
          name: data.name,
          notes: data.notes,
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
          notes: data.notes,
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
  const data = tripSchema.parse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined
  });
  const startDate = parseDateInput(formData.get("startDate"));
  const endDate = parseDateInput(formData.get("endDate"));

  if (startDate && endDate && endDate < startDate) {
    redirect(`/trips/${tripId}?error=date-order`);
  }

  const result = await prisma.trip.updateMany({
    where: {
      id: tripId,
      userId: user.id
    },
    data: {
      name: data.name,
      notes: data.notes,
      startDate,
      endDate,
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

  if (trip.stops.some((stop) => stop.climbingAreaId === climbingAreaId)) {
    redirect(`/trips/${tripId}?notice=duplicate-area#add-stop`);
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
  const plannedDate = parseDateInput(formData.get("plannedDate"));

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
    data: { notes, plannedDate }
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

export async function moveStopAction(formData: FormData) {
  const user = await requireUser();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const stopId = z.string().cuid().parse(formData.get("stopId"));
  const direction = moveDirectionSchema.parse(formData.get("direction"));

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: user.id },
    include: { stops: { orderBy: { order: "asc" } } }
  });

  if (!trip) {
    redirect("/trips");
  }

  const currentIndex = trip.stops.findIndex((stop) => stop.id === stopId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= trip.stops.length) {
    redirect(`/trips/${tripId}`);
  }

  const current = trip.stops[currentIndex];
  const target = trip.stops[targetIndex];

  await prisma.$transaction([
    prisma.tripStop.update({ where: { id: current.id }, data: { order: target.order } }),
    prisma.tripStop.update({ where: { id: target.id }, data: { order: current.order } }),
    prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } })
  ]);

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
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

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([label, detail]) => {
        if (Array.isArray(detail)) {
          const values = detail.filter((item) => typeof item === "string" && item.trim());
          return values.length ? [`${label}: ${values.join(", ")}`] : [];
        }

        if (typeof detail === "string" && detail.trim()) return [`${label}: ${detail.trim()}`];
        if (typeof detail === "boolean") return [`${label}: ${detail ? "Yes" : "No"}`];
        return [];
      })
      .join("; ");
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

export async function autoLinkImportCandidatesAction() {
  await requireAdmin();
  const [candidates, references, campgrounds, climbingAreas] = await Promise.all([
    prisma.importCandidate.findMany({ where: { status: "PENDING" } }),
    prisma.externalReference.findMany(),
    prisma.campground.findMany({ select: { id: true, name: true, lat: true, lng: true } }),
    prisma.climbingArea.findMany({ select: { id: true, name: true, lat: true, lng: true } })
  ]);
  const referenceByKey = new Map(
    references.map((reference) => [
      `${reference.sourceId}:${reference.entityType}:${reference.externalId}`,
      reference
    ])
  );
  const matches = candidates.flatMap((candidate) => {
    const reference = referenceByKey.get(
      `${candidate.sourceId}:${candidate.entityType}:${candidate.externalId}`
    );
    const referencedTargetId =
      candidate.entityType === "CAMPGROUND"
        ? reference?.campgroundId
        : reference?.climbingAreaId;
    const suggested = referencedTargetId
      ? null
      : suggestedImportTarget(
          candidate,
          candidate.entityType === "CAMPGROUND" ? campgrounds : climbingAreas
        );
    const targetId = referencedTargetId ?? suggested?.target.id;

    return targetId ? [{ candidate, targetId }] : [];
  });

  await prisma.$transaction(async (tx) => {
    for (const { candidate, targetId } of matches) {
      await tx.externalReference.upsert({
        where: {
          sourceId_entityType_externalId: {
            sourceId: candidate.sourceId,
            entityType: candidate.entityType,
            externalId: candidate.externalId
          }
        },
        update: {
          sourceUrl: candidate.sourceUrl,
          campgroundId: candidate.entityType === "CAMPGROUND" ? targetId : null,
          climbingAreaId: candidate.entityType === "CLIMBING_AREA" ? targetId : null
        },
        create: {
          sourceId: candidate.sourceId,
          entityType: candidate.entityType,
          externalId: candidate.externalId,
          sourceUrl: candidate.sourceUrl,
          campgroundId: candidate.entityType === "CAMPGROUND" ? targetId : null,
          climbingAreaId: candidate.entityType === "CLIMBING_AREA" ? targetId : null
        }
      });
      await tx.importCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "LINKED",
          matchedCampgroundId: candidate.entityType === "CAMPGROUND" ? targetId : null,
          matchedAreaId: candidate.entityType === "CLIMBING_AREA" ? targetId : null
        }
      });
    }
  });

  revalidatePath("/admin/imports");
}

export async function undoAcceptImportCandidateAction(formData: FormData) {
  await requireAdmin();
  const candidateId = z.string().cuid().parse(formData.get("candidateId"));

  await prisma.$transaction(async (tx) => {
    const candidate = await tx.importCandidate.findUniqueOrThrow({
      where: { id: candidateId },
      include: {
        matchedArea: { include: { _count: { select: { hubLinks: true, campgroundLinks: true, tripStops: true } } } },
        matchedCampground: { include: { _count: { select: { hubLinks: true, areaLinks: true, selectedStops: true } } } }
      }
    });

    if (candidate.status !== "ACCEPTED") throw new Error("Only accepted drafts can be undone.");

    if (candidate.matchedArea) {
      const area = candidate.matchedArea;
      const hasDependencies = area._count.hubLinks + area._count.campgroundLinks + area._count.tripStops > 0;
      const wasEdited = area.updatedAt.getTime() - area.createdAt.getTime() > 1000;
      if (area.sourceType !== "imported" || area.reviewStatus !== "needs_review" || hasDependencies || wasEdited) {
        throw new Error("This draft has been edited or linked and can no longer be safely undone.");
      }
      await tx.importCandidate.update({ where: { id: candidate.id }, data: { status: "PENDING", matchedAreaId: null } });
      await tx.climbingArea.delete({ where: { id: area.id } });
    } else if (candidate.matchedCampground) {
      const campground = candidate.matchedCampground;
      const hasDependencies = campground._count.hubLinks + campground._count.areaLinks + campground._count.selectedStops > 0;
      const wasEdited = campground.updatedAt.getTime() - campground.createdAt.getTime() > 1000;
      if (campground.sourceType !== "imported" || campground.reviewStatus !== "needs_review" || hasDependencies || wasEdited) {
        throw new Error("This draft has been edited or linked and can no longer be safely undone.");
      }
      await tx.importCandidate.update({ where: { id: candidate.id }, data: { status: "PENDING", matchedCampgroundId: null } });
      await tx.campground.delete({ where: { id: campground.id } });
    } else {
      throw new Error("The accepted draft is missing its target record.");
    }
  });

  revalidatePath("/admin/imports");
  revalidatePath("/admin/content");
}

async function acceptImportCandidateAsDraft(candidateId: string) {
  const candidate = await prisma.importCandidate.findUniqueOrThrow({
    where: { id: candidateId }
  });

  if (candidate.status !== "PENDING") return;

  if (candidate.lat === null || candidate.lng === null) {
    await prisma.importCandidate.update({
      where: { id: candidateId },
      data: { status: "NEEDS_RESEARCH" }
    });
    return;
  }

  const mapped = mappedObject(candidate.mappedPayload);
  const sourceName = optionalString(mapped.sourceName, "Imported source");
  const sourceUrl = optionalString(mapped.sourceUrl, candidate.sourceUrl ?? "");

  if (candidate.entityType === "CLIMBING_AREA" && importHierarchy(mapped).parentName) {
    await prisma.importCandidate.update({
      where: { id: candidateId },
      data: { status: "NEEDS_RESEARCH" }
    });
    return;
  }

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

}

export async function acceptImportCandidateAction(formData: FormData) {
  await requireAdmin();
  const candidateId = z.string().cuid().parse(formData.get("candidateId"));
  await acceptImportCandidateAsDraft(candidateId);
  revalidatePath("/admin/imports");
  revalidatePath("/areas");
  revalidatePath("/hubs");
}

export async function createStandaloneImportDraftsAction() {
  await requireAdmin();
  const [candidates, references, campgrounds, climbingAreas] = await Promise.all([
    prisma.importCandidate.findMany({ where: { status: "PENDING" } }),
    prisma.externalReference.findMany(),
    prisma.campground.findMany({ select: { id: true, name: true, lat: true, lng: true } }),
    prisma.climbingArea.findMany({ select: { id: true, name: true, lat: true, lng: true } })
  ]);
  const referenceKeys = new Set(
    references
      .filter((reference) => reference.campgroundId || reference.climbingAreaId)
      .map((reference) => `${reference.sourceId}:${reference.entityType}:${reference.externalId}`)
  );
  const safeCandidates = candidates.filter((candidate) => {
    if (candidate.lat === null || candidate.lng === null) return false;
    if (candidate.entityType === "CLIMBING_AREA" && importHierarchy(candidate.mappedPayload).parentName) {
      return false;
    }
    if (referenceKeys.has(`${candidate.sourceId}:${candidate.entityType}:${candidate.externalId}`)) {
      return false;
    }
    return !suggestedImportTarget(
      candidate,
      candidate.entityType === "CAMPGROUND" ? campgrounds : climbingAreas
    );
  });

  for (const candidate of safeCandidates.slice(0, 20)) {
    await acceptImportCandidateAsDraft(candidate.id);
  }

  revalidatePath("/admin/imports");
  revalidatePath("/admin/content");
  revalidatePath("/areas");
  revalidatePath("/hubs");
}

const editorialIntentSchema = z.enum(["save", "publish", "unpublish"]);

function formText(formData: FormData, name: string, max = 5000) {
  return z.string().trim().min(1).max(max).parse(formData.get(name));
}

function optionalFormText(formData: FormData, name: string, max = 2000) {
  const value = formData.get(name);
  return value ? z.string().trim().max(max).parse(value) || null : null;
}

function formCoordinate(formData: FormData, name: "lat" | "lng") {
  const range = name === "lat" ? [-90, 90] : [-180, 180];
  return z.coerce.number().min(range[0]).max(range[1]).parse(formData.get(name));
}

function editorialStatus(intent: z.infer<typeof editorialIntentSchema>) {
  return intent === "publish" ? "reviewed" : intent === "unpublish" ? "needs_review" : undefined;
}

function hasEditorialPlaceholders(values: string[]) {
  return values.some((value) => /needs review|imported .*candidate/i.test(value));
}

function revalidatePublicContent() {
  revalidatePath("/");
  revalidatePath("/areas");
  revalidatePath("/hubs");
  revalidatePath("/trips");
}

export async function saveAreaContentAction(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().optional().parse(formData.get("id") || undefined);
  const intent = editorialIntentSchema.parse(formData.get("intent"));
  const name = formText(formData, "name", 120);
  const region = formText(formData, "region", 120);
  const summary = formText(formData, "summary", 2000);
  const bestFor = formText(formData, "bestFor", 300);
  const approach = formText(formData, "approach", 2000);
  const parking = formText(formData, "parking", 2000);
  const roadDifficulty = formText(formData, "roadDifficulty", 300);
  const approachMinutes = z.coerce
    .number()
    .int()
    .min(0)
    .max(1440)
    .optional()
    .parse(formData.get("approachMinutes") || undefined);
  const sourceName = optionalFormText(formData, "sourceName", 200);
  const sourceUrl = optionalFormText(formData, "sourceUrl", 2000);
  if (sourceUrl) z.string().url().parse(sourceUrl);

  if (intent === "publish") {
    if (hasEditorialPlaceholders([summary, bestFor, approach, parking, roadDifficulty])) {
      redirect("/admin/content?type=area&status=needs_review&error=placeholder");
    }
    if (!sourceUrl) {
      redirect("/admin/content?type=area&status=needs_review&error=source-required");
    }
  }

  const status = editorialStatus(intent);
  const data = {
    name,
    region,
    summary,
    bestFor,
    approach,
    approachMinutes: approachMinutes ?? null,
    parking,
    roadDifficulty,
    lat: formCoordinate(formData, "lat"),
    lng: formCoordinate(formData, "lng"),
    sourceName,
    sourceUrl,
    ...(status ? { reviewStatus: status, lastReviewedAt: status === "reviewed" ? new Date() : null } : {})
  };

  if (id) {
    await prisma.climbingArea.update({ where: { id }, data });
  } else {
    await prisma.climbingArea.create({
      data: { ...data, slug: await uniqueSlug("climbingArea", name), sourceType: "curated", reviewStatus: status ?? "needs_review" }
    });
  }

  revalidatePath("/admin/content");
  revalidatePublicContent();
  redirect(`/admin/content?type=area&status=${status ?? "all"}&notice=area-saved`);
}

export async function saveCampgroundContentAction(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().optional().parse(formData.get("id") || undefined);
  const intent = editorialIntentSchema.parse(formData.get("intent"));
  const name = formText(formData, "name", 120);
  const type = formText(formData, "type", 200);
  const summary = formText(formData, "summary", 2000);
  const amenities = formText(formData, "amenities", 3000);
  const campingFit = formText(formData, "campingFit", 2000);
  const reservationUrl = optionalFormText(formData, "reservationUrl", 2000);
  const sourceName = optionalFormText(formData, "sourceName", 200);
  const sourceUrl = optionalFormText(formData, "sourceUrl", 2000);
  if (reservationUrl) z.string().url().parse(reservationUrl);
  if (sourceUrl) z.string().url().parse(sourceUrl);

  if (intent === "publish") {
    if (hasEditorialPlaceholders([summary, amenities, campingFit])) {
      redirect("/admin/content?type=campground&status=needs_review&error=placeholder");
    }
    if (!sourceUrl && !reservationUrl) {
      redirect("/admin/content?type=campground&status=needs_review&error=source-required");
    }
  }

  const status = editorialStatus(intent);
  const data = {
    name,
    type,
    summary,
    amenities,
    campingFit,
    reservationUrl,
    sourceName,
    sourceUrl,
    lat: formCoordinate(formData, "lat"),
    lng: formCoordinate(formData, "lng"),
    ...(status ? { reviewStatus: status, lastReviewedAt: status === "reviewed" ? new Date() : null } : {})
  };

  if (id) {
    await prisma.campground.update({ where: { id }, data });
  } else {
    await prisma.campground.create({
      data: { ...data, slug: await uniqueSlug("campground", name), sourceType: "curated", reviewStatus: status ?? "needs_review" }
    });
  }

  revalidatePath("/admin/content");
  revalidatePublicContent();
  redirect(`/admin/content?type=campground&status=${status ?? "all"}&notice=campground-saved`);
}

export async function saveAreaCampgroundLinkAction(formData: FormData) {
  await requireAdmin();
  const climbingAreaId = z.string().cuid().parse(formData.get("climbingAreaId"));
  const campgroundId = z.string().cuid().parse(formData.get("campgroundId"));
  const intent = editorialIntentSchema.parse(formData.get("intent"));
  const logisticsNote = formText(formData, "logisticsNote", 2000);
  const miles = z.coerce.number().min(0).max(1000).parse(formData.get("miles"));
  const driveMinutes = z.coerce.number().int().min(0).max(1440).parse(formData.get("driveMinutes"));
  const rank = z.coerce.number().int().min(0).max(1000).parse(formData.get("rank"));

  if (intent === "publish") {
    if (hasEditorialPlaceholders([logisticsNote])) {
      redirect("/admin/content?type=link&status=needs_review&error=placeholder");
    }
    const [area, campground] = await Promise.all([
      prisma.climbingArea.findUnique({ where: { id: climbingAreaId }, select: { reviewStatus: true } }),
      prisma.campground.findUnique({ where: { id: campgroundId }, select: { reviewStatus: true } })
    ]);
    if (area?.reviewStatus !== "reviewed" || campground?.reviewStatus !== "reviewed") {
      redirect("/admin/content?type=link&status=needs_review&error=endpoints-not-reviewed");
    }
  }

  const status = editorialStatus(intent);
  await prisma.areaCampgroundLink.upsert({
    where: { climbingAreaId_campgroundId: { climbingAreaId, campgroundId } },
    update: {
      miles,
      driveMinutes,
      logisticsNote,
      rank,
      ...(status ? { reviewStatus: status, lastReviewedAt: status === "reviewed" ? new Date() : null } : {})
    },
    create: {
      climbingAreaId,
      campgroundId,
      miles,
      driveMinutes,
      logisticsNote,
      rank,
      sourceType: "curated",
      reviewStatus: status ?? "needs_review",
      lastReviewedAt: status === "reviewed" ? new Date() : null
    }
  });

  revalidatePath("/admin/content");
  revalidatePublicContent();
  redirect("/admin/content?type=link&status=all&notice=link-saved");
}
