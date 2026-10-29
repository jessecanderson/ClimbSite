"use server";

import { uniqueSlug } from "@/lib/editorial-slugs";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const editorialIntentSchema = z.enum(["save", "publish", "unpublish"]);

function formText(formData: FormData, name: string, max = 5000) {
  return z.string().trim().min(1).max(max).parse(formData.get(name));
}

function optionalFormText(formData: FormData, name: string, max = 2000) {
  const value = formData.get(name);
  return value ? z.string().trim().max(max).parse(value) || null : null;
}

function formCoordinate(formData: FormData, name: "lat" | "lng") {
  const range = name === "lat" ? [-90, 90] : [-180, 180];
  return z.coerce.number().min(range[0]).max(range[1]).parse(formData.get(name));
}

function editorialStatus(intent: z.infer<typeof editorialIntentSchema>) {
  return intent === "publish" ? "reviewed" : intent === "unpublish" ? "needs_review" : undefined;
}

function hasEditorialPlaceholders(values: string[]) {
  return values.some((value) => /needs review|imported .*candidate/i.test(value));
}

function revalidatePublicContent() {
  revalidatePath("/");
  revalidatePath("/areas");
  revalidatePath("/hubs");
  revalidatePath("/trips");
}

function editorialErrorRedirect(type: "area" | "campground" | "link", error: string, id?: string) {
  const params = new URLSearchParams({ type, status: "needs_review", error });
  if (id) params.set("errorId", id);
  redirect(`/admin/content?${params.toString()}`);
}

export async function saveAreaContentAction(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().optional().parse(formData.get("id") || undefined);
  const intent = editorialIntentSchema.catch("save").parse(formData.get("intent"));
  const name = formText(formData, "name", 120);
  const region = formText(formData, "region", 120);
  const summary = formText(formData, "summary", 2000);
  const bestFor = formText(formData, "bestFor", 300);
  const approach = formText(formData, "approach", 2000);
  const parking = formText(formData, "parking", 2000);
  const roadDifficulty = formText(formData, "roadDifficulty", 300);
  const approachMinutes = z.coerce
    .number()
    .int()
    .min(0)
    .max(1440)
    .optional()
    .parse(formData.get("approachMinutes") || undefined);
  const sourceName = optionalFormText(formData, "sourceName", 200);
  const sourceUrl = optionalFormText(formData, "sourceUrl", 2000);
  const parentAreaId = z.string().cuid().nullable().parse(formData.get("parentAreaId") || null);
  if (sourceUrl) z.string().url().parse(sourceUrl);

  if (parentAreaId) {
    if (parentAreaId === id) throw new Error("An area cannot be its own parent.");
    const parent = await prisma.climbingArea.findUniqueOrThrow({ where: { id: parentAreaId } });
    if (parent.parentAreaId) throw new Error("Only one subarea level is supported.");
    if (id && await prisma.climbingArea.count({ where: { parentAreaId: id } })) {
      throw new Error("An area with subareas cannot also become a subarea.");
    }
  }

  if (intent === "publish") {
    if (hasEditorialPlaceholders([summary, bestFor, approach, parking, roadDifficulty])) {
      editorialErrorRedirect("area", "placeholder", id);
    }
    if (!sourceUrl) {
      editorialErrorRedirect("area", "source-required", id);
    }
  }

  const status = editorialStatus(intent);
  const data = {
    name,
    region,
    summary,
    bestFor,
    approach,
    approachMinutes: approachMinutes ?? null,
    parking,
    roadDifficulty,
    lat: formCoordinate(formData, "lat"),
    lng: formCoordinate(formData, "lng"),
    sourceName,
    sourceUrl,
    parentAreaId,
    ...(status ? { reviewStatus: status, lastReviewedAt: status === "reviewed" ? new Date() : null } : {})
  };

  if (id) {
    await prisma.climbingArea.update({ where: { id }, data });
  } else {
    await prisma.climbingArea.create({
      data: { ...data, slug: await uniqueSlug("climbingArea", name), sourceType: "curated", reviewStatus: status ?? "needs_review" }
    });
  }

  revalidatePath("/admin/content");
  revalidatePublicContent();
  redirect(`/admin/content?type=area&status=${status ?? "all"}&notice=area-saved`);
}

