import { loginPath } from "@/lib/navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Mail, Route, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getTripsForUser } from "@/lib/queries";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath("/account"));
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
            Your saved trips and planning notes are kept with this account.
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
