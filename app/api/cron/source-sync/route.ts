import { reportOperationalEvent } from "@/lib/observability";
import { sourceHealth } from "@/lib/source-health";
import { runNextScheduledSourceSync } from "@/lib/source-sync-runner";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profileId = await runNextScheduledSourceSync();
    const health = await sourceHealth();
    if (!health.ok) await reportOperationalEvent({ event: "source.sync.unhealthy", failedProfiles: health.failedProfiles, staleProfiles: health.staleProfiles });
    return Response.json({ ok: true, profileId, message: profileId ? "One bounded source profile completed." : "No enabled source profiles were ready." });
  } catch {
    await reportOperationalEvent({ event: "source.sync.failed" });
    return Response.json({ ok: false, error: "Source sync failed. Check the admin import dashboard." }, { status: 500 });
  }
}
