"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { importHierarchy, isImportCandidateInScope, suggestedImportTarget } from "@/lib/import-matching";
import { prisma } from "@/lib/prisma";
import { runSourceSyncProfile, sourceRunnerOptions } from "@/lib/source-sync-runner";


const candidateStatusSchema = z.enum(["PENDING", "IGNORED", "NEEDS_RESEARCH"]);
const sourceRunnerSchema = z.enum(sourceRunnerOptions);
import { uniqueSlug } from "@/lib/editorial-slugs";

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

export async function acknowledgeImportSyncAction(formData: FormData) {
  await requireAdmin();
  const candidateId = z.string().cuid().parse(formData.get("candidateId"));

  await prisma.$transaction(async (tx) => {
    const candidate = await tx.importCandidate.findUniqueOrThrow({ where: { id: candidateId } });
    await tx.externalReference.updateMany({
      where: {
        sourceId: candidate.sourceId,
        entityType: candidate.entityType,
        externalId: candidate.externalId
      },
      data: { sourceUrl: candidate.sourceUrl }
    });
    await tx.importCandidate.update({
      where: { id: candidate.id },
      data: {
        syncStatus: "UNCHANGED",
        previousRawPayload: Prisma.DbNull,
        previousMappedPayload: Prisma.DbNull,
        syncChangedFields: [],
        syncReason: "Source changes reviewed; canonical editorial fields were preserved.",
        syncDecisionMethod: "admin",
        syncConfidence: 1
      }
    });
  });

  revalidatePath("/admin/imports");
}

export async function acknowledgeNonReviewSyncsAction() {
  await requireAdmin();
  await prisma.importCandidate.updateMany({
    where: { syncStatus: "CHANGED", status: { in: ["IGNORED", "PENDING", "NEEDS_RESEARCH"] } },
    data: {
      syncStatus: "UNCHANGED",
      syncChangedFields: [],
      syncReason: "Non-linked source changes acknowledged; the prior import decision was preserved.",
      syncDecisionMethod: "policy",
      syncConfidence: 1
    }
  });
  revalidatePath("/admin/imports");
}

export async function createSourceSyncProfileAction(formData: FormData) {
  await requireAdmin();
  const runner = sourceRunnerSchema.parse(formData.get("runner"));
  const state = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional().parse(formData.get("state") || undefined);
  const terms = z.string().trim().max(2000).optional().parse(formData.get("terms") || undefined)?.split("|").map((term) => term.trim()).filter(Boolean);
  const refreshIntervalDays = z.coerce.number().int().min(7).max(365).optional().parse(formData.get("refreshIntervalDays") || undefined)
    ?? (runner.includes("CAMPGROUNDS") ? 60 : 90);
  if (runner === "OPENBETA_AREAS" && !terms?.length) throw new Error("OpenBeta profiles require pipe-separated destination terms.");
  if (runner !== "OPENBETA_AREAS" && !state) throw new Error("State is required for this bounded source profile.");

  const params = runner === "RIDB_CAMPGROUNDS"
    ? { query: "campground", state, limit: 50, offset: 0, maxPages: 1 }
    : runner === "RIDB_CLIMBING_AREAS"
      ? { state, activityIds: ["7", "100041", "100040", "100035"], limit: 50, offset: 0, maxPages: 1 }
      : runner === "NPS_CAMPGROUNDS"
        ? { state, limit: 50, maxPages: 1 }
        : { terms, state, limit: 5, includeChildren: true };
  const scope = state ?? terms!.join("|").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);

  await prisma.sourceSyncProfile.upsert({
    where: { key: `${runner}:${scope}` },
    update: { params, enabled: true, refreshIntervalDays },
    create: {
      key: `${runner}:${scope}`,
      name: `${runner.replaceAll("_", " ").toLowerCase()} · ${state ?? terms!.join(", ")}`,
      runner,
      entityType: runner.includes("CAMPGROUNDS") ? "CAMPGROUND" : "CLIMBING_AREA",
      refreshIntervalDays,
      params
    }
  });
  revalidatePath("/admin/imports");
}

export async function runSourceSyncProfileAction(formData: FormData) {
  await requireAdmin();
  const profileId = z.string().cuid().parse(formData.get("profileId"));
  await runSourceSyncProfile(profileId);
  revalidatePath("/admin/imports");
}

export async function toggleSourceSyncProfileAction(formData: FormData) {
  await requireAdmin();
  const profileId = z.string().cuid().parse(formData.get("profileId"));
  const enabled = z.enum(["true", "false"]).transform((value) => value === "true").parse(formData.get("enabled"));
  await prisma.sourceSyncProfile.update({ where: { id: profileId }, data: { enabled } });
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

async function autoLinkPendingImportCandidates() {
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
    const targetId = referencedTargetId ?? (suggested?.reason === "direct" ? suggested.target.id : null);

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

  return matches.length;
}

export async function autoLinkImportCandidatesAction() {
  await requireAdmin();
  await autoLinkPendingImportCandidates();
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

  let parentAreaId: string | null = null;
  if (candidate.entityType === "CLIMBING_AREA" && importHierarchy(mapped).parentName) {
    const areas = await prisma.climbingArea.findMany({
      where: { parentAreaId: null },
      select: { id: true, name: true, lat: true, lng: true }
    });
    const parentMatch = suggestedImportTarget(candidate, areas);
    if (parentMatch?.reason !== "parent") {
      await prisma.importCandidate.update({
        where: { id: candidateId },
        data: { status: "NEEDS_RESEARCH" }
      });
      return;
    }
    parentAreaId = parentMatch.target.id;
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
        sourceUrl,
        parentAreaId
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

async function createStandaloneImportDrafts(limit = 20) {
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
    if (!isImportCandidateInScope(candidate)) return false;
    if (referenceKeys.has(`${candidate.sourceId}:${candidate.entityType}:${candidate.externalId}`)) {
      return false;
    }
    const suggestion = suggestedImportTarget(
      candidate,
      candidate.entityType === "CAMPGROUND" ? campgrounds : climbingAreas
    );
    if (candidate.entityType === "CLIMBING_AREA" && importHierarchy(candidate.mappedPayload).parentName) {
      return suggestion?.reason === "parent";
    }
    return !suggestion;
  });

  for (const candidate of safeCandidates.slice(0, limit)) {
    await acceptImportCandidateAsDraft(candidate.id);
  }

  return Math.min(safeCandidates.length, limit);
}

export async function createStandaloneImportDraftsAction() {
  await requireAdmin();
  await createStandaloneImportDrafts();

  revalidatePath("/admin/imports");
  revalidatePath("/admin/content");
  revalidatePath("/areas");
  revalidatePath("/hubs");
}

export async function processImportCandidatesAction() {
  await requireAdmin();
  const pending = await prisma.importCandidate.findMany({ where: { status: "PENDING" } });
  const outOfScopeIds = pending
    .filter((candidate) => !isImportCandidateInScope(candidate))
    .map((candidate) => candidate.id);

  if (outOfScopeIds.length) {
    await prisma.importCandidate.updateMany({
      where: { id: { in: outOfScopeIds }, status: "PENDING" },
      data: { status: "IGNORED" }
    });
  }

  await autoLinkPendingImportCandidates();
  await createStandaloneImportDrafts(Number.POSITIVE_INFINITY);
  await autoLinkPendingImportCandidates();

  revalidatePath("/admin/imports");
  revalidatePath("/admin/content");
  revalidatePath("/areas");
  revalidatePath("/hubs");
}

