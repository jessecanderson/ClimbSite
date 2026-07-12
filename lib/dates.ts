export function parseDateInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date");
  }

  return new Date(`${value}T12:00:00.000Z`);
}

export function formatDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function formatTripDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(value);
}

export function formatTripDateRange(startDate?: Date | null, endDate?: Date | null) {
  if (startDate && endDate) {
    return `${formatTripDate(startDate)} – ${formatTripDate(endDate)}`;
  }

  if (startDate) {
    return `Starts ${formatTripDate(startDate)}`;
  }

  if (endDate) {
    return `Ends ${formatTripDate(endDate)}`;
  }

  return null;
}