export async function saveCampgroundContentAction(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().optional().parse(formData.get("id") || undefined);
  const intent = editorialIntentSchema.catch("save").parse(formData.get("intent"));
  const name = formText(formData, "name", 120);
  const type = formText(formData, "type", 200);
  const summary = formText(formData, "summary", 2000);
  const amenities = formText(formData, "amenities", 3000);
  const campingFit = formText(formData, "campingFit", 2000);
  const reservationUrl = optionalFormText(formData, "reservationUrl", 2000);
  const sourceName = optionalFormText(formData, "sourceName", 200);
  const sourceUrl = optionalFormText(formData, "sourceUrl", 2000);
  if (reservationUrl) z.string().url().parse(reservationUrl);
  if (sourceUrl) z.string().url().parse(sourceUrl);

  if (intent === "publish") {
    if (hasEditorialPlaceholders([summary, amenities, campingFit])) {
      editorialErrorRedirect("campground", "placeholder", id);
    }
    if (!sourceUrl && !reservationUrl) {
      editorialErrorRedirect("campground", "source-required", id);
    }
  }

  const status = editorialStatus(intent);
  const data = {
    name,
    type,
    summary,
    amenities,
    campingFit,
    reservationUrl,
    sourceName,
    sourceUrl,
    lat: formCoordinate(formData, "lat"),
    lng: formCoordinate(formData, "lng"),
    ...(status ? { reviewStatus: status, lastReviewedAt: status === "reviewed" ? new Date() : null } : {})
  };

  if (id) {
    await prisma.campground.update({ where: { id }, data });
  } else {
    await prisma.campground.create({
      data: { ...data, slug: await uniqueSlug("campground", name), sourceType: "curated", reviewStatus: status ?? "needs_review" }
    });
  }

  revalidatePath("/admin/content");
  revalidatePublicContent();
  redirect(`/admin/content?type=campground&status=${status ?? "all"}&notice=campground-saved`);
}

export async function saveAreaCampgroundLinkAction(formData: FormData) {
  const id = z.string().cuid().optional().parse(formData.get("id") || undefined);
  await requireAdmin();
  const climbingAreaId = z.string().cuid().parse(formData.get("climbingAreaId"));
  const campgroundId = z.string().cuid().parse(formData.get("campgroundId"));
  const intent = editorialIntentSchema.catch("save").parse(formData.get("intent"));
  const logisticsNote = formText(formData, "logisticsNote", 2000);
  const miles = z.coerce.number().min(0).max(1000).parse(formData.get("miles"));
  const driveMinutes = z.coerce.number().int().min(0).max(1440).parse(formData.get("driveMinutes"));
  const rank = z.coerce.number().int().min(0).max(1000).parse(formData.get("rank"));

  if (intent === "publish") {
    if (hasEditorialPlaceholders([logisticsNote])) {
      editorialErrorRedirect("link", "placeholder", id);
    }
    const [area, campground] = await Promise.all([
      prisma.climbingArea.findUnique({ where: { id: climbingAreaId }, select: { reviewStatus: true } }),
      prisma.campground.findUnique({ where: { id: campgroundId }, select: { reviewStatus: true } })
    ]);
    if (area?.reviewStatus !== "reviewed" || campground?.reviewStatus !== "reviewed") {
      editorialErrorRedirect("link", "endpoints-not-reviewed", id);
    }
  }

  const status = editorialStatus(intent);
  await prisma.areaCampgroundLink.upsert({
    where: { climbingAreaId_campgroundId: { climbingAreaId, campgroundId } },
    update: {
      miles,
      driveMinutes,
      logisticsNote,
      rank,
      ...(status ? { reviewStatus: status, lastReviewedAt: status === "reviewed" ? new Date() : null } : {})
    },
    create: {
      climbingAreaId,
      campgroundId,
      miles,
      driveMinutes,
      logisticsNote,
      rank,
      sourceType: "curated",
      reviewStatus: status ?? "needs_review",
      lastReviewedAt: status === "reviewed" ? new Date() : null
    }
  });

  revalidatePath("/admin/content");
  revalidatePublicContent();
  redirect("/admin/content?type=link&status=all&notice=link-saved");
}
