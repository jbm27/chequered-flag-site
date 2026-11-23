import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createBooking, databaseConfigured, httpStatus, publicError, staffFromToken } from "../../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// Staff add a booking by hand, for example one taken over the phone.
// Same checks, prices and vehicle assignment as a website booking; email and mobile number are optional,
// and staff can mark it as already paid in full, or record a part payment (amount paid so far).
export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The booking could not be read." }, { status: 400 });
  }
  try {
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    if (!staff) {
      return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    }
    const note = String(body.staffNote ?? "").replace(/\s+/g, " ").trim();
    // A chosen number plate, and an approved overlap if that vehicle is already booked (desk only).
    const vehicleId = String(body.vehicleId ?? "").trim();
    const overlapNote = String(body.overlapNote ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (body.approveOverlap === true && overlapNote.length < 3) {
      return NextResponse.json({ error: "Add a short reason for the overlap." }, { status: 400 });
    }
    const overlap = body.approveOverlap === true ? { by: staff.username, note: overlapNote } : undefined;
    const staffNote = "Added on the desk by " + staff.username + (note ? ". " + note : ".");
    const result = await createBooking(
      {
        modelId: String(body.modelId ?? ""),
        pickup: String(body.pickup ?? ""),
        returnOn: String(body.returnOn ?? ""),
        pickTime: String(body.pickTime ?? ""),
        retTime: String(body.retTime ?? ""),
        location: String(body.location ?? ""),
        delivery: String(body.delivery ?? "none"),
        placeId: "",
        address: String(body.address ?? ""),
        directions: "",
        note: String(body.note ?? ""),
        insure: Boolean(body.insure),
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        phone: String(body.phone ?? ""),
        oohNote: String(body.oohNote ?? ""),
        mpesaCode: String(body.mpesaCode ?? ""),
        terms: Boolean(body.terms),
      },
      { confirmed: Boolean(body.paid), staffNote, emailOptional: true, amountPaid: body.amountPaid, vehicleId: vehicleId || undefined, overlap },
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
