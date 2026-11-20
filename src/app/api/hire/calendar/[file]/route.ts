import { NextResponse } from "next/server";
import { calendarBookings, databaseConfigured } from "../../../../../lib/db";
import { buildCalendar } from "../../../../../lib/ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The hire desk calendar feed that staff subscribe to in Google Calendar ("From URL"). The secret key in the
// link is the only access check, so it is per staff member and can be reset from the desk.
export async function GET(request: Request, { params }: { params: { file: string } }) {
  if (!databaseConfigured()) return new NextResponse("Bookings are not connected yet.", { status: 503 });
  const token = String(params.file || "").replace(/\.ics$/i, "");
  try {
    const bookings = await calendarBookings(token);
    if (!bookings) return new NextResponse("This calendar link is not valid. Get a new one from the hire desk.", { status: 404 });
    const desk = new URL("/manage", request.url).toString();
    return new NextResponse(buildCalendar(bookings, desk), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="chequered-flag-hire.ics"',
        "Cache-Control": "private, max-age=300",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new NextResponse("The calendar could not be loaded.", { status: 500 });
  }
}
