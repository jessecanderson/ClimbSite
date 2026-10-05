const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name in mocks ? mocks[name] : require(name), Date, FormData, URLSearchParams, process, Set, console });
  return exports;
}
const dates = load('lib/dates.ts');
const formState = load('lib/form-state.ts', {'./dates': dates});
const planning = load('lib/trip-planning.ts');
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
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); }, unstable_rethrow: error => { if (error.message?.startsWith('REDIRECT:')) throw error; } },
    'next/cache': { revalidatePath() {} }, '@/auth': {}, '@/lib/admin': { requireAdmin: async () => ({}) },
    '@/lib/auth': { getCurrentUser: async () => ({ id: 'user' }) }, '@/lib/form-state': formState,
    '@/lib/trip-mutations': load('lib/trip-mutations.ts', {'./prisma': {prisma: {...prisma, $transaction: async fn => fn({...prisma, $queryRaw: async () => [{id:tripId}]})}}}),
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
  const api = actions({ trip: { findUniqueOrThrow: async () => ({startDate:null,endDate:null}), update: async ({data}) => {if ("notes" in data) tripData=data;} }, tripStop: { findMany: async () => [], updateMany: async ({data}) => {stopData=data; return {count:1};} } });
  await api.updateTripAction(form({tripId, name:'Weekend', notes:''}));
  await api.updateStopNotesAction(form({tripId, stopId, notes:''}));
  assert.equal(tripData.notes, null);
  assert.equal(stopData.notes, null);
});
test('new trips reject unpublished areas', async () => {
  let query;
  const api = actions({ climbingArea: { findMany: async args => {query=args; return [];} }, trip: { create: async () => assert.fail('must not create trip') } });
  await assert.rejects(api.createTripAction(form({name:'Weekend', climbingAreaId:areaId})), /highlighted fields/);
  assert.equal(query.where.reviewStatus, 'reviewed');
});
test('adding a stop rejects unpublished areas', async () => {
  const api = actions({ tripStop: { findMany: async () => [], create: async () => assert.fail('must not add stop') }, climbingArea: { findUnique: async ({where}) => { assert.equal(where.reviewStatus,'reviewed'); return null; } } });
  await assert.rejects(api.addStopAction(form({tripId, climbingAreaId:areaId})), /highlighted fields/);
});
test('campground selection requires published relationship and endpoints', async () => {
  const api = actions({ tripStop: { findFirst: async () => ({climbingAreaId:areaId}), update: async () => assert.fail('must not select campground') }, areaCampgroundLink: { findUnique: async ({where}) => { assert.equal(where.reviewStatus,'reviewed'); assert.equal(where.campground.reviewStatus,'reviewed'); assert.equal(where.climbingArea.reviewStatus,'reviewed'); return null; } } });
  await assert.rejects(api.selectCampgroundAction(form({tripId,stopId,campgroundId:areaId})), /highlighted fields/);
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
test('form errors retain field names and do not save invalid dates', async () => {
  const api = actions({trip:{create:async () => assert.fail('must not save invalid trip')}});
  const state = await api.createTripFormAction(form({name:'Weekend',startDate:'2026-10-10',endDate:'2026-10-09',notes:'Keep this note'}));
  assert.match(state.errors.endDate,/on or after/);
  assert.equal(state.success,undefined);
  const invalid = await api.createTripFormAction(form({name:'Weekend',startDate:'2026-02-31'}));
  assert.match(invalid.errors.startDate,/valid calendar date/);
});
test('changing trip range refuses to strand a stop outside it', async () => {
  const api = actions({tripStop:{findMany:async () => [{plannedDate:new Date('2026-10-12T12:00Z')}]},trip:{update:async () => assert.fail('must not shrink trip')}});
  const state = await api.updateTripFormAction(form({tripId,name:'Weekend',startDate:'2026-10-10',endDate:'2026-10-11'}));
  assert.match(state.errors.startDate,/outside/);
});
test('stop dates are validated against the trip on the server', async () => {
  const api = actions({trip:{findUniqueOrThrow:async () => ({startDate:new Date('2026-10-10T00:00Z'),endDate:new Date('2026-10-11T00:00Z')})},tripStop:{updateMany:async () => assert.fail('must not save stop')}});
  const state = await api.updateStopFormAction(form({tripId,stopId,plannedDate:'2026-10-12'}));
  assert.match(state.errors.plannedDate,/within the trip/);
});
test('camp selection can be cleared without a reviewed relationship', async () => {
  let selected = 'previous';
  const api = actions({trip:{update:async () => ({})},tripStop:{findFirst:async () => ({climbingAreaId:areaId}), update:async ({data}) => {selected=data.selectedCampgroundId;}}});
  await api.selectCampgroundAction(form({tripId,stopId}));
  assert.equal(selected,null);
});
test('withdrawn selections need reconfirmation and cannot count as ready', () => {
  const stop = {selectedCampgroundId:areaId,climbingArea:{reviewStatus:'reviewed',campgroundLinks:[]}};
  assert.equal(planning.campSelectionStatus(stop),'reconfirm');
  assert.equal(planning.selectedCampLink(stop),undefined);
  stop.climbingArea.campgroundLinks.push({campgroundId:areaId,campground:{name:'Camp'}});
  assert.equal(planning.campSelectionStatus(stop),'selected');
  stop.climbingArea.reviewStatus='needs_review';
  assert.equal(planning.campSelectionStatus(stop),'reconfirm');
  stop.selectedCampgroundId=null;
  assert.equal(planning.campSelectionStatus(stop),'missing');
});
test('trip row lock scopes access to the owner before invoking a mutation', async () => {
  const helper = load('lib/trip-mutations.ts', {'./prisma': {prisma: {$transaction: async fn => fn({$queryRaw:async (sql, ...values) => {assert.match(sql.join('?'),/FOR UPDATE/); assert.equal(values[0],tripId); assert.equal(values[1],'other-user'); return [];}})}}});
  const result = await helper.withTripLock(tripId,'other-user',async () => assert.fail('unauthorized mutation'));
  assert.equal(result,null);
});
test('the final trip day is valid despite Postgres midnight timestamps', () => {
  assert.equal(formState.isDateInTrip(new Date('2026-10-11T12:00Z'),new Date('2026-10-10T00:00Z'),new Date('2026-10-11T00:00Z')),true);
});
