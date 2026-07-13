"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page">
      <section className="error-state">
        <AlertTriangle size={34} />
        <p className="eyebrow">Something went wrong</p>
        <h1>We couldn’t load this part of ClimbSite.</h1>
        <p className="lead">
          Your saved data has not been removed. Try the request again, or return to your trips.
        </p>
        <div className="actions">
          <button className="button" type="button" onClick={reset}>
            <RotateCcw size={17} />
            Try again
          </button>
          <Link className="ghost-button" href="/trips">View trips</Link>
          <Link className="ghost-button" href="/">Go home</Link>
        </div>
      </section>
    </main>
  );
}
