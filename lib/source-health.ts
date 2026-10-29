import { prisma } from "./prisma";
export async function sourceHealth(now = Date.now()) {
  const profiles = await prisma.sourceSyncProfile.findMany({ where: { enabled: true },
    select: { status: true, lastStartedAt: true, lastFinishedAt: true, refreshIntervalDays: true } });
  const failedProfiles = profiles.filter(p => p.status === "FAILED").length;
  // Allow two daily scheduler passes beyond the configured interval before alerting.
  const staleProfiles = profiles.filter(p =>
    (p.status === "RUNNING" && (!p.lastStartedAt || now - p.lastStartedAt.getTime() > 20 * 60 * 1000)) ||
    (p.lastFinishedAt && now - p.lastFinishedAt.getTime() > (p.refreshIntervalDays + 2) * 86_400_000) ||
    (!p.lastFinishedAt && !p.lastStartedAt)
  ).length;
  return { ok: failedProfiles === 0 && staleProfiles === 0, enabledProfiles: profiles.length, failedProfiles, staleProfiles };
}
