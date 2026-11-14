import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FLEET, modelById, modelSlug } from "../../../../../lib/fleet";
import {
  databaseConfigured,
  httpStatus,
  listBookings,
  listVehicleRecords,
  publicError,
  staffFromToken,
  updateBooking,
} from "../../../../../lib/db";

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
    const bookings = await listBookings();
    const records = await listVehicleRecords();
    const fleet = FLEET.map((vehicle) => ({
      id: vehicle.id,
      model: vehicle.model,
      plate: vehicle.plate,
      category: vehicle.category,
      modelId: modelSlug(vehicle.model),
      fuel: modelById(modelSlug(vehicle.model))?.fuel || "",
      seats: vehicle.seats,
      rate: vehicle.rate,
      addon: vehicle.addon,
      year: records[vehicle.id]?.year ?? null,
      km: records[vehicle.id]?.km ?? null,
      notes: records[vehicle.id]?.notes ?? "",
      updatedAt: records[vehicle.id]?.updatedAt ?? "",
      updatedBy: records[vehicle.id]?.updatedBy ?? "",
    }));
    return NextResponse.json({ bookings, fleet }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: { id?: string; action?: string; note?: string; deliveryFee?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The update could not be read." }, { status: 400 });
  }
  try {
    await requireStaff();
    const result = await updateBooking(String(body.id || ""), String(body.action || ""), String(body.note || ""), body.deliveryFee);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
