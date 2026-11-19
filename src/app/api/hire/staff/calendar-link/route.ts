import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canUseCalendarLink } from "../../../../../lib/access";
import { calendarToken, databaseConfigured, httpStatus, publicError, staffFromToken } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// The signed-in staff member's private calendar link. GET returns it (making it the first time);
// POST makes a new one, so the old link stops working.
async function link(request: Request, reset: boolean) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  try {
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    if (!canUseCalendarLink(staff.username)) {
      return NextResponse.json({ error: "The calendar link isn't turned on for this login." }, { status: 403 });
    }
    const token = await calendarToken(staff.username, reset);
    const url = new URL("/api/hire/calendar/" + token + ".ics", request.url).toString();
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}

export async function GET(request: Request) {
  return link(request, false);
}

export async function POST(request: Request) {
  return link(request, true);
}
