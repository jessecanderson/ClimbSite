import type { ImportCandidateStatus, ImportSyncStatus, Prisma } from "@prisma/client";

type ExistingSnapshot = {
  rawPayload: Prisma.JsonValue;
  mappedPayload: Prisma.JsonValue;
  status: ImportCandidateStatus;
  syncStatus: ImportSyncStatus;
  previousRawPayload: Prisma.JsonValue | null;
  previousMappedPayload: Prisma.JsonValue | null;
} | null;

function json(value: unknown) {
  return JSON.stringify(value);
}

function object(value: Prisma.JsonValue) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Prisma.JsonObject)
    : {};
}

export function analyzeImportSync(
  existing: ExistingSnapshot,
  nextRaw: Prisma.InputJsonValue,
  nextMapped: Prisma.InputJsonValue
) {
  const lastSyncedAt = new Date();
  if (!existing) {
    return {
      syncStatus: "NEW" as const,
      syncChangedFields: [] as Prisma.InputJsonValue,
      syncReason: "First snapshot from this source.",
      syncDecisionMethod: "source-id",
      syncConfidence: 1,
      lastSyncedAt
    };
  }

  const pendingReview = existing.syncStatus === "REVIEW_REQUIRED";
  if (json(existing.rawPayload) === json(nextRaw) && json(existing.mappedPayload) === json(nextMapped)) {
    // Leave the outstanding diff and review decision intact until an admin acknowledges it.
    if (pendingReview) return { lastSyncedAt };
    return {
      syncStatus: "UNCHANGED" as const,
      syncChangedFields: [] as Prisma.InputJsonValue,
      syncReason: "Source snapshot is unchanged.",
      syncDecisionMethod: "source-id",
      syncConfidence: 1,
      lastSyncedAt
    };
  }

  const baselineRaw = pendingReview ? existing.previousRawPayload ?? existing.rawPayload : existing.rawPayload;
  const baselineMapped = pendingReview ? existing.previousMappedPayload ?? existing.mappedPayload : existing.mappedPayload;
  const before = object(baselineMapped);
  const after = object(nextMapped as Prisma.JsonValue);
  const changedFields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => json(before[key]) !== json(after[key]))
    .sort();
  const requiresReview = pendingReview || existing.status === "LINKED" || existing.status === "ACCEPTED";

  return {
    previousRawPayload: baselineRaw as Prisma.InputJsonValue,
    previousMappedPayload: baselineMapped as Prisma.InputJsonValue,
    syncStatus: requiresReview ? ("REVIEW_REQUIRED" as const) : ("CHANGED" as const),
    syncChangedFields: changedFields as Prisma.InputJsonValue,
    syncReason: requiresReview
      ? "The source changed after this record was linked. Curated content was protected."
      : existing.status === "IGNORED"
        ? "The source changed, but the previous ignore decision was preserved."
        : "The source changed before a final import decision.",
    syncDecisionMethod: "source-diff",
    syncConfidence: 1,
    lastSyncedAt
  };
}
