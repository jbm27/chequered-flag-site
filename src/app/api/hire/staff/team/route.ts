import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createStaff, databaseConfigured, httpStatus, listStaff, publicError, staffFromToken } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

async function requireStaff() {
  const staff = await staffFromToken(cookies().get(COOKIE)?.value);
  if (!staff) {
    const error = new Error("Sign in to the hire desk.");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return staff;
}

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  try {
    await requireStaff();
    const team = await listStaff();
    return NextResponse.json({ team }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The new sign-in could not be read." }, { status: 400 });
  }
  try {
    await requireStaff();
    const member = await createStaff(String(body.username || ""), String(body.password || ""));
    const team = await listStaff();
    return NextResponse.json({ username: member.username, team }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
