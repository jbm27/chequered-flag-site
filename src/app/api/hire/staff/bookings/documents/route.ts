import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseConfigured, httpStatus, loadDocuments, publicError, staffFromToken } from "../../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// Staff only: licence photos, drivers and the signed agreement for one booking.
export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  try {
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") || "";
    const docs = await loadDocuments(id);
    if (!docs) return NextResponse.json({ error: "No documents for this booking." }, { status: 404 });
    return NextResponse.json(docs, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
