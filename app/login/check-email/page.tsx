import { CheckEmailReturnLink } from "@/components/LoginRecovery";
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
            the plan you were working on.
          </p>
        </div>
        <div className="card">
          <MailCheck color="#2f5f4b" />
          <h3>Magic links expire</h3>
          <p>Check your spam folder if it hasn’t arrived. If a link expires or was already used, request a new one and use the newest email.</p>
          <CheckEmailReturnLink />
        </div>
      </section>
    </main>
  );
}
