import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ExternalLink, Mountain, ShieldCheck, Tent } from "lucide-react";
import { DynamicAreaMap } from "@/components/DynamicAreaMap";
import { DestinationPlanner } from "@/components/DestinationPlanner";
import { getHubBySlug } from "@/lib/queries";

export default async function DestinationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hub = await getHubBySlug(slug);
  if (!hub) notFound();

  const areaCamps = new Map(hub.areas.flatMap(({ climbingArea }) => climbingArea.campgroundLinks.map((link) => [link.campground.id, link.campground] as const)));
  const points = [
    ...hub.areas.map(({ climbingArea }) => ({ name: climbingArea.name, lat: climbingArea.lat, lng: climbingArea.lng, kind: "area" as const, detail: `${climbingArea.bestFor} · ${climbingArea.approachMinutes ?? "Varies"} min approach`, href: `/areas/${climbingArea.slug}` })),
    ...Array.from(areaCamps.values()).map((campground) => ({ name: campground.name, lat: campground.lat, lng: campground.lng, kind: "campground" as const, detail: campground.type, href: campground.reservationUrl ?? undefined }))
  ];

  return (
    <main className="page">
      <Link className="text-link" href="/hubs"><ArrowLeft size={16} /> All destinations</Link>
      <section className="destination-hero">
        <div className="destination-intro">
          <p className="eyebrow">{hub.region} · Destination field guide</p>
          <h1>{hub.name}</h1>
          <p className="lead">{hub.summary}</p>
          <div className="destination-stats large"><span><strong>{hub.areas.length}</strong> climbing areas</span><span><strong>{areaCamps.size}</strong> nearby camps</span></div>
          {hub.seasonNotes ? <article className="season-panel"><span>Best timing</span><p>{hub.seasonNotes}</p></article> : null}
          <div className="source-disclaimer"><ShieldCheck size={19} /><p><strong>Plan here, verify at the source.</strong> Conditions, closures, permits, and reservations can change. Use linked authoritative sources before departure.</p></div>
          {hub.sourceUrl ? <a className="ghost-button" href={hub.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {hub.sourceName ?? "Destination source"}</a> : null}
        </div>
        <div className="panel map-frame destination-map"><DynamicAreaMap points={points} /></div>
      </section>

      <section className="section planning-workspace">
        <div className="section-head"><div><p className="eyebrow">Build the climbing plan</p><h2>Choose your stops</h2><p>Select areas to reveal a deduplicated camp comparison with a drive time for every selected crag.</p></div><span className="pill"><BadgeCheck size={14} /> Curated planning data</span></div>
        <DestinationPlanner hubSlug={hub.slug} areas={hub.areas.map(({ climbingArea }) => climbingArea)} />
      </section>

      <section className="section secondary-browse">
        <div><p className="eyebrow">Need more detail?</p><h2>Research each climbing area</h2></div>
        <div className="simple-area-links">
          {hub.areas.map(({ climbingArea }) => <Link href={`/areas/${climbingArea.slug}`} key={climbingArea.id}><Mountain size={18} /><span><strong>{climbingArea.name}</strong><small>{climbingArea.bestFor}</small></span><span>{climbingArea.campgroundLinks.length} <Tent size={14} /></span></Link>)}
        </div>
      </section>
    </main>
  );
}
