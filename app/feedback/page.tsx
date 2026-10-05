import Link from "next/link";
import { ActionForm, FormInput, FormTextarea, FormSelect } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { submitFeedbackAction } from "@/app/feedback-actions";
import { getCurrentUser } from "@/lib/auth";
import { safeLocalPath, loginPath } from "@/lib/navigation";

export default async function FeedbackPage({ searchParams }: {
  searchParams: Promise<{ context?: string; subject?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const context = safeLocalPath(params.context, "/");
  const subject = (params.subject ?? "").slice(0, 160);
  const kind = ["GENERAL", "DATA", "BUG", "IDEA"].includes(params.kind ?? "") ? params.kind! : "GENERAL";
  const user = await getCurrentUser();
  const returnTo = `/feedback?${new URLSearchParams({ context, subject, kind })}`;
  return (
    <main className="page feedback-page">
      <Link className="text-link" href={context}>← Back to your planning</Link>
      <p className="eyebrow">ClimbSite alpha</p>
      <h1>Help improve the next trip.</h1>
      <p className="lead">Report incorrect information, a confusing step, or an idea. The page you came from is included automatically.</p>
      <p className="feedback-context">Page: <code>{context}</code></p>
      {user ? <ActionForm className="card form" action={submitFeedbackAction} resetOnSuccess>
        <input type="hidden" name="context" value={context} />
        <label className="field"><span>Feedback type</span><FormSelect className="input" name="kind" defaultValue={kind}>
          <option value="GENERAL">General feedback</option><option value="DATA">Incorrect information</option><option value="BUG">Something isn’t working</option><option value="IDEA">Suggestion</option>
        </FormSelect></label>
        <label className="field"><span>Short title</span><FormInput className="input" name="subject" defaultValue={subject} required maxLength={160} /></label>
        <label className="field"><span>What should we know?</span><FormTextarea className="input" name="message" required minLength={10} maxLength={3000} rows={6} placeholder="What happened, what you expected, or what information needs correcting…" /></label>
        <p className="muted-label">Your report and account identity are visible to ClimbSite admins.</p>
        <SubmitButton pendingLabel="Sending feedback…">Send feedback</SubmitButton>
      </ActionForm> : <div className="card"><p>Sign in to send feedback. We’ll bring you back to this page.</p><Link className="button" href={loginPath(returnTo)}>Sign in to send feedback</Link></div>}
    </main>
  );
}
