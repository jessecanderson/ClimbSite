import { test } from "node:test";
import assert from "node:assert/strict";
import { getAreaDiscovery } from "../lib/queries";
import { prisma } from "../lib/prisma";
test("discovery applies publication, search, and pagination in PostgreSQL", {skip: !process.env.RUN_DB_TESTS}, async () => {
  try {
    const all = await getAreaDiscovery({});
    assert.ok(all.total > 12, "Seed at least 13 reviewed areas");
    assert.equal(all.areas.length,12);
    const second = await getAreaDiscovery({page:'2'});
    assert.equal(second.total,all.total);
    assert.ok(second.areas.every(area => !all.areas.some(first => first.id === area.id)));
    const match = await getAreaDiscovery({q:'motherlode',camping:'yes'});
    assert.equal(match.total,1);
    assert.equal(match.areas[0].slug,'motherlode');
    assert.ok(match.areas[0].campgroundCount > 0);
    const none = await getAreaDiscovery({q:'does-not-exist-in-the-test-seed',page:'999'});
    assert.equal(none.total,0);
    assert.equal(none.page,1);
  } finally { await prisma.$disconnect(); }
});
