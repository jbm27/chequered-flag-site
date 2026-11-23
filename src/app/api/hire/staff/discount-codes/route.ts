import { cookies } from "next/headers";
import { canManageDiscountCodes } from "../../../../../lib/access";
import { NextResponse } from "next/server";
import {
  createDiscountCode,
  databaseConfigured,
  httpStatus,
  listDiscountCodes,
  publicError,
  setDiscountCodeActive,
  staffFromToken,
} from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// Discount codes on the desk, for Homer and James only (lib/access.ts). GET lists the active codes; POST makes one
// ({ code, kind, value, note }; each works once) or removes one ({ code, active: false }).
export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  try {
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    if (!canManageDiscountCodes(staff.username)) {
      return NextResponse.json({ error: "Discount codes aren't turned on for this login." }, { status: 403 });
    }
    return NextResponse.json({ codes: await listDiscountCodes() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  let body: { code?: unknown; kind?: unknown; value?: unknown; note?: unknown; maxUses?: unknown; expiresOn?: unknown; active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The code could not be read." }, { status: 400 });
  }
  try {
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    if (!canManageDiscountCodes(staff.username)) {
      return NextResponse.json({ error: "Discount codes aren't turned on for this login." }, { status: 403 });
    }
    const code =
      typeof body.active === "boolean" ? await setDiscountCodeActive(body.code, body.active) : await createDiscountCode(body, staff.username);
    return NextResponse.json({ code }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
