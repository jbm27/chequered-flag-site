import { NextResponse } from "next/server";
import { databaseConfigured, findLicenceOnFile, httpStatus, publicError } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Checkout asks whether a returning customer has a licence on file. Both the email and the mobile number must
// match. The answer is only yes or no and the month it was saved: the licence itself is never sent back.
export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ onFile: false });
  let body: { email?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ onFile: false });
  }
  try {
    const found = await findLicenceOnFile(String(body.email ?? "").slice(0, 160), String(body.phone ?? "").slice(0, 40));
    if (!found) return NextResponse.json({ onFile: false }, { headers: { "Cache-Control": "no-store" } });
    const since = new Date(found.savedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Nairobi" });
    return NextResponse.json({ onFile: true, since }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
