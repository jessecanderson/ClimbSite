"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { feedbackSchema, feedbackStatusSchema } from "@/lib/feedback";
import { safeLocalPath } from "@/lib/navigation";
import { validationState, type FormState } from "@/lib/form-state";

export async function submitFeedbackAction(form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { errors: { form: "Your session has expired. Sign in again, then return here to send your feedback." } };
  const parsed = feedbackSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return validationState(parsed.error)!;
  try {
    const saved = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const count = await tx.feedback.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
      if (count >= 5) return false;
      await tx.feedback.create({ data: {
        userId: user.id, kind: parsed.data.kind, subject: parsed.data.subject,
        message: parsed.data.message, context: safeLocalPath(parsed.data.context, "/")
      } });
      return true;
    });
    if (!saved) return { errors: { form: "You’ve sent several reports recently. Please wait 10 minutes before sending another." } };
  } catch (error) {
    console.error("Feedback save failed", error);
    return { errors: { form: "We couldn’t save your feedback. Your message is still here; please try again." } };
  }
  revalidatePath("/admin/feedback");
  return { success: true, message: "Thanks—your feedback has been saved for the ClimbSite team to review." };
}

export async function updateFeedbackStatusAction(form: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(form.get("id"));
  const status = feedbackStatusSchema.parse(form.get("status"));
  await prisma.feedback.update({ where: { id }, data: { status } });
  revalidatePath("/admin/feedback");
}
