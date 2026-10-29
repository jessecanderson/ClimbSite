export type OperationalEvent = {
  event: "request.failed" | "trip.save.failed" | "source.sync.failed" | "source.sync.unhealthy";
  route?: string;
  digest?: string;
  failedProfiles?: number;
  staleProfiles?: number;
};

export async function reportOperationalEvent(event: OperationalEvent) {
  // Explicit fields only: no emails, cookies, notes, credentials, URLs, or raw exception text.
  const payload = { ...event, timestamp: new Date().toISOString() };
  console.error(JSON.stringify(payload));
  const endpoint = process.env.MONITORING_WEBHOOK_URL;
  if (!endpoint) return;
  try {
    const response = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) console.error(JSON.stringify({ event: "monitoring.delivery.failed", status: response.status }));
  } catch {
    console.error(JSON.stringify({ event: "monitoring.delivery.failed" }));
  }
}
