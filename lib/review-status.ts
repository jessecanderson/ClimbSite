export function reviewStatus(reviewedAt: string | Date | null, now = Date.now()) {
  if (!reviewedAt || !Number.isFinite(new Date(reviewedAt).getTime())) return "Review date unavailable";
  const age = Math.max(0, Math.floor((now - new Date(reviewedAt).getTime()) / 86_400_000));
  return age > 90 ? "Review is over 90 days old" : "Reviewed within 90 days";
}
