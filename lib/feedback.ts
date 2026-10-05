import { z } from "zod";
import { safeLocalPath } from "./navigation";

export const feedbackSchema = z.object({
  kind: z.enum(["GENERAL", "DATA", "BUG", "IDEA"]),
  subject: z.string().trim().min(1, "Add a short title.").max(160),
  message: z.string().trim().min(10, "Please include at least 10 characters so we can understand the issue.").max(3000),
  context: z.string().max(2000).refine(value => safeLocalPath(value, "") !== "", "Choose a ClimbSite page as the context.")
});
export const feedbackStatusSchema = z.enum(["OPEN", "RESOLVED"]);
