import { NextResponse } from "next/server";
import { databaseConfigured, httpStatus, previewDiscountCode, publicError } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Checkout: what a discount code takes off this hire. The booking itself checks and counts the code again.
export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: { code?: unknown; modelId?: unknown; pickup?: unknown; returnOn?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The code could not be read." }, { status: 400 });
  }
  try {
    const result = await previewDiscountCode(body);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
