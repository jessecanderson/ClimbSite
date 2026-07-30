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
    return Response.json({ ok: true, profileId, message: profileId ? "One bounded source profile completed." : "No enabled source profiles were ready." });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
