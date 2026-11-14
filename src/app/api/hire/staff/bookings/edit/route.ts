import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseConfigured, editBooking, httpStatus, publicError, staffFromToken } from "../../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// Staff correct a booking on the desk (Edit button). Needs a desk session.
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
    const result = await editBooking(
      String(body.id ?? ""),
      {
        modelId: String(body.modelId ?? ""),
        pickup: String(body.pickup ?? ""),
        returnOn: String(body.returnOn ?? ""),
        pickTime: String(body.pickTime ?? ""),
        retTime: String(body.retTime ?? ""),
        location: String(body.location ?? ""),
        name: String(body.name ?? ""),
        phone: String(body.phone ?? ""),
        email: String(body.email ?? ""),
        insure: Boolean(body.insure),
        oohNote: String(body.oohNote ?? ""),
        mpesaCode: String(body.mpesaCode ?? ""),
        staffNote: String(body.staffNote ?? ""),
        deliveryFee: body.deliveryFee,
      },
      staff.username,
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
