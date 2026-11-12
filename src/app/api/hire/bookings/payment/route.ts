import { NextResponse } from "next/server";
import { attachPaymentCode, databaseConfigured, httpStatus, publicError } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: { reference?: string; email?: string; mpesaCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The payment details could not be read." }, { status: 400 });
  }
  try {
    const result = await attachPaymentCode(String(body.reference || ""), String(body.email || ""), String(body.mpesaCode || ""));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
