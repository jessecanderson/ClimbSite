import { createHmac } from "node:crypto";
import { prisma } from "./prisma";

// Database-backed so limits work across serverless instances. Store hashes, not emails/IPs.
export async function allowAuthAttempt(identity: string, limit: number, now = Date.now()) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  const windowMs = 10 * 60 * 1000;
  const bucket = createHmac("sha256", secret).update(`${Math.floor(now / windowMs)}:${identity}`).digest("hex");
  const expiresAt = new Date((Math.floor(now / windowMs) + 1) * windowMs);
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  const rows = await prisma.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "AuthRateLimit" ("bucket", "attempts", "expiresAt") VALUES (${bucket}, 1, ${expiresAt})
    ON CONFLICT ("bucket") DO UPDATE SET "attempts" = "AuthRateLimit"."attempts" + 1
    RETURNING "attempts"`;
  return rows[0].attempts <= limit;
}
