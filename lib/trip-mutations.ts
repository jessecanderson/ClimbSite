import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// All itinerary writes acquire the same owner-scoped row lock before reading stops.
// Concurrent additions, reordering, date edits, and deletions then see the latest state.
export async function withTripLock<T>(tripId: string, userId: string, mutate: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Trip" WHERE id = ${tripId} AND "userId" = ${userId} FOR UPDATE
    `;
    if (!rows.length) return null;
    return mutate(tx);
  }, { maxWait: 10_000, timeout: 15_000 });
}
