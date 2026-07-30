import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runRidbCampgroundImport } from "@/scripts/import-ridb-campgrounds";
import { runRidbClimbingAreaImport } from "@/scripts/import-ridb-climbing-areas";
import { runOpenBetaImport } from "@/scripts/import-openbeta-climbing-areas";
import { runNpsCampgroundImport } from "@/scripts/import-nps-campgrounds";

const ridbCampSchema = z.object({ query: z.string().min(1).max(100), state: z.string().length(2).optional(), limit: z.number().int().min(1).max(100), offset: z.number().int().min(0), maxPages: z.number().int().min(1).max(2) });
const ridbAreaSchema = z.object({ state: z.string().length(2).optional(), activityIds: z.array(z.string()).min(1).max(10), limit: z.number().int().min(1).max(100), offset: z.number().int().min(0), maxPages: z.number().int().min(1).max(2) });
const openBetaSchema = z.object({ terms: z.array(z.string().min(1)).min(1).max(30), state: z.string().length(2).optional(), limit: z.number().int().min(1).max(10), includeChildren: z.boolean() });
const npsSchema = z.object({ state: z.string().length(2).optional(), parkCode: z.string().optional(), query: z.string().optional(), limit: z.number().int().min(1).max(100), maxPages: z.number().int().min(1).max(2) });

export const sourceRunnerOptions = ["RIDB_CAMPGROUNDS", "RIDB_CLIMBING_AREAS", "OPENBETA_AREAS", "NPS_CAMPGROUNDS"] as const;

export async function runSourceSyncProfile(profileId: string) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 20 * 60 * 1000);
  const claimed = await prisma.sourceSyncProfile.updateMany({
    where: { id: profileId, enabled: true, OR: [{ status: { not: "RUNNING" } }, { lastStartedAt: { lt: staleBefore } }] },
    data: { status: "RUNNING", lastStartedAt: now, lastError: null }
  });
  if (!claimed.count) throw new Error("This sync profile is disabled or already running.");

  const profile = await prisma.sourceSyncProfile.findUniqueOrThrow({ where: { id: profileId } });
  try {
    let result;
    if (profile.runner === "RIDB_CAMPGROUNDS") result = await runRidbCampgroundImport(ridbCampSchema.parse(profile.params));
    else if (profile.runner === "RIDB_CLIMBING_AREAS") result = await runRidbClimbingAreaImport(ridbAreaSchema.parse(profile.params));
    else if (profile.runner === "OPENBETA_AREAS") result = await runOpenBetaImport(openBetaSchema.parse(profile.params));
    else if (profile.runner === "NPS_CAMPGROUNDS") result = await runNpsCampgroundImport(npsSchema.parse(profile.params));
    else throw new Error(`Unsupported source runner: ${profile.runner}`);

    const finishedAt = new Date();
    await prisma.sourceSyncProfile.update({
      where: { id: profile.id },
      data: {
        status: "IDLE",
        lastFinishedAt: finishedAt,
        lastDurationMs: finishedAt.getTime() - now.getTime(),
        lastFetchedCount: result.fetchedCount,
        lastCandidateCount: result.candidateCount,
        lastSkippedCount: result.skippedCount,
        lastError: null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.sourceSyncProfile.update({ where: { id: profile.id }, data: { status: "FAILED", lastFinishedAt: new Date(), lastError: message.slice(0, 2000) } });
    throw error;
  }
}

export async function runNextScheduledSourceSync() {
  const profiles = await prisma.sourceSyncProfile.findMany({
    where: { enabled: true, status: { in: ["IDLE", "FAILED"] } },
    orderBy: [{ lastFinishedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }]
  });
  const now = Date.now();
  const profile = profiles.find((candidate) =>
    !candidate.lastFinishedAt || now - candidate.lastFinishedAt.getTime() >= candidate.refreshIntervalDays * 86_400_000
  );
  if (!profile) return null;
  await runSourceSyncProfile(profile.id);
  return profile.id;
}
