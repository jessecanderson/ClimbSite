const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name in mocks ? mocks[name] : require(name), Date, FormData, URLSearchParams, process, Set });
  return exports;
}
const dates = load('lib/dates.ts');
const { analyzeImportSync } = load('lib/import-sync.ts');
const snapshot = (extra = {}) => ({ rawPayload: { name: 'Old' }, mappedPayload: { name: 'Old' }, status: 'LINKED', syncStatus: 'UNCHANGED', previousRawPayload: null, previousMappedPayload: null, ...extra });
test('dates reject impossible calendar days and accept leap days', () => {
  for (const value of ['2026-02-31', '2026-02-29', '2026-13-01', 'garbage']) assert.throws(() => dates.parseDateInput(value), /Invalid date/);
  assert.equal(dates.formatDateInput(dates.parseDateInput('2024-02-29')), '2024-02-29');
  assert.equal(dates.parseDateInput(''), null);
});
test('repeat sync preserves outstanding review and original baseline', () => {
  const updated = { name: 'New' };
  const first = analyzeImportSync(snapshot(), updated, updated);
  assert.equal(first.syncStatus, 'REVIEW_REQUIRED');
  const pending = snapshot({ ...first, rawPayload: updated, mappedPayload: updated });
  const repeat = analyzeImportSync(pending, updated, updated);
  assert.equal(repeat.syncStatus, undefined);
  assert.equal(repeat.syncChangedFields, undefined);
  const subsequent = analyzeImportSync(pending, { name: 'Newest' }, { name: 'Newest' });
  assert.equal(subsequent.previousMappedPayload.name, 'Old');
  assert.equal(subsequent.syncStatus, 'REVIEW_REQUIRED');
});
test('mapped changes are detected even if source payload stays identical', () => {
  assert.equal(analyzeImportSync(snapshot(), { name: 'Old' }, { name: 'New' }).syncStatus, 'REVIEW_REQUIRED');
  assert.equal(analyzeImportSync(snapshot(), { name: 'Old' }, { name: 'Old' }).syncStatus, 'UNCHANGED');
});
function actions(prisma) {
  return load('app/actions.ts', {
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    'next/cache': { revalidatePath() {} }, '@/auth': {}, '@/lib/admin': { requireAdmin: async () => ({}) },
    '@/lib/auth': { getCurrentUser: async () => ({ id: 'user' }) }, '@/lib/dates': dates,
    '@/lib/import-matching': {}, '@/lib/prisma': { prisma },
    '@/lib/source-sync-runner': { sourceRunnerOptions: ['RIDB_CAMPGROUNDS'] }
  });
}
const tripId = 'c1234567890123456789012345';
const areaId = 'c2234567890123456789012345';
const stopId = 'c3234567890123456789012345';
function form(values) { const f = new FormData(); for (const [key, value] of Object.entries(values)) f.set(key, value); return f; }
test('clearing trip and stop notes writes null', async () => {
  let tripData, stopData;
  const api = actions({ trip: { updateMany: async ({data}) => { tripData = data; return {count:1}; }, update: async () => ({}) }, tripStop: { findFirst: async () => ({}), update: async ({data}) => {stopData=data;} } });
  await api.updateTripAction(form({tripId, name:'Weekend', notes:''}));
  await api.updateStopNotesAction(form({tripId, stopId, notes:''}));
  assert.equal(tripData.notes, null);
  assert.equal(stopData.notes, null);
});
test('new trips reject unpublished areas', async () => {
  let query;
  const api = actions({ climbingArea: { findMany: async args => {query=args; return [];} }, trip: { create: async () => assert.fail('must not create trip') } });
  await assert.rejects(api.createTripAction(form({name:'Weekend', climbingAreaId:areaId})), /REDIRECT:\/trips\/new/);
  assert.equal(query.where.reviewStatus, 'reviewed');
});
test('adding a stop rejects unpublished areas', async () => {
  const api = actions({ trip: { findFirst: async () => ({stops:[]}) }, climbingArea: { findUnique: async ({where}) => { assert.equal(where.reviewStatus,'reviewed'); return null; } }, tripStop: { create: async () => assert.fail('must not add stop') } });
  await assert.rejects(api.addStopAction(form({tripId, climbingAreaId:areaId})), /REDIRECT/);
});
test('campground selection requires published relationship and endpoints', async () => {
  const api = actions({ tripStop: { findFirst: async () => ({climbingAreaId:areaId}), update: async () => assert.fail('must not select campground') }, areaCampgroundLink: { findUnique: async ({where}) => { assert.equal(where.reviewStatus,'reviewed'); assert.equal(where.campground.reviewStatus,'reviewed'); assert.equal(where.climbingArea.reviewStatus,'reviewed'); return null; } } });
  await assert.rejects(api.selectCampgroundAction(form({tripId,stopId,campgroundId:areaId})), /REDIRECT/);
});
test('scheduled sync recovers stale RUNNING profile even before its refresh interval', async () => {
  let ran = false;
  const profile = {id:'profile', status:'RUNNING', runner:'RIDB_CAMPGROUNDS', params:{query:'campground',limit:1,offset:0,maxPages:1}, lastFinishedAt:new Date(), refreshIntervalDays:60};
  const prisma = { sourceSyncProfile: { findMany: async ({where}) => { assert.ok(where.OR.some(filter => filter.status === 'RUNNING' && filter.lastStartedAt.lt instanceof Date)); return [profile]; }, updateMany: async () => ({count:1}), findUniqueOrThrow: async () => profile, update: async () => ({}) } };
  const mocks = {'@/lib/prisma': {prisma}};
  for (const [file, fn] of [['ridb-campgrounds','runRidbCampgroundImport'],['ridb-climbing-areas','runRidbClimbingAreaImport'],['openbeta-climbing-areas','runOpenBetaImport'],['nps-campgrounds','runNpsCampgroundImport']]) mocks[`@/scripts/import-${file}`] = {[fn]:async () => {ran=true; return {fetchedCount:1,candidateCount:1,skippedCount:0};}};
  const api = load('lib/source-sync-runner.ts',mocks);
  assert.equal(await api.runNextScheduledSourceSync(),'profile');
  assert.equal(ran,true);
});
test('published campground selection remains available', async () => {
  let selected;
  const api = actions({ trip: {update:async () => ({})}, tripStop: {findFirst:async () => ({climbingAreaId:areaId}), update:async ({data}) => {selected=data.selectedCampgroundId;}}, areaCampgroundLink: {findUnique:async () => ({})} });
  await api.selectCampgroundAction(form({tripId,stopId,campgroundId:areaId}));
  assert.equal(selected,areaId);
});
test('acknowledging source changes clears the stored baseline', async () => {
  const {Prisma} = require('@prisma/client');
  let saved;
  const tx = {externalReference:{updateMany:async () => ({count:1})}, importCandidate:{findUniqueOrThrow:async () => ({id:areaId,sourceId:'source',entityType:'CLIMBING_AREA',externalId:'external',sourceUrl:'https://example.com'}), update:async ({data}) => {saved=data;}}};
  const api = actions({$transaction:async fn => fn(tx)});
  await api.acknowledgeImportSyncAction(form({candidateId:areaId}));
  assert.equal(saved.syncStatus,'UNCHANGED');
  assert.equal(saved.previousRawPayload,Prisma.DbNull);
  assert.equal(saved.previousMappedPayload,Prisma.DbNull);
});
