import { NextResponse } from "next/server";
import { mpesaConfigured } from "../../../../../lib/mpesa";
import { checkMpesaPayment, databaseConfigured, httpStatus, mpesaPaymentInfo, publicError, startMpesaPayment } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Pay with M-Pesa" on the booking confirmation. The browser sends the booking reference and email only
// (plus an M-Pesa number when the booking has no Kenyan mobile number). The amount comes from the booking.
//   { action: "ready" } whether M-Pesa payments are set up at all (for the checkout wording)
//   { action: "info" }  whether M-Pesa can be used, the amount and the phone the prompt goes to
//   { action: "start" } send the PIN prompt to the phone
//   { action: "check" } the payment's status (pending, paid, failed or cancelled), saved against the booking
export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Bookings are not connected yet." }, { status: 503 });
  }
  let body: { action?: string; reference?: string; email?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The payment details could not be read." }, { status: 400 });
  }
  if (body.action === "ready") return NextResponse.json({ ready: mpesaConfigured() }, { headers: { "Cache-Control": "no-store" } });
  const reference = String(body.reference || "");
  const email = String(body.email || "");
  const headers = { "Cache-Control": "no-store" };
  try {
    if (body.action === "info") return NextResponse.json(await mpesaPaymentInfo(reference, email), { headers });
    if (body.action === "start") return NextResponse.json(await startMpesaPayment(reference, email, String(body.phone || "")), { headers });
    if (body.action === "check") return NextResponse.json(await checkMpesaPayment(reference, email), { headers });
    return NextResponse.json({ error: "That action is not available." }, { status: 400 });
  } catch (error) {
    const extra = (error as { extra?: Record<string, unknown> }).extra || {};
    return NextResponse.json({ error: publicError(error), ...extra }, { status: httpStatus(error), headers });
  }
}
