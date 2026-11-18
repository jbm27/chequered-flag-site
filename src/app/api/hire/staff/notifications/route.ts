import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { bookingNotices, databaseConfigured, httpStatus, markBookingsSeen, publicError, staffFromToken } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// The new-bookings bell on the desk. GET lists the newest bookings and how many this staff member hasn't seen;
// POST marks them all as seen (when the bell is opened).
async function signedIn() {
  return staffFromToken(cookies().get(COOKIE)?.value);
}

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  try {
    const staff = await signedIn();
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    return NextResponse.json(await bookingNotices(staff.username), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}

export async function POST() {
  if (!databaseConfigured()) return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  try {
    const staff = await signedIn();
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    return NextResponse.json(await markBookingsSeen(staff.username), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
