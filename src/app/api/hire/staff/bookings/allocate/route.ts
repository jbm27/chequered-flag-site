import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { allocateVehicle, databaseConfigured, httpStatus, publicError, staffFromToken } from "../../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// Staff choose which vehicle (by number plate) a held or paid booking uses. Needs a desk session.
export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: { id?: unknown; vehicleId?: unknown; approveOverlap?: unknown; overlapNote?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request could not be read." }, { status: 400 });
  }
  try {
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    const result = await allocateVehicle(String(body.id ?? ""), body.vehicleId, staff.username, {
      approve: body.approveOverlap,
      note: body.overlapNote,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
