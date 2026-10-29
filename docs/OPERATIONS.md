# Operations

Server-render and route errors emit structured `request.failed` events through the
Next.js instrumentation hook. Trip-save failures emit `trip.save.failed`; scheduled
sync failures and overdue profiles emit `source.sync.*`. Logs contain event names,
route patterns, counts, timestamps, and framework digests, not raw errors or user data.
Inspect full infrastructure logs privately when investigating database errors.

Set MONITORING_WEBHOOK_URL to an HTTPS JSON event receiver to deliver alerts. The
receiver must accept the documented payload from lib/observability.ts; this is not
a provider-specific Slack payload. Requests time out after three seconds. Delivery
failures are logged without masking the original operation.

Configure an external uptime monitor to GET /api/health with
`Authorization: Bearer <CRON_SECRET>` every 15 minutes. It checks database access,
failed syncs, stale running jobs, and overdue profiles. HTTP 503 needs attention;
401 indicates the monitor's secret is wrong. This external check also detects a
scheduler that stops running. Never put the secret in a query string.

Review /admin/imports for per-profile details and outstanding data reviews.
No external monitoring service is provisioned by the repository; configure the
receiver/monitor before relying on alerts. Vercel runtime is shown only on the
protected health response and in build logs.
