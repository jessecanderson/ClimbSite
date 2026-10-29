import { getCurrentUser } from "@/lib/auth";
import { getTripForUser } from "@/lib/queries";
import { itineraryText } from "@/lib/itinerary";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to download your itinerary.", { status: 401, headers });
  const { id } = await params;
  const trip = await getTripForUser(id, user.id);
  if (!trip) return new Response("Trip not found.", { status: 404, headers });
  const filename = trip.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80) || "climbing-trip";
  return new Response(itineraryText(trip), { headers: { ...headers,
    "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.txt"`,
    "X-Content-Type-Options": "nosniff" } });
}
