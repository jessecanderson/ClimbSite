import Link from "next/link";
import { CalendarDays, Plus, Route } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getTripsForUser } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function TripsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trips = await getTripsForUser(user.id);

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">{user.email}</p>
          <h1>Your climbing trips</h1>
          <p className="lead">Saved road-trip plans with manual climbing stops and camping logistics.</p>
        </div>
        <Link className="button" href="/trips/new">
          <Plus size={17} />
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="empty">
          <p>No saved trips yet.</p>
          <Link className="button" href="/trips/new">
            <Route size={17} />
            Start one
          </Link>
        </div>
      ) : (
        <div className="grid">
          {trips.map((trip) => (
            <Link className="card" href={`/trips/${trip.id}`} key={trip.id}>
              <h3>{trip.name}</h3>
              <p>{trip.notes || "No trip notes yet."}</p>
              <div className="meta-row">
                <span className="pill">
                  <Route size={14} />
                  {trip.stops.length} stops
                </span>
                <span className="pill">
                  <CalendarDays size={14} />
                  {trip.updatedAt.toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
