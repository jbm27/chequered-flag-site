import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseConfigured, decideReview, httpStatus, listReviews, publicError, reviewLinkFor, staffFromToken } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

async function staff() {
  return staffFromToken(cookies().get(COOKIE)?.value);
}

// Staff: all written reviews with counts.
export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  try {
    if (!(await staff())) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    return NextResponse.json(await listReviews(), { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}

// Staff: approve or hide a review, or get a booking's review link ({ id, action: "approve" | "hide" | "link" }).
export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request could not be read." }, { status: 400 });
  }
  try {
    const member = await staff();
    if (!member) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    const id = String(body.id ?? "");
    const result = body.action === "link" ? await reviewLinkFor(id) : await decideReview(id, String(body.action ?? ""), member.username);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
