import { reviewStatus } from "@/lib/review-status";
import { formatTripDate } from "@/lib/dates";
export function ReviewStatus({ reviewedAt, compact = false }: { reviewedAt: string | Date | null; compact?: boolean }) {
  return <div className={`review-status${compact ? " compact" : ""}`}>
    <span>{reviewStatus(reviewedAt)}{reviewedAt ? ` · ${formatTripDate(new Date(reviewedAt))}` : ""}</span>
    {!compact ? <p>Before you leave, check the linked source for current access, closures, permits, and reservations. A review date is not a live conditions report.</p> : null}
  </div>;
}
