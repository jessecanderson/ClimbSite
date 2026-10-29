import type { Instrumentation } from "next";
export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  const { reportOperationalEvent } = await import("./lib/observability");
  await reportOperationalEvent({ event: "request.failed", route: context.routePath, digest: error && typeof error === "object" && "digest" in error && typeof error.digest === "string" ? error.digest : undefined });
};
