import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createHmac } from "node:crypto";
import { allowAuthAttempt } from "../lib/auth-rate-limit";
import { prisma } from "../lib/prisma";
test("auth throttling serializes concurrent requests and expires windows", {skip: !process.env.RUN_DB_TESTS}, async () => {
  assert.ok(process.env.AUTH_SECRET, "Set a test-only auth secret");
  const identity = `test:${randomUUID()}`;
  const now = Date.now();
  const windowMs = 600000;
  const buckets = [now, now + windowMs].map(time => createHmac("sha256", process.env.AUTH_SECRET!).update(`${Math.floor(time / windowMs)}:${identity}`).digest("hex"));
  try {
    const results = await Promise.all(Array.from({length:10}, () => allowAuthAttempt(identity,5,now)));
    assert.equal(results.filter(Boolean).length,5);
    assert.equal(await allowAuthAttempt(identity,5,now + windowMs),true);
  } finally {
    await prisma.authRateLimit.deleteMany({where:{bucket:{in:buckets}}});
    await prisma.$disconnect();
  }
});
