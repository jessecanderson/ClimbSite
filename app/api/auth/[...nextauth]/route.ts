import type { NextRequest } from "next/server";
import { GET, POST as authPost } from "@/auth";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
export { GET };

export async function POST(request: NextRequest) {
  // Only trust the platform's overwritten client-IP header, never arbitrary forwarded headers.
  const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : null;
  if (ip && !(await allowAuthAttempt(`ip:${ip}`, 20))) {
    return Response.json({ error: "Too many sign-in attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "600" } });
  }
  return authPost(request);
}
