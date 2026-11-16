import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canSeePerformance } from "../../../../../lib/access";
import { databaseConfigured, httpStatus, performanceYear, publicError, staffFromToken } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

// Performance analysis for one year. Only the desk users listed in lib/access.ts (Homer and James).
export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  try {
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    if (!staff) return NextResponse.json({ error: "Sign in to the hire desk." }, { status: 401 });
    if (!canSeePerformance(staff.username)) {
      return NextResponse.json({ error: "Performance is only available to the owners." }, { status: 403 });
    }
    const raw = Number(new URL(request.url).searchParams.get("year"));
    const thisYear = new Date().getUTCFullYear();
    const year = Number.isInteger(raw) && raw >= 2020 && raw <= thisYear + 1 ? raw : thisYear;
    const data = await performanceYear(year);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
