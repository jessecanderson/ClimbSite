import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { prisma } from "../../lib/prisma";
import { randomUUID } from "node:crypto";

test("discover an area and preserve selection through sign-in", async ({ page }) => {
  await page.goto("/areas");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Add to trip", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toContain("/trips/new?area=");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("map selection returns to the corresponding area card", async ({ page }) => {
  await page.goto("/areas");
  const card = page.getByRole("article").first();
  const areaName = (await card.getByRole("heading").innerText()).trim();
  // Ensure the map has mounted before revealing it on mobile, reproducing CI.
  await expect(page.locator(".leaflet-container")).toHaveCount(1);
  await card.getByRole("button", {name:"Show on map", exact:true}).click();
  await page.getByRole("button", {name:areaName, exact:true}).click();
  await expect(card).toBeFocused();
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("create a trip, recover invalid dates, and export a private plan", async ({ page, context, request }) => {
  const user = await prisma.user.create({ data: { email: `browser-${randomUUID()}@example.invalid` } });
  try {
    const sessionToken = await encode({ token: { id: user.id, sub: user.id },
      secret: process.env.AUTH_SECRET!, salt: "authjs.session-token" });
    await context.addCookies([{ name: "authjs.session-token", value: sessionToken, url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/trips/new?area=motherlode");
    await page.getByLabel("Trip name", { exact: true }).fill("Browser test weekend");
    await page.getByLabel("Start date", { exact: true }).fill("2027-04-10");
    await page.getByLabel("End date", { exact: true }).fill("2027-04-09");
    await page.getByRole("button", { name: /Create trip|Save trip|Save plan/ }).click();
    await expect(page.getByText("End date must be on or after the start date.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Trip name", { exact: true })).toHaveValue("Browser test weekend");
    await expect(page.getByLabel(/^End date/)).toHaveAccessibleName("End date");
    await page.getByLabel(/^End date/).fill("2027-04-12");
    await page.getByRole("button", { name: /Create trip|Save trip|Save plan/ }).click();
    await expect(page).toHaveURL(/\/trips\/c/);
    await expect(page.getByRole("heading", { name: "Browser test weekend", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Undated stops", exact: true })).toBeVisible();
    await page.getByLabel("Climbing date", { exact: true }).fill("2027-04-10");
    await page.getByRole("button", { name: "Save notes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Apr 10, 2027", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Use this camp", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Selected", exact: true })).toBeVisible();
    const exportUrl = await page.getByRole("link", { name: "Download itinerary" }).getAttribute("href");
    const response = await context.request.get(exportUrl!);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const exported = await response.text();
    expect(exported).toContain("Browser test weekend");
    expect(exported).toContain("Apr 10, 2027");
    expect(exported).toContain("Camp:");
    const guestResponse = await request.get(exportUrl!);
    expect(guestResponse.status()).toBe(401);
    const other = await prisma.user.create({ data: { email: `other-${randomUUID()}@example.invalid`, trips: { create: { name: "Another user's private trip" } } }, include: {trips:true} });
    try {
      const forbidden = await context.request.get(`/trips/${other.trips[0].id}/export`);
      expect(forbidden.status()).toBe(404);
      expect(await forbidden.text()).not.toContain("Another user's private trip");
    } finally { await prisma.user.delete({where:{id:other.id}}); }
    await page.emulateMedia({media:"print"});
    await expect(page.getByRole("region", {name:"Printable itinerary"})).toBeVisible();
    await expect(page.getByRole("navigation")).toBeHidden();
    await page.emulateMedia({media:"screen"});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});
