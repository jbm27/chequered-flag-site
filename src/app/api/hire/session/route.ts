import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  databaseConfigured,
  httpStatus,
  loginStaff,
  logoutStaff,
  publicError,
  staffFromToken,
  staffReady,
} from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cf_hire_session";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ authenticated: false, ready: false, error: "Bookings are not connected yet." }, { status: 503 });
  }
  try {
    const ready = await staffReady();
    const staff = await staffFromToken(cookies().get(COOKIE)?.value);
    return NextResponse.json(
      { authenticated: Boolean(staff), ready, username: staff?.username || "" },
      { headers: { "Cache-Control": "no-store" } },
    );
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
    return NextResponse.json({ error: "The sign-in could not be read." }, { status: 400 });
  }
  try {
    const session = await loginStaff(String(body.username || ""), String(body.password || ""));
    cookies().set(COOKIE, session.token, cookieOptions(session.maxAge));
    return NextResponse.json({ authenticated: true, username: session.username }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}

export async function DELETE() {
  const token = cookies().get(COOKIE)?.value;
  try {
    await logoutStaff(token);
  } catch (error) {
    console.error("hire logout", error instanceof Error ? error.message : "error");
  }
  cookies().set(COOKIE, "", cookieOptions(0));
  return NextResponse.json({ authenticated: false });
}
