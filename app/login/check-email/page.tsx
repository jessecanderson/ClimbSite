import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <main className="page">
      <section className="two-col">
        <div>
          <p className="eyebrow">Check Email</p>
          <h1>Your sign-in link is on the way.</h1>
          <p className="lead">
            Open the link from ClimbSite in the same browser to finish signing in and return to
            your saved trips.
          </p>
        </div>
        <div className="card">
          <MailCheck color="#2f5f4b" />
          <h3>Magic links expire</h3>
          <p>Use the newest email if you request more than one link.</p>
          <Link className="ghost-button" href="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
