import { NextResponse } from "next/server";
import { databaseConfigured, httpStatus, publicError, reviewInfo, submitReview } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A customer's review page. It needs the booking reference and the private token from their review link.
export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Reviews are not connected yet." }, { status: 503 });
  try {
    const url = new URL(request.url);
    const info = await reviewInfo(url.searchParams.get("ref") || "", url.searchParams.get("t") || "");
    if (!info) return NextResponse.json({ error: "This review link is not valid. Please check it, or contact us." }, { status: 404 });
    return NextResponse.json(info, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Reviews are not connected yet." }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The review could not be read." }, { status: 400 });
  }
  try {
    const result = await submitReview(String(body.ref ?? ""), String(body.t ?? ""), {
      action: body.action,
      rating: body.rating,
      comment: body.comment,
      displayName: body.displayName,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: httpStatus(error) });
  }
}
