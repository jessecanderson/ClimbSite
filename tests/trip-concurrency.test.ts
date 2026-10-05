import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { withTripLock } from "../lib/trip-mutations";

// Opt-in database test: uses only its own temporary account/trip and deletes them in finally.
test("Postgres serializes duplicate additions and refuses a different owner", { skip: !process.env.RUN_DB_TESTS }, async () => {
  const areas = await prisma.climbingArea.findMany({ where: { reviewStatus: "reviewed" }, take: 2, select: { id: true } });
  assert.equal(areas.length, 2, "Provide two reviewed areas for the integration test");
  const user = await prisma.user.create({ data: { email: `climbsite-test-${randomUUID()}@example.invalid` } });
  try {
    const trip = await prisma.trip.create({ data: { userId: user.id, name: "Temporary concurrency regression" } });
    const add = (climbingAreaId: string) => withTripLock(trip.id, user.id, async tx => {
      const stops = await tx.tripStop.findMany({ where: { tripId: trip.id }, orderBy: { order: "asc" } });
      if (stops.some(stop => stop.climbingAreaId === climbingAreaId)) return false;
      await tx.tripStop.create({ data: { tripId: trip.id, climbingAreaId, order: (stops.at(-1)?.order ?? 0) + 1 } });
      return true;
    });
    const results = await Promise.all([add(areas[0].id), add(areas[0].id), add(areas[1].id), add(areas[1].id)]);
    assert.equal(results.filter(Boolean).length, 2);
    const stops = await prisma.tripStop.findMany({ where: { tripId: trip.id }, orderBy: { order: "asc" } });
    assert.deepEqual(stops.map(stop => stop.order), [1, 2]);
    assert.equal(new Set(stops.map(stop => stop.climbingAreaId)).size, 2);
    assert.equal(await withTripLock(trip.id, "other-user", async () => assert.fail("Unauthorized mutation")), null);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
});
