import Link from "next/link";
import { CheckCircle2, Database, ExternalLink, FileSearch, Link2, RotateCw, Search, XCircle } from "lucide-react";
import {
  acceptImportCandidateAction,
  linkImportCandidateAction,
  processImportCandidatesAction,
  undoAcceptImportCandidateAction,
  updateImportCandidateStatusAction
} from "@/app/actions";
import { requireAdmin } from "@/lib/admin";
import { importHierarchy, isImportCandidateInScope, suggestedImportTarget } from "@/lib/import-matching";
import { prisma } from "@/lib/prisma";
import type { ImportCandidateStatus, ImportEntityType, Prisma } from "@prisma/client";

const statusOptions: ImportCandidateStatus[] = [
  "PENDING",
  "NEEDS_RESEARCH",
  "IGNORED",
  "LINKED",
  "ACCEPTED"
];
const entityOptions: ImportEntityType[] = ["CAMPGROUND", "CLIMBING_AREA"];

export const maxDuration = 60;

function selectedOption<T extends string>(value: string | string[] | undefined, options: T[], fallback: T | "ALL") {
  const candidate = Array.isArray(value) ? value[0] : value;
  return options.includes(candidate as T) ? (candidate as T) : fallback;
}

export default async function AdminImportsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string | string[]; entity?: string | string[] }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const selectedStatus = selectedOption(params.status, statusOptions, "PENDING");
  const selectedEntity = selectedOption(params.entity, entityOptions, "ALL");
  const candidateWhere: Prisma.ImportCandidateWhereInput = {
    ...(selectedStatus === "ALL" ? {} : { status: selectedStatus }),
    ...(selectedEntity === "ALL" ? {} : { entityType: selectedEntity })
  };

  const [runs, candidates, campgrounds, climbingAreas, pendingForMatching, references] = await Promise.all([
    prisma.importRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { source: true }
    }),
    prisma.importCandidate.findMany({
      where: candidateWhere,
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: { source: true, matchedArea: true, matchedCampground: true }
    }),
    prisma.campground.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, lat: true, lng: true }
    }),
    prisma.climbingArea.findMany({
      orderBy: [{ region: "asc" }, { name: "asc" }],
      select: { id: true, name: true, region: true, lat: true, lng: true }
    }),
    prisma.importCandidate.findMany({ where: { status: "PENDING" } }),
    prisma.externalReference.findMany({
      select: { sourceId: true, entityType: true, externalId: true, campgroundId: true, climbingAreaId: true }
    })
  ]);
  const referenceKeys = new Set(
    references
      .filter((reference) => reference.campgroundId || reference.climbingAreaId)
      .map((reference) => `${reference.sourceId}:${reference.entityType}:${reference.externalId}`)
  );
  const autoLinkCount = pendingForMatching.filter((candidate) => {
    if (!isImportCandidateInScope(candidate)) return false;
    if (referenceKeys.has(`${candidate.sourceId}:${candidate.entityType}:${candidate.externalId}`)) return true;
    return Boolean(
      suggestedImportTarget(
        candidate,
        candidate.entityType === "CAMPGROUND" ? campgrounds : climbingAreas
      )
    );
  }).length;
  const standaloneDraftCount = pendingForMatching.filter((candidate) => {
    if (candidate.lat === null || candidate.lng === null) return false;
    if (!isImportCandidateInScope(candidate)) return false;
    if (candidate.entityType === "CLIMBING_AREA" && importHierarchy(candidate.mappedPayload).parentName) {
      return false;
    }
    if (referenceKeys.has(`${candidate.sourceId}:${candidate.entityType}:${candidate.externalId}`)) {
      return false;
    }
    return !suggestedImportTarget(
      candidate,
      candidate.entityType === "CAMPGROUND" ? campgrounds : climbingAreas
    );
  }).length;
  const outOfScopeCount = pendingForMatching.filter(
    (candidate) => !isImportCandidateInScope(candidate)
  ).length;

  return (
    <main className="page">
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Import review</h1>
            <p className="lead">
              Imported records stay as candidates until an admin links, accepts, ignores, or marks
              them for research.
            </p>
            <p>
              Data sources:{" "}
              <Link href="https://ridb.recreation.gov/" target="_blank">
                ridb.recreation.gov
              </Link>{" "}
              and{" "}
              <Link href="https://openbeta.io/" target="_blank">
                openbeta.io
              </Link>
            </p>
          </div>
          <Link className="button" href="/admin/content">
            <FileSearch size={17} />
            Edit and publish content
          </Link>
        </div>

        <div className="grid">
          <article className="card">
            <Database color="#2f5f4b" />
            <h3>Pending import candidates</h3>
            <p>{candidates.length} shown from the newest pending imports.</p>
          </article>
          <article className="card">
            <RotateCw color="#a14f35" />
            <h3>Recent import runs</h3>
            <p>{runs.length} recent source runs tracked.</p>
          </article>
          <article className="card">
            <FileSearch color="#c28b31" />
            <h3>Review actions</h3>
            <p>
              Auto-link high-confidence matches, create unpublished standalone drafts, and hold
              ambiguous hierarchy records for research.
            </p>
          </article>
        </div>
        <div className="card import-automation">
          <div>
            <h3>Process this import batch</h3>
            <p>
              Use deterministic IDs, geography, names, coordinates, and source hierarchy to process
              the safe cases. Only unresolved exceptions remain for manual review.
            </p>
            <div className="meta-row import-automation-summary">
              <span className="pill">{autoLinkCount} ready to link</span>
              <span className="pill">{standaloneDraftCount} standalone drafts</span>
              <span className="pill">{outOfScopeCount} outside project scope</span>
            </div>
          </div>
          <div className="import-automation-actions">
            <form action={processImportCandidatesAction}>
              <button className="button" type="submit" disabled={pendingForMatching.length === 0}>
                <CheckCircle2 size={17} />
                Process safe imports
              </button>
            </form>
            <small>Nothing is published automatically.</small>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Runs</p>
            <h2>Recent imports</h2>
          </div>
        </div>
        <div className="list">
          {runs.length === 0 ? (
            <div className="empty">No import runs yet.</div>
          ) : (
            runs.map((run) => (
              <article className="card" key={run.id}>
                <div className="section-head">
                  <div>
                    <h3>{run.source.name}</h3>
                    <p>{run.entityType.replace("_", " ").toLowerCase()}</p>
                  </div>
                  <span className="pill">{run.status.toLowerCase()}</span>
                </div>
                <div className="meta-row">
                  <span className="pill">Fetched {run.fetchedCount}</span>
                  <span className="pill">Candidates {run.candidateCount}</span>
                  <span className="pill">Skipped {run.skippedCount}</span>
                  <span className="pill">{run.startedAt.toLocaleString()}</span>
                </div>
                {run.error ? <p>{run.error}</p> : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Candidates</p>
            <h2>Pending imports</h2>
            <p>
              OpenBeta climbing candidates are area and wall metadata only. Do not publish route
              names, grades, or guidebook-style details into ClimbSite.
            </p>
          </div>
        </div>
        <div className="actions import-filters">
          {(["PENDING", "NEEDS_RESEARCH", "ACCEPTED", "LINKED", "IGNORED", "ALL"] as const).map((status) => (
            <Link
              className={selectedStatus === status ? "button" : "ghost-button"}
              href={`/admin/imports?status=${status}&entity=${selectedEntity}`}
              key={status}
            >
              {status.replace("_", " ").toLowerCase()}
            </Link>
          ))}
          {(["ALL", "CAMPGROUND", "CLIMBING_AREA"] as const).map((entity) => (
            <Link
              className={selectedEntity === entity ? "button" : "ghost-button"}
              href={`/admin/imports?status=${selectedStatus}&entity=${entity}`}
              key={entity}
            >
              {entity.replace("_", " ").toLowerCase()}
            </Link>
          ))}
        </div>
        <div className="grid">
          {candidates.length === 0 ? (
            <div className="empty">No import candidates match these filters.</div>
          ) : (
            candidates.map((candidate) => {
              const hierarchy = importHierarchy(candidate.mappedPayload);
              const suggestion = suggestedImportTarget(
                candidate,
                candidate.entityType === "CAMPGROUND" ? campgrounds : climbingAreas
              );
              const canCreateStandalone =
                candidate.entityType === "CAMPGROUND" || hierarchy.parentName === null;

              return (
              <article className="card" key={candidate.id}>
                <div className="meta-row">
                  <span className="pill">{candidate.source.name}</span>
                  <span className="pill">{candidate.entityType.replace("_", " ").toLowerCase()}</span>
                  <span className="pill">{candidate.status.replace("_", " ").toLowerCase()}</span>
                  <span className="pill">Data source: {candidate.source.name}</span>
                  <span className="pill">{candidate.region ?? "No region"}</span>
                </div>
                <h3>{candidate.name}</h3>
                {hierarchy.pathTokens.length ? (
                  <p className="import-path">Source hierarchy: {hierarchy.pathTokens.join(" → ")}</p>
                ) : null}
                {hierarchy.parentName && suggestion?.reason === "parent" ? (
                  <p className="form-message">
                    Source subarea of <strong>{hierarchy.parentName}</strong>. Safe rollup found to
                    the existing {suggestion.target.name} record.
                  </p>
                ) : hierarchy.parentName ? (
                  <p className="form-message form-message-warning">
                    Subarea of <strong>{hierarchy.parentName}</strong>. Keep this out of the
                    standalone-area queue until hierarchy support is available.
                  </p>
                ) : null}
                <p>
                  {candidate.lat && candidate.lng
                    ? `${candidate.lat.toFixed(4)}, ${candidate.lng.toFixed(4)}`
                    : "No coordinates supplied"}
                </p>
                <div className="actions">
                  {candidate.sourceUrl ? (
                    <Link className="ghost-button" href={candidate.sourceUrl} target="_blank">
                      <ExternalLink size={17} />
                      Source details
                    </Link>
                  ) : null}
                  {candidate.status === "PENDING" && suggestion ? (
                    <form action={linkImportCandidateAction}>
                      <input type="hidden" name="candidateId" value={candidate.id} />
                      <input type="hidden" name="targetId" value={suggestion.target.id} />
                      <button className="button" type="submit">
                        <Link2 size={17} />
                        {suggestion.reason === "parent" ? "Link under" : "Link to"} {suggestion.target.name} ({suggestion.distanceKm.toFixed(1)} km)
                      </button>
                    </form>
                  ) : candidate.status === "PENDING" && canCreateStandalone ? (
                    <form action={acceptImportCandidateAction}>
                      <input type="hidden" name="candidateId" value={candidate.id} />
                      <button className="button" type="submit">
                        <CheckCircle2 size={17} />
                        Create unpublished draft
                      </button>
                    </form>
                  ) : null}
                  {candidate.status === "ACCEPTED" ? (
                    <form action={undoAcceptImportCandidateAction}>
                      <input type="hidden" name="candidateId" value={candidate.id} />
                      <button className="ghost-button" type="submit">Undo draft creation</button>
                    </form>
                  ) : null}
                </div>

                {candidate.status === "PENDING" ? <form className="form compact-form" action={linkImportCandidateAction}>
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <label className="field">
                    <span>Link to existing {candidate.entityType === "CAMPGROUND" ? "campground" : "area"}</span>
                    <select className="input" name="targetId" required>
                      <option value="">Choose an existing record…</option>
                      {(candidate.entityType === "CAMPGROUND" ? campgrounds : climbingAreas).map((item) => (
                        <option value={item.id} key={item.id}>
                          {"region" in item ? `${item.name} (${item.region})` : item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="ghost-button" type="submit">
                    <Link2 size={17} />
                    Link reference
                  </button>
                </form> : null}

                {candidate.status === "PENDING" || candidate.status === "NEEDS_RESEARCH" ? <div className="actions">
                  {candidate.status === "PENDING" ? <form action={updateImportCandidateStatusAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <input type="hidden" name="status" value="NEEDS_RESEARCH" />
                    <button className="ghost-button" type="submit">
                      <Search size={17} />
                      Needs research
                    </button>
                  </form> : <form action={updateImportCandidateStatusAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <input type="hidden" name="status" value="PENDING" />
                    <button className="ghost-button" type="submit">Return to pending</button>
                  </form>}
                  <form action={updateImportCandidateStatusAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <input type="hidden" name="status" value="IGNORED" />
                    <button className="danger-button" type="submit">
                      <XCircle size={17} />
                      Ignore
                    </button>
                  </form>
                </div> : null}
              </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
