import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CreditCard, Mail, Route, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getTripsForUser } from "@/lib/queries";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const trips = await getTripsForUser(user.id);
  const displayEmail = user.email ?? "No email on file";

  return (
    <main className="page">
      <section className="two-col">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Your ClimbSite account.</h1>
          <p className="lead">
            Account identity stays separate from trips and future billing, so sign-in methods can
            change without losing saved plans.
          </p>
          <div className="meta-row">
            <span className="pill">
              <Mail size={14} />
              {displayEmail}
            </span>
            <span className="pill">
              <CalendarDays size={14} />
              Joined {user.createdAt.toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="card">
          <CreditCard color="#2f5f4b" />
          <h3>Billing</h3>
          <p>Subscription billing is not connected yet.</p>
          <span className="pill">Planned for Stripe customer and subscription records</span>
        </div>
      </section>

      <section className="section">
        <div className="grid">
          <article className="card">
            <Route color="#a14f35" />
            <h3>Saved Trips</h3>
            <p>{trips.length} trip{trips.length === 1 ? "" : "s"} saved to this account.</p>
            <Link className="ghost-button" href="/trips">
              View trips
            </Link>
          </article>
          <article className="card">
            <ShieldCheck color="#c28b31" />
            <h3>Sign-in Security</h3>
            <p>
              Continue using the sign-in method associated with this account. Securely linking
              additional providers is not available yet.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
