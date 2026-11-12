import { NextResponse } from "next/server";
import { createBooking, databaseConfigured, httpStatus, publicError } from "../../../../lib/db";
import type { BookingInput } from "../../../../lib/hire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: Partial<BookingInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The booking could not be read." }, { status: 400 });
  }
  try {
    const booking = await createBooking(body);
    return NextResponse.json(booking, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
