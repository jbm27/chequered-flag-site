import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseConfigured, httpStatus, publicError, staffFromToken, updateVehicleRecord } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// Staff update a vehicle record on the desk (odometer, year, condition notes). Needs a desk session.
export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The changes could not be read." }, { status: 400 });
  }
  try {
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    const result = await updateVehicleRecord(
      String(body.id ?? ""),
      { year: body.year, km: body.km, notes: body.notes },
      staff.username,
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
