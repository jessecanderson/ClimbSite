import { prisma } from "./prisma";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uniqueSlug(model: "campground" | "climbingArea", name: string) {
  const base = slugify(name) || "imported-record";
  let candidate = base;
  let suffix = 2;

  while (
    model === "campground"
      ? await prisma.campground.findUnique({ where: { slug: candidate } })
      : await prisma.climbingArea.findUnique({ where: { slug: candidate } })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

