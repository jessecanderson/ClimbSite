import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="page">
      <section className="error-state">
        <Compass size={34} />
        <p className="eyebrow">Not found</p>
        <h1>That trail ends here.</h1>
        <p className="lead">
          The area, hub, or trip may have moved, or the link may no longer be available.
        </p>
        <div className="actions">
          <Link className="button" href="/areas">Browse climbing areas</Link>
          <Link className="ghost-button" href="/trips">View trips</Link>
        </div>
      </section>
    </main>
  );
}
