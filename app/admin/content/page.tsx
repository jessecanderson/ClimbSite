import Link from "next/link";
import { BadgeCheck, Database, Link2, MapPin, Plus } from "lucide-react";
import type { AreaCampgroundLink, Campground, ClimbingArea } from "@prisma/client";
import {
  saveAreaCampgroundLinkAction,
  saveAreaContentAction,
  saveCampgroundContentAction
} from "@/app/actions";
import { requireAdmin } from "@/lib/admin";
import { formatTripDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

type ContentType = "area" | "campground" | "link";
type ReviewFilter = "needs_review" | "reviewed" | "all";

function contentType(value?: string): ContentType {
  return value === "campground" || value === "link" ? value : "area";
}

function reviewFilter(value?: string): ReviewFilter {
  return value === "reviewed" || value === "all" ? value : "needs_review";
}

function editorialErrorMessage(error?: string) {
  return error === "placeholder"
    ? "Replace all imported placeholder text before publishing."
    : error === "source-required"
      ? "Add an authoritative source or reservation URL before publishing."
      : error === "endpoints-not-reviewed"
        ? "Publish both the climbing area and campground before publishing their logistics relationship."
        : error
          ? "The record could not be published. Review its required fields and try again."
          : null;
}

function EditorialButtons({ reviewed, error }: { reviewed: boolean; error?: string }) {
  return (
    <>
      {error ? <p className="form-message form-message-error" role="alert">{editorialErrorMessage(error)}</p> : null}
      <div className="actions">
        <button className="ghost-button" name="intent" type="submit" value="save">
          Save changes
        </button>
        {reviewed ? (
          <button className="danger-button" name="intent" type="submit" value="unpublish">
            Return to review
          </button>
        ) : (
          <button className="button" name="intent" type="submit" value="publish">
            <BadgeCheck size={17} />
            Publish reviewed
          </button>
        )}
      </div>
    </>
  );
}

function AreaFields({ area, allAreas }: { area?: ClimbingArea; allAreas: ClimbingArea[] }) {
  return (
    <>
      {area ? <input type="hidden" name="id" value={area.id} /> : null}
      <div className="form-row">
        <label className="field"><span>Name</span><input className="input" name="name" required defaultValue={area?.name} /></label>
        <label className="field"><span>Region</span><input className="input" name="region" required defaultValue={area?.region} placeholder="Kentucky" /></label>
      </div>
      <label className="field">
        <span>Parent area (optional subarea)</span>
        <select className="input" name="parentAreaId" defaultValue={area?.parentAreaId ?? ""}>
          <option value="">Top-level climbing area</option>
          {allAreas.filter((candidate) => !candidate.parentAreaId && candidate.id !== area?.id).map((candidate) => (
            <option value={candidate.id} key={candidate.id}>{candidate.name} ({candidate.region})</option>
          ))}
        </select>
      </label>
      <label className="field"><span>Summary</span><textarea className="input" name="summary" required defaultValue={area?.summary} /></label>
      <label className="field"><span>Best for</span><input className="input" name="bestFor" required defaultValue={area?.bestFor} placeholder="Sport climbing, moderate routes" /></label>
      <label className="field"><span>Approach</span><textarea className="input" name="approach" required defaultValue={area?.approach} /></label>
      <div className="form-row">
        <label className="field"><span>Approach minutes</span><input className="input" type="number" min="0" name="approachMinutes" defaultValue={area?.approachMinutes ?? ""} /></label>
        <label className="field"><span>Road difficulty</span><input className="input" name="roadDifficulty" required defaultValue={area?.roadDifficulty} /></label>
      </div>
      <label className="field"><span>Parking</span><textarea className="input" name="parking" required defaultValue={area?.parking} /></label>
      <div className="form-row">
        <label className="field"><span>Latitude</span><input className="input" type="number" step="any" name="lat" required defaultValue={area?.lat} /></label>
        <label className="field"><span>Longitude</span><input className="input" type="number" step="any" name="lng" required defaultValue={area?.lng} /></label>
      </div>
      <div className="form-row">
        <label className="field"><span>Source name</span><input className="input" name="sourceName" defaultValue={area?.sourceName ?? ""} /></label>
        <label className="field"><span>Source URL</span><input className="input" type="url" name="sourceUrl" defaultValue={area?.sourceUrl ?? ""} /></label>
      </div>
    </>
  );
}

function CampgroundFields({ campground }: { campground?: Campground }) {
  return (
    <>
      {campground ? <input type="hidden" name="id" value={campground.id} /> : null}
      <div className="form-row">
        <label className="field"><span>Name</span><input className="input" name="name" required defaultValue={campground?.name} /></label>
        <label className="field"><span>Type</span><input className="input" name="type" required defaultValue={campground?.type} placeholder="Campground, cabin, private camping" /></label>
      </div>
      <label className="field"><span>Summary</span><textarea className="input" name="summary" required defaultValue={campground?.summary} /></label>
      <label className="field"><span>Amenities</span><textarea className="input" name="amenities" required defaultValue={campground?.amenities} /></label>
      <label className="field"><span>Climber camping fit</span><textarea className="input" name="campingFit" required defaultValue={campground?.campingFit} /></label>
      <div className="form-row">
        <label className="field"><span>Latitude</span><input className="input" type="number" step="any" name="lat" required defaultValue={campground?.lat} /></label>
        <label className="field"><span>Longitude</span><input className="input" type="number" step="any" name="lng" required defaultValue={campground?.lng} /></label>
      </div>
      <label className="field"><span>Reservation URL</span><input className="input" type="url" name="reservationUrl" defaultValue={campground?.reservationUrl ?? ""} /></label>
      <div className="form-row">
        <label className="field"><span>Source name</span><input className="input" name="sourceName" defaultValue={campground?.sourceName ?? ""} /></label>
        <label className="field"><span>Source URL</span><input className="input" type="url" name="sourceUrl" defaultValue={campground?.sourceUrl ?? ""} /></label>
      </div>
    </>
  );
}

export default async function AdminContentPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string; status?: string; q?: string; notice?: string; error?: string; errorId?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const selectedType = contentType(params.type);
  const selectedStatus = reviewFilter(params.status);
  const query = params.q?.trim() ?? "";
  const statusWhere = selectedStatus === "all" ? {} : { reviewStatus: selectedStatus };
  const [areas, campgrounds, links, allAreas, allCampgrounds, counts] = await Promise.all([
    selectedType === "area"
      ? prisma.climbingArea.findMany({
          where: { ...statusWhere, ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}) },
          orderBy: [{ updatedAt: "desc" }],
          take: 30
        })
      : [],
    selectedType === "campground"
      ? prisma.campground.findMany({
          where: { ...statusWhere, ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}) },
          orderBy: { updatedAt: "desc" },
          take: 30
        })
      : [],
    selectedType === "link"
      ? prisma.areaCampgroundLink.findMany({
          where: statusWhere,
          include: { climbingArea: true, campground: true },
          orderBy: [{ climbingArea: { name: "asc" } }, { rank: "asc" }],
          take: 50
        })
      : [],
    prisma.climbingArea.findMany({ orderBy: [{ region: "asc" }, { name: "asc" }] }),
    prisma.campground.findMany({ orderBy: { name: "asc" } }),
    Promise.all([
      prisma.climbingArea.count({ where: { reviewStatus: "needs_review" } }),
      prisma.campground.count({ where: { reviewStatus: "needs_review" } }),
      prisma.areaCampgroundLink.count({ where: { reviewStatus: "needs_review" } })
    ])
  ]);

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin Editorial</p>
          <h1>Content review</h1>
          <p className="lead">Edit canonical records, verify their sources, and publish only complete planning data.</p>
        </div>
        <Link className="ghost-button" href="/admin/imports"><Database size={17} />Import candidates</Link>
      </div>

      {params.notice ? <p className="form-message" role="status">Changes saved successfully.</p> : null}
      {params.error ? (
        <p className="form-message form-message-error" role="alert">
          {editorialErrorMessage(params.error)}
        </p>
      ) : null}

      <div className="grid editorial-counts">
        <article className="card"><MapPin /><h3>{counts[0]} areas</h3><p>awaiting editorial review</p></article>
        <article className="card"><Database /><h3>{counts[1]} campgrounds</h3><p>awaiting editorial review</p></article>
        <article className="card"><Link2 /><h3>{counts[2]} relationships</h3><p>awaiting logistics review</p></article>
      </div>

      <section className="section">
        <div className="admin-tabs">
          {(["area", "campground", "link"] as const).map((type) => (
            <Link className={selectedType === type ? "button" : "ghost-button"} href={`/admin/content?type=${type}&status=needs_review`} key={type}>
              {type === "link" ? "Area ↔ camping" : type === "area" ? "Climbing areas" : "Campgrounds"}
            </Link>
          ))}
        </div>
        <div className="admin-tabs">
          {(["needs_review", "reviewed", "all"] as const).map((status) => (
            <Link className={selectedStatus === status ? "button" : "ghost-button"} href={`/admin/content?type=${selectedType}&status=${status}`} key={status}>
              {status.replace("_", " ")}
            </Link>
          ))}
        </div>

        {selectedType !== "link" ? (
          <form className="filter-actions" method="get">
            <input type="hidden" name="type" value={selectedType} />
            <input type="hidden" name="status" value={selectedStatus} />
            <input className="input" type="search" name="q" defaultValue={query} placeholder="Search canonical records" />
            <button className="ghost-button" type="submit">Search</button>
          </form>
        ) : null}
      </section>

      <section className="section">
        <details className="card settings-card">
          <summary><Plus size={17} /> Add {selectedType === "area" ? "a climbing area" : selectedType === "campground" ? "a campground" : "area-to-camp logistics"}</summary>
          {selectedType === "area" ? (
            <form className="form" action={saveAreaContentAction}><AreaFields allAreas={allAreas} /><EditorialButtons reviewed={false} /></form>
          ) : selectedType === "campground" ? (
            <form className="form" action={saveCampgroundContentAction}><CampgroundFields /><EditorialButtons reviewed={false} /></form>
          ) : (
            <form className="form" action={saveAreaCampgroundLinkAction}>
              <LinkFields areas={allAreas} campgrounds={allCampgrounds} />
              <EditorialButtons reviewed={false} />
            </form>
          )}
        </details>
      </section>

      <section className="section list">
        {selectedType === "area" && areas.map((area) => (
          <details className="card editorial-record" key={area.id} open={params.errorId === area.id}>
            <summary><strong>{area.name}</strong><span className="pill">{area.reviewStatus.replace("_", " ")}</span></summary>
            <p>{area.region} · {area.sourceName ?? "No source named"}{area.lastReviewedAt ? ` · Reviewed ${formatTripDate(area.lastReviewedAt)}` : ""}</p>
            <form className="form" action={saveAreaContentAction}><AreaFields area={area} allAreas={allAreas} /><EditorialButtons reviewed={area.reviewStatus === "reviewed"} error={params.errorId === area.id ? params.error : undefined} /></form>
          </details>
        ))}
        {selectedType === "campground" && campgrounds.map((campground) => (
          <details className="card editorial-record" key={campground.id} open={params.errorId === campground.id}>
            <summary><strong>{campground.name}</strong><span className="pill">{campground.reviewStatus.replace("_", " ")}</span></summary>
            <p>{campground.type} · {campground.sourceName ?? "No source named"}{campground.lastReviewedAt ? ` · Reviewed ${formatTripDate(campground.lastReviewedAt)}` : ""}</p>
            <form className="form" action={saveCampgroundContentAction}><CampgroundFields campground={campground} /><EditorialButtons reviewed={campground.reviewStatus === "reviewed"} error={params.errorId === campground.id ? params.error : undefined} /></form>
          </details>
        ))}
        {selectedType === "link" && links.map((link) => (
          <details className="card editorial-record" key={link.id} open={params.errorId === link.id}>
            <summary><strong>{link.climbingArea.name} → {link.campground.name}</strong><span className="pill">{link.reviewStatus.replace("_", " ")}</span></summary>
            <form className="form" action={saveAreaCampgroundLinkAction}>
              <LinkFields areas={allAreas} campgrounds={allCampgrounds} link={link} />
              <EditorialButtons reviewed={link.reviewStatus === "reviewed"} error={params.errorId === link.id ? params.error : undefined} />
            </form>
          </details>
        ))}
        {areas.length + campgrounds.length + links.length === 0 ? <div className="empty">No records match this queue.</div> : null}
      </section>
    </main>
  );
}

