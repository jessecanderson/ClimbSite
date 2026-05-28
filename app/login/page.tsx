import { Mail } from "lucide-react";
import { loginAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/trips");
  }

  return (
    <main className="page">
      <section className="two-col">
        <div>
          <p className="eyebrow">Saved Trips</p>
          <h1>Sign in with email.</h1>
          <p className="lead">
            The MVP uses a lightweight email session so you can save and reopen climbing road trips
            without adding reservation or guidebook accounts.
          </p>
        </div>
        <form className="card form" action={loginAction}>
          <label className="field">
            <span>Email</span>
            <input className="input" required type="email" name="email" placeholder="you@example.com" />
          </label>
          <button className="button" type="submit">
            <Mail size={17} />
            Continue
          </button>
        </form>
      </section>
    </main>
  );
}
