// Driver licences, extra drivers and the signed hire agreement for a website booking.
// Used by the booking page (browser), the booking API (server) and the desk.
//
// Privacy: licence photos and signatures are personal data. They are stored in booking_documents and are only
// returned to signed-in staff (/api/hire/staff/bookings/documents). The customer's own PDF is made in their
// browser from what they have just entered, so nothing is served back to the public.

export const MAX_DRIVERS = 3; // the main driver plus up to two extra drivers
export const MAX_IMAGE_BYTES = 650_000; // per image, after the browser has shrunk it
export const MAX_IMAGE_SIDE = 4000;

// The hire agreement wording shown in the scrolling window and printed in the PDF.
// PLACEHOLDER: Chequered Flag will supply the real agreement. Change AGREEMENT_VERSION whenever the text
// changes, so each booking records which version the customer signed.
export const AGREEMENT_VERSION = "placeholder-2026-11";
export const AGREEMENT_TITLE = "Chequered Flag vehicle hire agreement";
export const AGREEMENT_TEXT = [
  "PLACEHOLDER: the full hire agreement wording will be added here by Chequered Flag before this page goes live.",
  "This window will hold the complete terms the customer agrees to, for example: who may drive the vehicle, " +
    "damage and insurance, fuel, mileage, late returns, cancellations, and what happens if the vehicle breaks down.",
  "The terms already shown on this website are summarised below for reference while the agreement is being prepared.",
  "Drivers: every driver must be at least 25 and hold a valid driving licence recognised in Kenya. Only drivers " +
    "named on this booking may drive the vehicle.",
  "Payment: the full hire amount is due when you book. We hold the vehicle and confirm the booking once we have " +
    "checked the payment.",
  "Fuel: return the vehicle with at least the fuel it had when you collected it. Fuel above that level is not refunded.",
  "Mileage: saloon cars include 100 km a day, then KSh 15 per extra km. SUVs, Prados and the Land Cruiser have " +
    "unlimited mileage.",
  "Late returns: up to 59 minutes late is free. After that, a full extra day may be charged.",
  "Damage cover: optional cover can be added. Without it, the hirer pays for any damage to the vehicle.",
];

export type DocImage = { data: string; w: number; h: number }; // JPEG data URL and its size in pixels

export type DriverDoc = { name: string; phone: string; licence: DocImage };

export type SignatureDoc =
  | { kind: "drawn"; name: string; image: DocImage }
  | { kind: "typed"; name: string };

export type BookingDocuments = {
  drivers: DriverDoc[]; // drivers[0] is the main driver (the person booking)
  signature: SignatureDoc;
  agreementVersion: string;
};

export type StoredDocuments = BookingDocuments & { signedAt: string };

function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanImage(value: unknown, what: string): DocImage | string {
  const raw = (value || {}) as Partial<DocImage>;
  const data = String(raw.data || "");
  const prefix = "data:image/jpeg;base64,";
  if (!data.startsWith(prefix)) return "Add a photo for " + what + ".";
  const base64 = data.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return "The photo for " + what + " could not be read. Please try again.";
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) return "The photo for " + what + " is too large. Please try a smaller photo.";
  const w = Math.round(Number(raw.w));
  const h = Math.round(Number(raw.h));
  if (!(w > 0 && h > 0 && w <= MAX_IMAGE_SIDE && h <= MAX_IMAGE_SIDE)) return "The photo for " + what + " could not be read.";
  return { data, w, h };
}

// Checks what the booking page sent. The main driver's name and phone come from the booking itself.
export function validateDocuments(
  raw: unknown,
  main: { name: string; phone: string },
): { ok: true; docs: BookingDocuments } | { ok: false; error: string } {
  const input = (raw || {}) as { drivers?: unknown[]; signature?: Record<string, unknown>; agreementVersion?: unknown };
  const list = Array.isArray(input.drivers) ? input.drivers : [];
  if (!list.length) return { ok: false, error: "Upload a photo of the front of your driving licence." };
  if (list.length > MAX_DRIVERS) return { ok: false, error: "A booking can have up to " + MAX_DRIVERS + " drivers." };

  const drivers: DriverDoc[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const item = (list[index] || {}) as Record<string, unknown>;
    const isMain = index === 0;
    const label = isMain ? "your driving licence" : "driver " + (index + 1) + "'s licence";
    const name = isMain ? main.name : cleanText(item.name, 120);
    const phone = isMain ? main.phone : cleanText(item.phone, 40);
    if (!isMain && name.length < 2) return { ok: false, error: "Enter the full name of driver " + (index + 1) + "." };
    const digits = phone.replace(/\D/g, "");
    if (!isMain && (digits.length < 9 || digits.length > 15)) {
      return { ok: false, error: "Enter a mobile number for driver " + (index + 1) + "." };
    }
    const licence = cleanImage(item.licence, label);
    if (typeof licence === "string") return { ok: false, error: licence };
    drivers.push({ name, phone, licence });
  }

  const sig = input.signature || {};
  const kind = sig.kind === "drawn" ? "drawn" : sig.kind === "typed" ? "typed" : "";
  const signedName = cleanText(sig.name, 120);
  if (!kind) return { ok: false, error: "Sign the hire agreement by drawing or typing your name." };
  let signature: SignatureDoc;
  if (kind === "typed") {
    if (signedName.length < 2) return { ok: false, error: "Type your full name to sign the hire agreement." };
    signature = { kind: "typed", name: signedName };
  } else {
    const image = cleanImage(sig.image, "your signature");
    if (typeof image === "string") return { ok: false, error: "Draw your signature in the box to sign the hire agreement." };
    signature = { kind: "drawn", name: main.name, image };
  }

  if (String(input.agreementVersion || "") !== AGREEMENT_VERSION) {
    return { ok: false, error: "The hire agreement has been updated. Please reload the page and sign again." };
  }
  return { ok: true, docs: { drivers, signature, agreementVersion: AGREEMENT_VERSION } };
}