type EditorialLink = AreaCampgroundLink & { climbingArea: ClimbingArea; campground: Campground };

function LinkFields({ areas, campgrounds, link }: { areas: ClimbingArea[]; campgrounds: Campground[]; link?: EditorialLink }) {
  return (
    <>
      {link ? <input type="hidden" name="id" value={link.id} /> : null}
      <div className="form-row">
        <label className="field"><span>Climbing area</span><select className="input" name="climbingAreaId" required defaultValue={link?.climbingAreaId}>{areas.map((area) => <option value={area.id} key={area.id}>{area.name} ({area.region})</option>)}</select></label>
        <label className="field"><span>Campground</span><select className="input" name="campgroundId" required defaultValue={link?.campgroundId}>{campgrounds.map((campground) => <option value={campground.id} key={campground.id}>{campground.name}</option>)}</select></label>
      </div>
      <div className="form-row">
        <label className="field"><span>Miles</span><input className="input" type="number" step="0.1" min="0" name="miles" required defaultValue={link?.miles ?? 0} /></label>
        <label className="field"><span>Drive minutes</span><input className="input" type="number" min="0" name="driveMinutes" required defaultValue={link?.driveMinutes ?? 0} /></label>
      </div>
      <label className="field"><span>Display rank</span><input className="input" type="number" min="0" name="rank" required defaultValue={link?.rank ?? 0} /></label>
      <label className="field"><span>Climber logistics note</span><textarea className="input" name="logisticsNote" required defaultValue={link?.logisticsNote} placeholder="Morning drive, road conditions, parking implications, and why this camp fits the area." /></label>
    </>
  );
}
