import { createTripAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { getAreas, getHubBySlug } from "@/lib/queries";
import { SubmitButton } from "@/components/SubmitButton";
import { BadgeCheck, MapPin, Route } from "lucide-react";
import { redirect } from "next/navigation";

export default async function NewTripPage({
  searchParams
}: {
  searchParams: Promise<{ area?: string | string[]; hub?: string; error?: string }>;
}) {
  const { area, hub: hubSlug, error } = await searchParams;
  const requestedAreaSlugs = [...new Set(Array.isArray(area) ? area : area ? [area] : [])];
  const [areas, selectedHub] = await Promise.all([
    getAreas(),
    hubSlug ? getHubBySlug(hubSlug) : Promise.resolve(null)
  ]);
  const selectedAreas = requestedAreaSlugs
    .map((slug) => areas.find((candidate) => candidate.slug === slug))
    .filter((candidate) => candidate !== undefined);
  const user = await getCurrentUser();

  if (!user) {
    const callbackParams = new URLSearchParams();
    selectedAreas.forEach((selectedArea) => callbackParams.append("area", selectedArea.slug));
    if (selectedHub) callbackParams.set("hub", selectedHub.slug);
    const callbackUrl = callbackParams.size
      ? `/trips/new?${callbackParams.toString()}`
      : "/trips/new";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <main className="page">
      <section className="two-col">
        <div>
          <p className="eyebrow">Final step · Save your plan</p>
          <h1>Name the weekend.</h1>
          <p className="lead">
            {selectedAreas.length
              ? `Start with ${selectedAreas.length === 1 ? selectedAreas[0].name : `${selectedAreas.length} areas`}, then choose the camp logistics that fit each climbing day.`
              : "Start with a name, then add Southeast climbing stops. The app will show nearby camping and logistics for each stop."}
          </p>
          {selectedHub ? <p className="eyebrow">From {selectedHub.name}</p> : null}
          {selectedAreas.length ? (
            <div className="selected-area-list">
              {selectedAreas.map((selectedArea, index) => (
              <article className="card selected-area-card" key={selectedArea.id}>
              <div className="meta-row">
                <span className="pill">
                  <BadgeCheck size={14} />
                  Stop {index + 1}
                </span>
                <span className="pill">
                  <MapPin size={14} />
                  {selectedArea.region}
                </span>
              </div>
              <h3>{selectedArea.name}</h3>
              <p>{selectedArea.summary}</p>
              </article>
              ))}
            </div>
          ) : null}
        </div>

        <form className="card form" action={createTripAction}>
          {selectedAreas.map((selectedArea) => (
            <span key={selectedArea.id}>
              <input type="hidden" name="climbingAreaId" value={selectedArea.id} />
              <input type="hidden" name="sourceArea" value={selectedArea.slug} />
            </span>
          ))}
          {selectedHub ? <input type="hidden" name="sourceHub" value={selectedHub.slug} /> : null}
          {error === "date-order" ? (
            <p className="form-message form-message-error" role="alert">
              End date must be on or after the start date.
            </p>
          ) : null}
          <label className="field">
            <span>Trip name</span>
            <input
              className="input"
              required
              name="name"
              placeholder="Spring RRG weekend"
              defaultValue={selectedHub ? `${selectedHub.name} trip` : ""}
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Start date</span>
              <input className="input" type="date" name="startDate" />
            </label>
            <label className="field">
              <span>End date</span>
              <input className="input" type="date" name="endDate" />
            </label>
          </div>
          <label className="field optional-field">
            <span>Optional notes</span>
            <textarea
              className="input"
              name="notes"
              placeholder="Partners, goals, weather constraints..."
            />
          </label>
          <SubmitButton pendingLabel="Creating trip…">
            <Route size={17} />
            {selectedAreas.length === 1
              ? `Create trip with ${selectedAreas[0].name}`
              : selectedAreas.length > 1
                ? `Create trip with ${selectedAreas.length} stops`
                : "Create trip"}
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
