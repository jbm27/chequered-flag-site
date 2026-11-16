import { NextResponse } from "next/server";
import { databaseConfigured, publishedReviews } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Approved reviews for the hire page: rating, comment, display name, vehicle and month only.
export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ count: 0, average: null, reviews: [] });
  try {
    const data = await publishedReviews();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
  } catch {
    return NextResponse.json({ count: 0, average: null, reviews: [] });
  }
}
