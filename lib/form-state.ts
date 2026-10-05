import { z } from "zod";
import { parseDateInput } from "./dates";

export type FormState = { errors?: Record<string, string>; message?: string; success?: boolean };

export class FormValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super("Please check the highlighted fields.");
  }
}

export function formDate(formData: FormData, field: string) {
  try {
    return parseDateInput(formData.get(field));
  } catch {
    throw new FormValidationError({ [field]: "Enter a valid calendar date." });
  }
}

export function isDateInTrip(date: Date | null, start: Date | null, end: Date | null) {
  // Postgres date columns return midnight UTC; inputs use noon UTC. Compare calendar days.
  const day = date?.toISOString().slice(0, 10);
  return !day || ((!start || day >= start.toISOString().slice(0, 10)) && (!end || day <= end.toISOString().slice(0, 10)));
}

export function validationState(error: unknown): FormState | null {
  if (error instanceof FormValidationError) return { errors: error.errors };
  if (error instanceof z.ZodError) {
    const errors: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "form");
      errors[field] ??= issue.message;
    }
    return { errors };
  }
  return null;
}
