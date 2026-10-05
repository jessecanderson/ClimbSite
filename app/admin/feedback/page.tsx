import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { feedbackStatusSchema } from "@/lib/feedback";
import { safeLocalPath } from "@/lib/navigation";
import { updateFeedbackStatusAction } from "@/app/feedback-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { formatTripDate } from "@/lib/dates";

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = feedbackStatusSchema.catch("OPEN").parse(params.status);
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1));
  const [reports, total] = await Promise.all([
    prisma.feedback.findMany({ where: { status }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 25, skip: (page - 1) * 25, include: { user: { select: { email: true } } } }),
    prisma.feedback.count({ where: { status } })
  ]);
  return <main className="page">
    <Link className="text-link" href="/admin/content">← Content administration</Link>
    <p className="eyebrow">Alpha feedback</p><h1>Reports from planners</h1>
    <div className="actions"><Link className={status === "OPEN" ? "button" : "ghost-button"} href="/admin/feedback">Open</Link><Link className={status === "RESOLVED" ? "button" : "ghost-button"} href="/admin/feedback?status=RESOLVED">Resolved</Link><span>{total} report{total === 1 ? "" : "s"}</span></div>
    <section className="section list">
      {reports.map(report => <article className="card feedback-report" key={report.id}>
        <div className="meta-row"><span className="pill">{report.kind}</span><span>{formatTripDate(report.createdAt)}</span><span>{report.user?.email ?? "Deleted account"}</span></div>
        <h2>{report.subject}</h2><p className="feedback-message">{report.message}</p>
        <p>Context: <Link className="text-link" href={safeLocalPath(report.context, "/")}>{report.context}</Link></p>
        <form action={updateFeedbackStatusAction}><input type="hidden" name="id" value={report.id} /><input type="hidden" name="status" value={status === "OPEN" ? "RESOLVED" : "OPEN"} /><SubmitButton className="ghost-button" pendingLabel="Updating…">{status === "OPEN" ? "Mark resolved" : "Reopen"}</SubmitButton></form>
      </article>)}
      {!reports.length ? <div className="empty">No {status.toLowerCase()} feedback reports.</div> : null}
    </section>
    <div className="actions">{page > 1 ? <Link className="ghost-button" href={`/admin/feedback?status=${status}&page=${page - 1}`}>Previous</Link> : null}{page * 25 < total ? <Link className="ghost-button" href={`/admin/feedback?status=${status}&page=${page + 1}`}>Next</Link> : null}</div>
  </main>;
}
