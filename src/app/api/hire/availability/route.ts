import { NextResponse } from "next/server";
import { databaseConfigured, httpStatus, loadAvailability, publicError } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  const url = new URL(request.url);
  try {
    const data = await loadAvailability(
      url.searchParams.get("pickup") || "",
      url.searchParams.get("return") || "",
      url.searchParams.get("from"),
    );
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
