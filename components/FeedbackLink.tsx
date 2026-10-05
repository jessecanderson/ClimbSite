import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function FeedbackLink({ context, subject, kind = "GENERAL", children = "Send alpha feedback" }: {
  context: string;
  subject?: string;
  kind?: "GENERAL" | "DATA" | "BUG" | "IDEA";
  children?: React.ReactNode;
}) {
  const params = new URLSearchParams({ context, kind });
  if (subject) params.set("subject", subject);
  return <Link className="text-link feedback-link" href={`/feedback?${params}`}><MessageSquare size={16} />{children}</Link>;
}
