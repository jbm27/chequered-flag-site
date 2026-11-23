// Talks to the Chequered Flag M-Pesa payment service (James's service on Railway), from the server only.
// Settings (server-only, never NEXT_PUBLIC_): MPESA_SERVICE_URL, and the key in PAY_API_KEY (MPESA_PAY_KEY also
// works). The key is sent in the X-Pay-Key header and never reaches the browser.
//
//   POST /pay                          { phone, amount, reference }  amount in whole shillings, reference CF-123456
//   GET  /payments?reference=CF-123456 → status (pending | paid | failed | cancelled) and mpesaReceipt
//
// Safaricom tells the payment service the result itself, so the customer's page doesn't need to stay open:
// the desk checks waiting payments again whenever it loads.

export type MpesaStatus = "pending" | "paid" | "failed" | "cancelled";
export type MpesaResult = { status: MpesaStatus; receipt: string; amount: number | null; message: string };

const TIMEOUT_MS = 15_000;

function settings() {
  const url = String(process.env.MPESA_SERVICE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.PAY_API_KEY || process.env.MPESA_PAY_KEY || "").trim();
  return url && key ? { url, key } : null;
}

export function mpesaConfigured() {
  return settings() !== null;
}

// For testing on the Preview only: MPESA_TEST_AMOUNT (for example 1) sends that amount instead of the booking's
// balance. It is ignored on the live site (VERCEL_ENV=production), whatever it is set to.
export function mpesaTestAmount() {
  if (process.env.VERCEL_ENV === "production") return null;
  const value = Number(process.env.MPESA_TEST_AMOUNT || "");
  return Number.isInteger(value) && value > 0 ? value : null;
}

// Kenyan mobile numbers in the 2547XXXXXXXX / 2541XXXXXXXX form M-Pesa uses. Accepts 07…, 01…, +254…, 254….
export function mpesaPhone(raw: string) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("254")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return /^[71]\d{8}$/.test(digits) ? "254" + digits : null;
}

// 254712345678 → 0712 345 678, for showing the customer where the prompt is going.
export function displayPhone(phone254: string) {
  const local = "0" + phone254.slice(3);
  return local.slice(0, 4) + " " + local.slice(4, 7) + " " + local.slice(7);
}

class MpesaError extends Error {
  status = 502;
}

async function call(path: string, init?: RequestInit) {
  const config = settings();
  if (!config) throw Object.assign(new MpesaError("M-Pesa payments are not set up yet."), { status: 503 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(config.url + path, {
      ...init,
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Pay-Key": config.key },
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    let body: Record<string, unknown> | unknown[] = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    return { ok: response.ok, status: response.status, body };
  } catch {
    throw new MpesaError("The M-Pesa service could not be reached. Please try again, or pay by till or bank.");
  } finally {
    clearTimeout(timer);
  }
}

function field(source: unknown, ...names: string[]) {
  const record = (source || {}) as Record<string, unknown>;
  for (const name of names) if (record[name] !== undefined && record[name] !== null) return record[name];
  return undefined;
}

// Sends the "enter your M-Pesa PIN" prompt to the phone. Returns the service's request id, if it gives one.
export async function sendPaymentPrompt(phone254: string, amount: number, reference: string) {
  const result = await call("/pay", { method: "POST", body: JSON.stringify({ phone: phone254, amount, reference }) });
  if (!result.ok) {
    const message = String(field(result.body, "error", "message") || "");
    console.error("M-Pesa /pay refused (" + result.status + "): " + message.slice(0, 200));
    throw new MpesaError(
      result.status === 401 || result.status === 403
        ? "M-Pesa payments are not available right now. Please pay by till or bank."
        : "M-Pesa couldn't send the payment request. Check the number and try again, or pay by till or bank.",
    );
  }
  return String(field(result.body, "checkoutRequestId", "CheckoutRequestID", "checkoutRequestID", "id") || "").slice(0, 100);
}

function readPayment(source: unknown): MpesaResult | null {
  const raw = String(field(source, "status") || "").toLowerCase();
  const status: MpesaStatus | null =
    raw === "paid" || raw === "success" || raw === "completed"
      ? "paid"
      : raw === "failed"
        ? "failed"
        : raw === "cancelled" || raw === "canceled"
          ? "cancelled"
          : raw === "pending" || raw === "requested"
            ? "pending"
            : null;
  if (!status) return null;
  const receipt = String(field(source, "mpesaReceipt", "MpesaReceiptNumber", "receipt") || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 20);
  const amountRaw = Number(field(source, "amount", "Amount"));
  return {
    status,
    receipt,
    amount: Number.isFinite(amountRaw) && amountRaw > 0 ? Math.round(amountRaw) : null,
    message: String(field(source, "resultDesc", "ResultDesc", "message") || "").slice(0, 200),
  };
}

// The latest state of the payment for a booking reference, or null if the service has none.
// If the service returns several attempts, a paid one wins; otherwise the last one counts.
export async function paymentForReference(reference: string): Promise<MpesaResult | null> {
  const result = await call("/payments?reference=" + encodeURIComponent(reference));
  if (result.status === 404) return null;
  if (!result.ok) throw new MpesaError("The M-Pesa payment status could not be checked. Please try again shortly.");
  const body = result.body;
  const list = Array.isArray(body)
    ? body
    : Array.isArray(field(body, "payments"))
      ? (field(body, "payments") as unknown[])
      : field(body, "payment")
        ? [field(body, "payment")]
        : [body];
  const payments = list.map(readPayment).filter((p): p is MpesaResult => p !== null);
  if (!payments.length) return null;
  return payments.find((p) => p.status === "paid") || payments[payments.length - 1];
}
