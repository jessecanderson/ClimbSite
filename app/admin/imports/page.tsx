import Link from "next/link";
import { CheckCircle2, Database, ExternalLink, FileSearch, Link2, RotateCw, Search, XCircle } from "lucide-react";
import {
  acceptImportCandidateAction,
  linkImportCandidateAction,
  updateImportCandidateStatusAction
} from "@/app/actions";
import { requireAdmin } from "@/lib/admin";
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

  const [runs, candidates, campgrounds, climbingAreas] = await Promise.all([
    prisma.importRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { source: true }
    }),
    prisma.importCandidate.findMany({
      where: candidateWhere,
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: { source: true }
    }),
    prisma.campground.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.climbingArea.findMany({
      orderBy: [{ region: "asc" }, { name: "asc" }],
      select: { id: true, name: true, region: true }
    })
  ]);

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
              Accept new records as needs-review imports, link candidates to existing records, or
              move low-confidence records to research or ignored.
            </p>
          </article>
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
        <div className="actions">
          {(["PENDING", "NEEDS_RESEARCH", "ALL"] as const).map((status) => (
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
            candidates.map((candidate) => (
              <article className="card" key={candidate.id}>
                <div className="meta-row">
                  <span className="pill">{candidate.source.name}</span>
                  <span className="pill">{candidate.entityType.replace("_", " ").toLowerCase()}</span>
                  <span className="pill">{candidate.status.replace("_", " ").toLowerCase()}</span>
                  <span className="pill">Data source: {candidate.source.name}</span>
                  <span className="pill">{candidate.region ?? "No region"}</span>
                </div>
                <h3>{candidate.name}</h3>
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
                  <form action={acceptImportCandidateAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <button className="button" type="submit">
                      <CheckCircle2 size={17} />
                      Accept as new
                    </button>
                  </form>
                </div>

                <form className="form compact-form" action={linkImportCandidateAction}>
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <label className="field">
                    <span>Link to existing {candidate.entityType === "CAMPGROUND" ? "campground" : "area"}</span>
                    <select className="input" name="targetId" required>
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
                </form>

                <div className="actions">
                  <form action={updateImportCandidateStatusAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <input type="hidden" name="status" value="NEEDS_RESEARCH" />
                    <button className="ghost-button" type="submit">
                      <Search size={17} />
                      Needs research
                    </button>
                  </form>
                  <form action={updateImportCandidateStatusAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <input type="hidden" name="status" value="IGNORED" />
                    <button className="danger-button" type="submit">
                      <XCircle size={17} />
                      Ignore
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
