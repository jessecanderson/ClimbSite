import { createTripAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewTripPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="page">
      <section className="two-col">
        <div>
          <p className="eyebrow">Road Trip Builder</p>
          <h1>Create a climbing trip.</h1>
          <p className="lead">
            Start with a name, then add Southeast climbing stops manually. The app will show
            nearby camping and logistics for each stop.
          </p>
        </div>

        <form className="card form" action={createTripAction}>
          <label className="field">
            <span>Trip name</span>
            <input className="input" required name="name" placeholder="Spring RRG weekend" />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea
              className="input"
              name="notes"
              placeholder="Dates, partners, goals, weather constraints..."
            />
          </label>
          <button className="button" type="submit">
            Create trip
          </button>
        </form>
      </section>
    </main>
  );
}
