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
// Supplied by Chequered Flag (Hire Agreement, 3 pages), copied as written. Change AGREEMENT_VERSION whenever
// the text changes, so each booking records which version the customer signed.
// Layout: a leading tab indents a line under its clause; two tabs indent a lettered item.
export const AGREEMENT_VERSION = "hire-agreement-2026-11";
export const AGREEMENT_TITLE = "Hire Agreement";
export const AGREEMENT_TEXT = [
  "The company named overleaf agrees to let on hire whose name and address appears overleaf, the motor vehicle " +
    "described overleaf (with all tyres, spares and accessories carried with it herein after called \"the vehicle\") " +
    "subject to all terms and provisions here contained in addition to those set overleaf.",
  "1. The vehicle is and shall remain the property of the company and the hirer shall return the same in the same " +
    "order and condition as when received, except only ordinary wear and tear to the place and date as set out " +
    "overleaf or other place and such other place and such other time as the company may direct.",
  "2. The vehicle shall not be driven by any other than:",
  "\t\t(a) the hirer/driver who should be above 25 years",
  "\t\t(b) any other person whom the company shall in writing been provided with such information regarding him/her " +
    "and undertaking from him/her as company shall require.",
  "\tThe hirer liability to company here under shall not be avoided by whomsoever the vehicle may from time to time be driven.",
  "3. Under no circumstance shall the vehicle be used, operated or driven:",
  "\t\t(a) by any person not in possession of a valid driving licence recognised in this country.",
  "\t\t(b) for the transport of persons or goods for hirer or reward,",
  "\t\t(c) by any person who has given the company false information whatsoever.",
  "\t\t(c) in any race, rally, speed test or contest.",
  "\t\t(d) to propel or tow any vehicle or trailer.",
  "4. All expenses incurred while recovering the vehicle will be the responsibility of the hirer.",
  "5. The hirer will pay to the company on demand all charges at company's standard rates and other monies payable " +
    "in accordance with the agreement.",
  "6. (a) The hirer shall reimburse the company with cost of all loss of damage to the vehicle or equipment not " +
    "attributable to wear and tear subject however to a maximum sum of Kenya shillings \"90,000\" reading Ninety " +
    "Thousand Only.",
  "\t(b) Provided however that any such damage occurs while the vehicle is being used, operated or driven or in " +
    "control of any person in breach of any terms of this agreement with all accidental costs and expenses.",
  "\tThe hirer liability to the company, shall not be prejudiced or reduced by reason of any indemnity which himself " +
    "may be entitled from any third party.",
  "7. The company shall insure that vehicle so as to comply with the law relating to compulsory insurances of motor " +
    "vehicle against such other risks, if any as the company thinks fit but the rights of the parties shall be " +
    "affected by any rights of recovery which the company may enjoy under such insurance.",
  "\tNB: Vehicle damage or accident caused by riots or natural calamities are not covered by insurance. Hence the " +
    "hire will meet all the cost so caused on the vehicle.",
  "8. The company shall not be liable to meet any claim in respect of death or a bodily injury to persons being " +
    "carried in or upon entering or getting onto or alighting from the vehicle at the time of the occurrence of the " +
    "event out of which such claims arise whether or not such occurrence was caused by or related to the negligence " +
    "of the company or its servants or agents.",
  "9. The distance over which the vehicle shall be operated under this agreement shall be conclusively determined by " +
    "reading of a a standard distance recording device to the vehicles at the commencement of hiring.",
  "10. Without prejudice to his other liabilities above, the hirer shall be solely liable and responsible to fines, " +
    "penalties and forfeiture imposed by reason of breach by him or any other person in control of the vehicle any " +
    "law bye law or other regulations if any competent authority and the hirer shall on completion of the hire hand " +
    "over to the company all demand, sermons, process and notifications in connection to the use of vehicle and " +
    "notifications of any penalties and charges incurred by the hirer during the period of hire.",
  "11. The hirer shall not during the hiring or thereafter do or permit attempt to do any of the following action:-",
  "\t\t(a) Sell, pledge, charge or otherwise part with the possession of the vehicle otherwise than to the company.",
  "\t\t(b) Make or cause or permit to be made any repair adjustment or alteration of the vehicle or any part thereof " +
    "without prior consent of the company.",
  "\t\t(c) Any act which might prejudice or endanger the company's absolute title to the vehicle.",
  "\t\t(d) The vehicle is fitted with a speed clock. If it is tampered with, a minimum of 500kms will be charged per day.",
  "\t\t(e) Transmits drugs of any nature alcohol or any narcotic material prohibited by the laws of Kenya.",
  "\t\t(f) Under all circumstances the hirer is supposed to make sure the hired vehicle is parked in safe and secure place.",
  "12. No waiver or variation of the terms hereof shall be binding on the company unless authorised.",
  "13. It is understood and agreed that any deputes and for claims arising under this contract shall be subject to " +
    "the sole jurisdiction of the courts of Kenya.",
  "14. Windscreen and tyre busting is the responsibly of the hirer.",
  "\t(a) Cancellation. The company shall deduct 75% of the total cost as cancellation fee in case the hirer declines " +
    "to use the vehicle as agreed based on the car contract.",
  "15. The company shall not be responsible for the following:-",
  "\t\t(a) Delay for refunds due to cancellation of the bookings.",
  "\t\t(b) For delays due to breakdown of vehicles or cancellations due to shortening of ones holidays while in the country.",
  "\tNeither shall the company be held responsible for flight delay, train departures or accommodation at hotels due to clause",
  "\t\t(a) as stated above.",
  "\t\t(b) The company must be notified 14 days in advance to make arrangement for refund without any penalties whatsoever.",
  "16. Extra fuel is non-refundable whatsoever.",
];

// How far a line of the agreement is indented (0, 1 or 2) and its text without the layout tabs.
export function agreementLine(line: string): { level: number; text: string } {
  const match = /^\t*/.exec(line);
  const level = Math.min(2, match ? match[0].length : 0);
  return { level, text: line.slice(level) };
}

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
  if (!list.length) return { ok: false, error: "Add a photo of the front of your driving licence." };
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
