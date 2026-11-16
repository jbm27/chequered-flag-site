import { NextResponse } from "next/server";
import { createBooking, databaseConfigured, findLicenceOnFile, httpStatus, publicError } from "../../../../lib/db";
import { validateDocuments } from "../../../../lib/documents";
import type { BookingInput } from "../../../../lib/hire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Website bookings. Since the security update, a booking must include a photo of each driver's licence
// (main driver plus any extra drivers) and the signed hire agreement. They are saved with the booking.
export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: Partial<BookingInput> & { documents?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The booking could not be read. If you added large photos, please try smaller ones." }, { status: 400 });
  }
  try {
    const name = String(body.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    const phone = String(body.phone ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    const email = String(body.email ?? "").trim().slice(0, 160);
    // A returning customer may reuse the licence kept on file, if their email and mobile number both match.
    const wantsOnFile = Boolean(
      (body.documents as { drivers?: { useOnFile?: unknown }[] } | undefined)?.drivers?.[0]?.useOnFile === true,
    );
    const onFile = wantsOnFile ? await findLicenceOnFile(email, phone) : null;
    const docs = validateDocuments(body.documents, { name, phone }, onFile);
    if ("error" in docs) return NextResponse.json({ error: docs.error }, { status: 400 });
    const { documents: _documents, ...booking } = body;
    void _documents;
    const result = await createBooking(booking, { documents: docs.docs });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
