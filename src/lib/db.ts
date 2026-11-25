import crypto from "crypto";
import { Pool, type PoolClient } from "pg";
import { FLEET, SALOON_MAKES, SALOON_MODEL, fleetModels, modelById, vehicleById } from "./fleet";
import {
  LICENCE_ON_FILE_MONTHS,
  MAX_DRIVERS,
  cleanImage,
  bookingSchedule,
  damageLimitFor,
  mileageFor,
  type BookingDocuments,
  type DriverDoc,
  type LicenceOnFile,
  type StoredDocuments,
} from "./documents";
import { VEHICLE_RECORDS } from "./vehicleRecords";
import type { CalendarBooking } from "./ics";
import { canUseCalendarLink } from "./access";
import {
  addDays,
  assessBooking,
  assessmentError,
  bookingMessage,
  dateProblem,
  dayNumber,
  exclusiveEnd,
  hireDays,
  HOURS,
  normaliseMpesa,
  outOfHours,
  PICKUP_LOCATIONS,
  rangesOverlap,
  todayNairobi,
  type AvailabilityResponse,
  type BookingInput,
  type PublicBookingResult,
  type PublicModelCard,
  type PaymentEntry,
  type StaffBooking,
  ksh,
} from "./hire";

const SESSION_DAYS = 14;
const LOGIN_LIMIT = 8; // wrong passwords per username in 15 minutes before sign-in is paused
const SETUP_MESSAGE =
  "Staff sign-in is not ready. In the Vercel project, add HIRE_STAFF_USERNAME and HIRE_STAFF_PASSWORD (at least 8 characters) for Production, Preview, and Development, then redeploy.";

type Busy = { vehicleId: string; pickup: string; returnOn: string };

const globalForPg = globalThis as unknown as { hirePool?: Pool; hireReady?: Promise<void> };

function redact(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]");
}

function pool() {
  if (!process.env.DATABASE_URL) return null;
  if (!globalForPg.hirePool) {
    const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    const next = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: local ? undefined : { rejectUnauthorized: false },
      max: 3,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 20000,
    });
    next.on("error", (error) => {
      console.error("hire db pool", redact(error));
    });
    globalForPg.hirePool = next;
  }
  return globalForPg.hirePool;
}

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function setupMessage() {
  return SETUP_MESSAGE;
}

async function setup() {
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  await db.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id text PRIMARY KEY,
      model text NOT NULL,
      plate text NOT NULL UNIQUE,
      category text NOT NULL,
      seats integer NOT NULL,
      daily_rate integer NOT NULL,
      addon integer NOT NULL,
      active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS staff_users (
      id serial PRIMARY KEY,
      username text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      salt text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS staff_sessions (
      token_hash text PRIMARY KEY,
      staff_id integer NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    );
    -- Failed desk sign-ins, to slow down password guessing (see loginStaff). Rows older than a day are removed.
    CREATE TABLE IF NOT EXISTS staff_login_failures (
      username text NOT NULL,
      at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS staff_login_failures_idx ON staff_login_failures (username, at);
    CREATE TABLE IF NOT EXISTS bookings (
      id uuid PRIMARY KEY,
      reference text NOT NULL UNIQUE,
      vehicle_id text REFERENCES vehicles(id),
      model_name text NOT NULL,
      customer_name text NOT NULL,
      email text NOT NULL,
      phone text NOT NULL,
      pickup_on date NOT NULL,
      return_on date NOT NULL,
      pickup_time text NOT NULL,
      return_time text NOT NULL,
      pickup_location text NOT NULL,
      delivery_mode text NOT NULL,
      delivery_summary text NOT NULL,
      delivery_detail text NOT NULL DEFAULT '',
      delivery_manual boolean NOT NULL DEFAULT false,
      days integer NOT NULL,
      daily_rate integer NOT NULL,
      hire_total integer NOT NULL,
      insurance_total integer NOT NULL,
      delivery_fee integer,
      total_due integer NOT NULL,
      ooh boolean NOT NULL DEFAULT false,
      ooh_note text NOT NULL DEFAULT '',
      mpesa_code text NOT NULL DEFAULT '',
      status text NOT NULL,
      staff_note text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      confirmed_at timestamptz,
      closed_at timestamptz,
      CONSTRAINT bookings_status_check CHECK (
        status IN ('quote', 'cancelled')
        OR (status IN ('pending', 'confirmed') AND vehicle_id IS NOT NULL)
      )
    );
    -- Part payments, entered by staff on the desk. Added after launch, so existing bookings start at 0.
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid integer NOT NULL DEFAULT 0;
    -- Unpaid website holds are flagged on the desk after 24 hours (staff chase or release them by hand).
    -- source: 'website' or 'desk' (desk bookings aren't flagged). held_at: when the vehicle was first held
    -- (a quote is held later than it was made).
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS held_at timestamptz;
    UPDATE bookings SET source = 'desk' WHERE source = 'website' AND staff_note LIKE 'Added on the desk by%';
    -- Discounts given by staff on the desk (Homer, Nov 2026). The customer books at the normal price; staff can
    -- then take a whole-shilling discount off. total_due is the price after the discount.
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount integer NOT NULL DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_note text NOT NULL DEFAULT '';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_by text NOT NULL DEFAULT '';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_at timestamptz;
    -- Overlapping bookings on one vehicle (Homer, Nov 2026): only staff on the desk can make one, by choosing the
    -- number plate and approving the overlap with a reason (for example a friend collecting the day another
    -- hire returns). Website bookings never overlap.
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS overlap_approved boolean NOT NULL DEFAULT false;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS overlap_note text NOT NULL DEFAULT '';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS overlap_by text NOT NULL DEFAULT '';
    -- Discount codes issued by staff (Homer, Nov 2026). Customers type one in at checkout. kind 'percent' takes
    -- value % off the hire charge, 'amount' takes value KSh off it (never below 0); the waiver and delivery are
    -- not discounted. max_uses null = no limit; expires_on null = no expiry (last day the code works).
    CREATE TABLE IF NOT EXISTS discount_codes (
      code text PRIMARY KEY,
      kind text NOT NULL CHECK (kind IN ('percent', 'amount')),
      value integer NOT NULL CHECK (value > 0),
      note text NOT NULL DEFAULT '',
      max_uses integer,
      uses integer NOT NULL DEFAULT 0,
      expires_on date,
      active boolean NOT NULL DEFAULT true,
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    -- When each staff member last opened the new-bookings bell on the desk.
    CREATE TABLE IF NOT EXISTS staff_seen (
      username text PRIMARY KEY,
      bookings_seen_at timestamptz NOT NULL DEFAULT now()
    );
    -- Private calendar links (Google Calendar, Apple Calendar, Outlook): one secret key per staff member,
    -- removed with the staff member. Anyone with the link can read the bookings, so it can be reset.
    CREATE TABLE IF NOT EXISTS staff_calendar_links (
      staff_id integer PRIMARY KEY REFERENCES staff_users(id) ON DELETE CASCADE,
      token text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    -- Payments recorded on the desk (code, amount, who, when), used to spot a code used twice.
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_log jsonb NOT NULL DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS bookings_vehicle_status_idx ON bookings (vehicle_id, status);
    CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at DESC);
    -- Licence photos, extra drivers and the signed hire agreement for a website booking (one row per booking).
    -- Personal data: only returned to signed-in staff. Removed with the booking.
    CREATE TABLE IF NOT EXISTS booking_documents (
      booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
      drivers jsonb NOT NULL,
      signature jsonb NOT NULL,
      agreement_version text NOT NULL,
      signed_at timestamptz NOT NULL DEFAULT now()
    );
    -- Licences kept on file for returning customers, only when the customer ticked the consent box.
    -- One per email. Reused at checkout when the email and mobile number both match, for LICENCE_ON_FILE_MONTHS.
    -- The Booking Schedule the customer agreed to (revised hire agreement, clause 14.1). Older bookings have none.
    ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS schedule jsonb;
    CREATE TABLE IF NOT EXISTS customer_licences (
      email text PRIMARY KEY,
      phone_key text NOT NULL,
      customer_name text NOT NULL,
      licence jsonb NOT NULL,
      booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
      reference text NOT NULL DEFAULT '',
      saved_at timestamptz NOT NULL DEFAULT now()
    );
    -- Customer reviews. One per booking; the token is the private key in the customer's review link.
    -- status: requested (link made), skipped, pending (waiting for staff), approved (shown on the website), hidden.
    CREATE TABLE IF NOT EXISTS reviews (
      booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
      token text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT 'requested',
      rating integer,
      comment text NOT NULL DEFAULT '',
      display_name text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      submitted_at timestamptz,
      decided_at timestamptz,
      decided_by text NOT NULL DEFAULT '',
      CONSTRAINT reviews_status_check CHECK (status IN ('requested', 'skipped', 'pending', 'approved', 'hidden')),
      CONSTRAINT reviews_rating_check CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
    );
    -- Vehicle records that staff keep up to date on the desk (odometer, year, condition notes).
    -- updated_at is also how the desk knows a vehicle has been checked since it last came back from a hire.
    CREATE TABLE IF NOT EXISTS vehicle_records (
      vehicle_id text PRIMARY KEY REFERENCES vehicles(id),
      year integer,
      odometer_km integer,
      notes text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL DEFAULT ''
    );
  `);

  for (const vehicle of FLEET) {
    await db.query(
      `INSERT INTO vehicles (id, model, plate, category, seats, daily_rate, addon, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (id) DO UPDATE SET
         model = EXCLUDED.model,
         plate = EXCLUDED.plate,
         category = EXCLUDED.category,
         seats = EXCLUDED.seats,
         daily_rate = EXCLUDED.daily_rate,
         addon = EXCLUDED.addon,
         active = true`,
      [vehicle.id, vehicle.model, vehicle.plate, vehicle.category, vehicle.seats, vehicle.rate, vehicle.addon],
    );
  }
  await db.query(`UPDATE vehicles SET active = false WHERE NOT (id = ANY($1::text[]))`, [FLEET.map((vehicle) => vehicle.id)]);
  // All saloons are booked as one model now (lib/fleet.ts). Bookings made before name the make (for example
  // "Toyota Axio"); point them at the shared model so they still match their vehicles when edited or moved.
  await db.query(`UPDATE bookings SET model_name = $1 WHERE model_name = ANY($2::text[])`, [SALOON_MODEL, SALOON_MAKES]);

  // First run only: start each vehicle record from the fleet list. Existing records are never overwritten.
  for (const vehicle of FLEET) {
    const start = VEHICLE_RECORDS[vehicle.id];
    await db.query(
      `INSERT INTO vehicle_records (vehicle_id, year, odometer_km, updated_by)
       VALUES ($1, $2, $3, 'fleet list')
       ON CONFLICT (vehicle_id) DO NOTHING`,
      [vehicle.id, start?.year ?? null, start?.km ?? null],
    );
  }

  const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM staff_users");
  if (count.rows[0].n === 0) {
    const username = String(process.env.HIRE_STAFF_USERNAME || "").trim().toLowerCase();
    const password = String(process.env.HIRE_STAFF_PASSWORD || "");
    if (!username || !password) {
      console.error("Hire desk: HIRE_STAFF_USERNAME and HIRE_STAFF_PASSWORD are not set.");
    } else if (password.length < 8 || !/^[a-z0-9._-]{3,40}$/.test(username)) {
      console.error("Hire desk: staff username or password does not meet the rules. Password needs at least 8 characters.");
    } else {
      const { salt, hash } = hashPassword(password);
      await db.query("INSERT INTO staff_users (username, password_hash, salt) VALUES ($1, $2, $3)", [username, hash, salt]);
    }
  }
}

export async function ensureReady() {
  if (!globalForPg.hireReady) {
    globalForPg.hireReady = setup().catch((error) => {
      globalForPg.hireReady = undefined;
      throw error;
    });
  }
  return globalForPg.hireReady;
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function passwordMatches(password: string, salt: string, expected: string) {
  const actual = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512");
  const stored = Buffer.from(expected, "hex");
  return stored.length === actual.length && crypto.timingSafeEqual(stored, actual);
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function busyBookings(client: Pool | PoolClient, from: string, to: string) {
  const result = await client.query<{ vehicle_id: string; pickup_on: string; return_on: string }>(
    `SELECT vehicle_id, pickup_on::text AS pickup_on, return_on::text AS return_on
     FROM bookings
     WHERE status IN ('pending', 'confirmed')
       AND vehicle_id IS NOT NULL
       AND pickup_on < $2::date
       AND CASE WHEN return_on > pickup_on THEN return_on ELSE pickup_on + 1 END > $1::date`,
    [from, to],
  );
  return result.rows.map((row) => ({
    vehicleId: row.vehicle_id,
    pickup: row.pickup_on,
    returnOn: row.return_on,
  }));
}

function freeIds(vehicleIds: string[], pickup: string, returnOn: string, busy: Busy[]) {
  const taken = new Set(
    busy.filter((row) => rangesOverlap(pickup, returnOn, row.pickup, row.returnOn)).map((row) => row.vehicleId),
  );
  return vehicleIds.filter((id) => !taken.has(id));
}

export async function loadAvailability(pickup: string, returnOn: string, from: string | null): Promise<AvailabilityResponse> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const problem = dateProblem(pickup, returnOn);
  if (problem) {
    const error = new Error(problem);
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const today = todayNairobi();
  const requestedFrom = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : addDays(pickup, -7);
  const calendarFrom = requestedFrom < today ? today : requestedFrom;
  const calendar = Array.from({ length: 21 }, (_, index) => addDays(calendarFrom, index));
  const horizon = addDays(today, 180);
  const busy = await busyBookings(db, today, horizon);
  const span = returnOn === pickup ? 0 : hireDays(pickup, returnOn);
  const returnForSpan = (start: string) => (span === 0 ? start : addDays(start, span));

  const models: PublicModelCard[] = fleetModels().map((model) => {
    const free = freeIds(model.vehicleIds, pickup, returnOn, busy);
    let nextFree: string | null = null;
    if (free.length === 0) {
      for (let offset = 0; offset <= 180; offset += 1) {
        const start = addDays(pickup, offset);
        if (start > horizon) break;
        if (freeIds(model.vehicleIds, start, returnForSpan(start), busy).length > 0) {
          nextFree = start;
          break;
        }
      }
    }
    return {
      id: model.id,
      name: model.name,
      group: model.group,
      category: model.category,
      tag: model.tag,
      seatsText: model.seatsText,
      gear: model.gear,
      fuel: model.fuel,
      mileage: model.mileage,
      similar: model.similar,
      count: model.vehicleIds.length,
      rate: model.rate,
      addon: model.addon,
      free: free.length,
      available: free.length > 0,
      hireTotal: hireDays(pickup, returnOn) * model.rate,
      dayFree: calendar.map((day) => freeIds(model.vehicleIds, day, day, busy).length),
      nextFree,
    };
  });

  return {
    pickup,
    returnOn,
    days: hireDays(pickup, returnOn),
    today,
    rangeLabel: formatRange(pickup, returnOn),
    calendar,
    models,
  };
}

function formatRange(pickup: string, returnOn: string) {
  const days = hireDays(pickup, returnOn);
  return days + " day" + (days === 1 ? "" : "s") + " · " + formatDay(pickup) + " to " + formatDay(returnOn);
}

function formatDay(iso: string) {
  const n = iso.split("-").map(Number);
  const date = new Date(Date.UTC(n[0], n[1] - 1, n[2]));
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function referenceFor(manual: boolean) {
  const number = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  return (manual ? "CFQ-" : "CF-") + number;
}

// Where the vehicle is collected or returned, for the Booking Schedule.
function scheduleWhere(
  booking: { location: string; delivery: { mode: string; placeLabel: string; collectLabel?: string } },
  which: "collect" | "return",
) {
  const d = booking.delivery;
  if (d.mode === "none") return booking.location;
  if (which === "collect") return "Delivered to " + (d.placeLabel || "the delivery address");
  if (d.mode === "both") return "Collected from " + (d.collectLabel || d.placeLabel || "the delivery address");
  return booking.location;
}

function deliveryDetail(booking: {
  delivery: { kmText: string; breakdown: string; lat?: number; lng?: number; collectLat?: number; collectLng?: number };
  directions: string;
  note: string;
}) {
  const pin =
    typeof booking.delivery.lat === "number" && typeof booking.delivery.lng === "number"
      ? "Pin: " + booking.delivery.lat.toFixed(5) + ", " + booking.delivery.lng.toFixed(5)
      : "";
  const collectPin =
    typeof booking.delivery.collectLat === "number" && typeof booking.delivery.collectLng === "number"
      ? "Collection pin: " + booking.delivery.collectLat.toFixed(5) + ", " + booking.delivery.collectLng.toFixed(5)
      : "";
  return [pin, collectPin, booking.delivery.kmText, booking.delivery.breakdown, booking.directions ? "Directions: " + booking.directions : "", booking.note ? "Note: " + booking.note : ""]
    .filter(Boolean)
    .join("\n");
}

// Website bookings call this with no options. The staff desk passes options for bookings added by hand:
// confirmed (payment already received), a staff note, and an optional email address.
// ---------- Discount codes ----------

export type DiscountCode = {
  code: string;
  kind: "percent" | "amount";
  value: number;
  note: string;
  maxUses: number | null;
  uses: number;
  expiresOn: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
};

export function normaliseDiscountCode(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
}

function discountCodeRow(row: Record<string, unknown>): DiscountCode {
  return {
    code: String(row.code),
    kind: row.kind === "amount" ? "amount" : "percent",
    value: Number(row.value),
    note: String(row.note || ""),
    maxUses: row.max_uses === null || row.max_uses === undefined ? null : Number(row.max_uses),
    uses: Number(row.uses || 0),
    expiresOn: row.expires_on ? String(row.expires_on).slice(0, 10) : "",
    active: Boolean(row.active),
    createdBy: String(row.created_by || ""),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : "",
  };
}

// What a code takes off a hire charge, or why it can't be used. Whole shillings, never more than the hire charge.
function discountFromCode(code: DiscountCode | null, hireTotal: number): { amount: number; label: string } | { error: string } {
  if (!code || !code.active) return { error: "That discount code isn't valid. Check it and try again." };
  if (code.expiresOn && code.expiresOn < todayNairobi()) return { error: "That discount code has expired." };
  if (code.maxUses !== null && code.uses >= code.maxUses) return { error: "That discount code has already been used." };
  const amount = Math.min(hireTotal, code.kind === "percent" ? Math.round((hireTotal * Math.min(100, code.value)) / 100) : code.value);
  const label = code.kind === "percent" ? code.value + "% off the hire" : ksh(code.value) + " off the hire";
  return { amount, label };
}

// Checkout: what a code would take off this hire, before the customer books. The booking checks it again.
export async function previewDiscountCode(raw: { code?: unknown; modelId?: unknown; pickup?: unknown; returnOn?: unknown }) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const code = normaliseDiscountCode(raw.code);
  if (code.length < 3) throw staffError("Enter your discount code.", 400);
  const model = modelById(String(raw.modelId ?? ""));
  const pickup = String(raw.pickup ?? "");
  const returnOn = String(raw.returnOn ?? "");
  if (!model || dayNumber(pickup) === null || dayNumber(returnOn) === null || returnOn < pickup) {
    throw staffError("Choose your vehicle and dates first.", 400);
  }
  const hireTotal = hireDays(pickup, returnOn) * model.rate;
  const found = await db.query(`SELECT * FROM discount_codes WHERE code = $1`, [code]);
  const result = discountFromCode(found.rows[0] ? discountCodeRow(found.rows[0]) : null, hireTotal);
  if ("error" in result) throw staffError(result.error, 404);
  return { code, amount: result.amount, label: result.label };
}

// The active codes: made, not removed and not used yet. A used code drops off the list.
export async function listDiscountCodes(): Promise<DiscountCode[]> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const result = await db.query(
    `SELECT * FROM discount_codes
     WHERE active = true AND (max_uses IS NULL OR uses < max_uses)
       AND (expires_on IS NULL OR expires_on >= (now() AT TIME ZONE 'Africa/Nairobi')::date)
     ORDER BY created_at DESC LIMIT 200`,
  );
  return result.rows.map(discountCodeRow);
}

// Homer or James make a code on the desk. raw: { code, kind, value, note }. Every code works once (Homer, Nov 2026):
// after one booking uses it, it can't be used again. expiresOn is optional and not offered on the desk for now.
export async function createDiscountCode(
  raw: { code?: unknown; kind?: unknown; value?: unknown; note?: unknown; maxUses?: unknown; expiresOn?: unknown },
  by: string,
) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const code = normaliseDiscountCode(raw.code);
  if (code.length < 3) throw staffError("Use a code of at least 3 letters or numbers.", 400);
  const kind = raw.kind === "amount" ? "amount" : "percent";
  const value = wholeShillings(raw.value);
  if (!value || value <= 0) throw staffError(kind === "percent" ? "Enter the percentage off, for example 10." : "Enter the KSh off, for example 2000.", 400);
  if (kind === "percent" && value > 100) throw staffError("A percentage can't be more than 100.", 400);
  const note = String(raw.note ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const maxUses = 1;
  const expiresOn = String(raw.expiresOn ?? "").trim();
  if (expiresOn && dayNumber(expiresOn) === null) throw staffError("Choose a valid expiry date, or leave it blank.", 400);
  if (expiresOn && expiresOn < todayNairobi()) throw staffError("The expiry date is in the past.", 400);
  const saved = await db.query(
    `INSERT INTO discount_codes (code, kind, value, note, max_uses, expires_on, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (code) DO NOTHING
     RETURNING *`,
    [code, kind, value, note, maxUses, expiresOn || null, by.slice(0, 60)],
  );
  if (!saved.rows[0]) throw staffError("The code " + code + " already exists. Choose another.", 409);
  return discountCodeRow(saved.rows[0]);
}

// Turn a code off (it stops working at once) or back on.
export async function setDiscountCodeActive(codeRaw: unknown, active: boolean) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const code = normaliseDiscountCode(codeRaw);
  const saved = await db.query(`UPDATE discount_codes SET active = $2 WHERE code = $1 RETURNING *`, [code, active]);
  if (!saved.rows[0]) throw staffError("That code was not found.", 404);
  return discountCodeRow(saved.rows[0]);
}

// A number plate chosen on the desk: an active vehicle of the booking's model (+ Add booking) or of the same
// class, saloon, SUV or 4x4 (Change vehicle). Returns the references of held or paid bookings it already has on
// those dates (other than `ignoreId`); none means it is free.
async function pickVehicle(
  client: PoolClient,
  vehicleId: string,
  want: { model?: string; category?: string },
  pickup: string,
  returnOn: string,
  ignoreId: string,
) {
  const vehicle = await client.query<{ id: string; model: string; plate: string; category: string; active: boolean }>(
    `SELECT id, model, plate, category, active FROM vehicles WHERE id = $1 FOR UPDATE`,
    [vehicleId.slice(0, 40)],
  );
  const chosen = vehicle.rows[0];
  if (!chosen || !chosen.active) throw staffError("Choose a vehicle from the list.", 400);
  if (want.model && chosen.model !== want.model) throw staffError(chosen.plate + " is a " + chosen.model + ". To change the model, use Edit.", 400);
  if (want.category && chosen.category !== want.category) {
    throw staffError(chosen.plate + " is not in the same class (" + want.category + "). Choose a vehicle in the same class.", 400);
  }
  const clashes = await client.query<{ id: string; reference: string }>(
    `SELECT id::text, reference FROM bookings
     WHERE vehicle_id = $1 AND id::text <> $2 AND status IN ('pending', 'confirmed')
       AND pickup_on < $4::date
       AND $3::date < CASE WHEN return_on > pickup_on THEN return_on ELSE pickup_on + 1 END
     ORDER BY pickup_on`,
    [chosen.id, ignoreId, pickup, exclusiveEnd(pickup, returnOn)],
  );
  return { id: chosen.id, plate: chosen.plate, model: chosen.model, category: chosen.category, clash: clashes.rows[0]?.reference || "", clashes: clashes.rows };
}

export async function createBooking(
  raw: Partial<BookingInput>,
  opts?: {
    confirmed?: boolean;
    staffNote?: string;
    emailOptional?: boolean;
    documents?: BookingDocuments;
    amountPaid?: unknown;
    // Desk only: a chosen number plate, and an approved overlap (who and why) if that vehicle is already booked.
    vehicleId?: string;
    overlap?: { by: string; note: string };
  },
): Promise<PublicBookingResult> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const model = raw.modelId ? modelById(String(raw.modelId)) : null;
  const assessed = assessBooking(model, raw, { emailOptional: opts?.emailOptional });
  const problem = assessmentError(assessed);
  if (problem || !assessed.ok) {
    const error = new Error(problem || "The booking could not be checked.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const booking = assessed.booking;
  let amountPaid = 0;
  if (opts?.confirmed && !booking.manual) {
    amountPaid = booking.total;
  } else if (opts?.amountPaid !== undefined && String(opts.amountPaid).trim() !== "") {
    const parsed = wholeShillings(opts.amountPaid);
    if (parsed === null) throw staffError("Enter the amount paid so far as a whole number of shillings.", 400);
    if (!booking.manual && parsed > booking.total) {
      throw staffError("The amount paid so far cannot be more than the total of " + ksh(booking.total) + ".", 400);
    }
    amountPaid = parsed;
  }
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // A discount code typed in at checkout (website bookings only): checked and counted in this same step,
    // so a code with one use left can't be used twice at once. It comes off the hire charge.
    let discount = 0;
    let discountNote = "";
    const discountCode = opts?.emailOptional ? "" : normaliseDiscountCode(raw.discountCode);
    if (discountCode) {
      const found = await client.query(`SELECT * FROM discount_codes WHERE code = $1 FOR UPDATE`, [discountCode]);
      const result = discountFromCode(found.rows[0] ? discountCodeRow(found.rows[0]) : null, booking.hireTotal);
      if ("error" in result) throw staffError(result.error, 400);
      discount = result.amount;
      const note = found.rows[0].note ? " (" + String(found.rows[0].note) + ")" : "";
      discountNote = "Code " + discountCode + ": " + result.label + note;
      await client.query(`UPDATE discount_codes SET uses = uses + 1 WHERE code = $1`, [discountCode]);
    }
    const total = booking.total - discount;
    let vehicleId: string | null = null;
    let overlapping = false;
    if (!booking.manual && model && opts?.vehicleId) {
      const chosen = await pickVehicle(client, String(opts.vehicleId), { model: model.name }, booking.pickup, booking.returnOn, "");
      if (chosen.clash && !opts.overlap) {
        throw staffError(
          chosen.plate + " is already booked on " + chosen.clash + " for those dates. Approve the overlap to book it anyway.",
          409,
        );
      }
      vehicleId = chosen.id;
      overlapping = Boolean(chosen.clash);
    } else if (!booking.manual && model) {
      const end = exclusiveEnd(booking.pickup, booking.returnOn);
      const locked = await client.query<{ id: string }>(
        `SELECT v.id
         FROM vehicles v
         WHERE v.active = true
           AND v.model = $1
           AND NOT EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.vehicle_id = v.id
               AND b.status IN ('pending', 'confirmed')
               AND b.pickup_on < $3::date
               AND $2::date < CASE WHEN b.return_on > b.pickup_on THEN b.return_on ELSE b.pickup_on + 1 END
           )
         ORDER BY v.id
         FOR UPDATE OF v`,
        [model.name, booking.pickup, end],
      );
      vehicleId = locked.rows[0]?.id || null;
      if (!vehicleId) {
        const error = new Error(
          opts?.emailOptional
            ? "No " + model.name + " is free for those dates. To book it anyway, choose a number plate and approve the overlap."
            : "That vehicle is no longer free for those dates. Please choose another.",
        );
        (error as Error & { status?: number }).status = 409;
        throw error;
      }
    }

    let reference = "";
    let bookingId = "";
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      reference = referenceFor(booking.manual);
      const id = crypto.randomUUID();
      bookingId = id;
      await client.query("SAVEPOINT booking_ref");
      try {
        await client.query(
          `INSERT INTO bookings (
             id, reference, vehicle_id, model_name, customer_name, email, phone,
             pickup_on, return_on, pickup_time, return_time, pickup_location,
             delivery_mode, delivery_summary, delivery_detail, delivery_manual,
             days, daily_rate, hire_total, insurance_total, delivery_fee, total_due,
             ooh, ooh_note, mpesa_code, status, staff_note, confirmed_at, amount_paid, source, held_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11, $12,
             $13, $14, $15, $16,
             $17, $18, $19, $20, $21, $22,
             $23, $24, $25, $26, $27, $28, $29, $30, $31
           )`,
          [
            id,
            reference,
            vehicleId,
            booking.model.name,
            booking.customer.name,
            booking.customer.email,
            booking.customer.phone,
            booking.pickup,
            booking.returnOn,
            booking.pickTime,
            booking.retTime,
            booking.location,
            booking.delivery.mode,
            booking.delivery.summary,
            deliveryDetail(booking),
            booking.manual,
            booking.days,
            booking.model.rate,
            booking.hireTotal,
            booking.insuranceTotal,
            booking.manual ? null : booking.delivery.fee,
            total,
            booking.ooh.any,
            booking.oohNote,
            booking.mpesaCode,
            booking.manual ? "quote" : opts?.confirmed ? "confirmed" : "pending",
            (opts?.staffNote || "").slice(0, 500),
            !booking.manual && opts?.confirmed ? new Date().toISOString() : null,
            amountPaid,
            opts?.emailOptional ? "desk" : "website",
            booking.manual ? null : new Date().toISOString(),
          ],
        );
        inserted = true;
      } catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT booking_ref");
        const code = (error as { code?: string }).code;
        if (code !== "23505") throw error;
      }
    }
    if (!inserted) throw new Error("Could not save the booking. Please try again.");
    if (opts?.documents) {
      await client.query(
        `INSERT INTO booking_documents (booking_id, drivers, signature, agreement_version, schedule)
         VALUES ($1, $2::jsonb, $3::jsonb, $4, $5::jsonb)`,
        [
          bookingId,
          JSON.stringify(opts.documents.drivers),
          JSON.stringify(opts.documents.signature),
          opts.documents.agreementVersion,
          JSON.stringify(
            bookingSchedule({
              reference,
              hirer: { name: booking.customer.name, email: booking.customer.email, phone: booking.customer.phone },
              verification: opts.documents.drivers[0].fromFile
                ? "Licence photo on file from an earlier booking; licence and a valid ID or passport to be presented at handover"
                : "Licence photo uploaded for each driver; licence and a valid ID or passport to be presented at handover",
              drivers: opts.documents.drivers.map((driver) => driver.name),
              vehicle: booking.model.name,
              collect: scheduleWhere(booking, "collect") + ", " + formatDay(booking.pickup) + ", " + booking.pickTime + " EAT",
              ret: scheduleWhere(booking, "return") + ", " + formatDay(booking.returnOn) + ", " + booking.retTime + " EAT",
              price:
                "Hire " + ksh(booking.hireTotal) +
                (booking.insuranceTotal ? " + collision damage waiver " + ksh(booking.insuranceTotal) : "") +
                (booking.manual ? " + delivery (to be quoted)" : booking.delivery.fee ? " + delivery " + ksh(booking.delivery.fee) : "") +
                (discount ? " − discount " + ksh(discount) + " (code " + discountCode + ")" : "") +
                " = " + ksh(total) + " (VAT included)",
              damageLimit: damageLimitFor(booking.model.name, booking.model.category),
              category: booking.model.category,
              waiver: booking.insuranceTotal
                ? ksh(booking.insuranceTotal) + " for " + booking.days + (booking.days === 1 ? " day" : " days")
                : "",
              mileage: mileageFor(booking.model.category),
            }),
          ),
        ],
      );
      if (opts.documents.keepOnFile && booking.customer.email) {
        await client.query(
          `INSERT INTO customer_licences (email, phone_key, customer_name, licence, booking_id, reference, saved_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6, now())
           ON CONFLICT (email) DO UPDATE SET
             phone_key = EXCLUDED.phone_key, customer_name = EXCLUDED.customer_name, licence = EXCLUDED.licence,
             booking_id = EXCLUDED.booking_id, reference = EXCLUDED.reference, saved_at = now()`,
          [
            booking.customer.email.toLowerCase(),
            phoneKey(booking.customer.phone),
            booking.customer.name,
            JSON.stringify(opts.documents.drivers[0].licence),
            bookingId,
            reference,
          ],
        );
      }
    }
    const reviewToken = newReviewToken();
    if (overlapping && opts?.overlap) {
      await client.query(
        `UPDATE bookings SET overlap_approved = true, overlap_note = $2, overlap_by = $3 WHERE id = $1`,
        [bookingId, opts.overlap.note.slice(0, 200), opts.overlap.by.slice(0, 60)],
      );
    }
    if (discount) {
      await client.query(
        `UPDATE bookings SET discount = $2, discount_note = $3, discount_by = 'discount code', discount_at = now() WHERE id = $1`,
        [bookingId, discount, discountNote.slice(0, 200)],
      );
    }
    await client.query(`INSERT INTO reviews (booking_id, token) VALUES ($1, $2)`, [bookingId, reviewToken]);
    await client.query("COMMIT");
    return {
      reviewToken,
      reference,
      status: booking.manual ? "quote" : opts?.confirmed ? "confirmed" : "pending",
      manual: booking.manual,
      model: booking.model.name,
      pickup: booking.pickup,
      returnOn: booking.returnOn,
      pickTime: booking.pickTime,
      retTime: booking.retTime,
      days: booking.days,
      location: booking.location,
      summary: booking.delivery.summary,
      hireTotal: booking.hireTotal,
      insuranceTotal: booking.insuranceTotal,
      deliveryFee: booking.manual ? null : booking.delivery.fee,
      total,
      discount,
      email: booking.customer.email,
      phone: booking.customer.phone,
      message: bookingMessage({
        manual: booking.manual,
        reference,
        total,
        model: booking.model.name,
      }),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function attachPaymentCode(reference: string, email: string, mpesaCode: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const code = mpesaCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (code.length < 5 || code.length > 12) {
    const error = new Error("Enter the M-Pesa transaction code from the payment message.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const result = await db.query(
    `UPDATE bookings
     SET mpesa_code = $1
     WHERE reference = $2 AND lower(email) = lower($3) AND status IN ('pending', 'quote')`,
    [code, reference.trim(), email.trim()],
  );
  if (result.rowCount !== 1) {
    const error = new Error("We could not match that booking. Check the reference and email.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return { ok: true, mpesaCode: code };
}

function mapStaff(row: Record<string, unknown>): StaffBooking {
  const plate = row.vehicle_id ? vehicleById(String(row.vehicle_id))?.plate || null : null;
  return {
    id: String(row.id),
    reference: String(row.reference),
    status: row.status as StaffBooking["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    model: String(row.model_name),
    vehicleId: row.vehicle_id ? String(row.vehicle_id) : null,
    plate,
    customerName: String(row.customer_name),
    email: String(row.email),
    phone: String(row.phone),
    pickup: String(row.pickup_on),
    returnOn: String(row.return_on),
    pickTime: String(row.pickup_time),
    retTime: String(row.return_time),
    days: Number(row.days),
    location: String(row.pickup_location),
    deliverySummary: String(row.delivery_summary),
    deliveryDetail: String(row.delivery_detail || ""),
    hasDocuments: Boolean(row.has_documents),
    source: row.source === "desk" ? "desk" : "website",
    heldAt: row.held_at ? new Date(String(row.held_at)).toISOString() : "",
    paymentLog: Array.isArray(row.payment_log) ? (row.payment_log as StaffBooking["paymentLog"]) : [],
    licenceOnFile: Boolean(row.licence_on_file),
    deliveryManual: Boolean(row.delivery_manual),
    hireTotal: Number(row.hire_total),
    insuranceTotal: Number(row.insurance_total),
    deliveryFee: row.delivery_fee === null || row.delivery_fee === undefined ? null : Number(row.delivery_fee),
    total: Number(row.total_due),
    discount: Number(row.discount || 0),
    overlapApproved: Boolean(row.overlap_approved),
    overlapNote: String(row.overlap_note || ""),
    overlapBy: String(row.overlap_by || ""),
    discountNote: String(row.discount_note || ""),
    discountBy: String(row.discount_by || ""),
    discountAt: row.discount_at ? new Date(String(row.discount_at)).toISOString() : "",
    ooh: Boolean(row.ooh),
    oohNote: String(row.ooh_note || ""),
    mpesaCode: String(row.mpesa_code || ""),
    staffNote: String(row.staff_note || ""),
    // Bookings confirmed before part payments existed have 0 stored; confirmed means paid in full.
    amountPaid:
      row.status === "confirmed" && !Number(row.amount_paid) ? Number(row.total_due) : Number(row.amount_paid || 0),
  };
}

export async function listBookings() {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const result = await db.query(
    `SELECT id, reference, vehicle_id, model_name, customer_name, email, phone,
            pickup_on::text, return_on::text, pickup_time, return_time, pickup_location,
            delivery_mode, delivery_summary, delivery_detail, delivery_manual,
            days, daily_rate, hire_total, insurance_total, delivery_fee, total_due,
            ooh, ooh_note, mpesa_code, status, staff_note, created_at, amount_paid, payment_log,
            source, COALESCE(held_at, created_at) AS held_at, discount, discount_note, discount_by, discount_at,
            overlap_approved, overlap_note, overlap_by,
            EXISTS (SELECT 1 FROM booking_documents d WHERE d.booking_id = bookings.id) AS has_documents,
            COALESCE((SELECT d.drivers->0->>'fromFile' = 'true' FROM booking_documents d WHERE d.booking_id = bookings.id), false)
              AS licence_on_file
     FROM bookings
     -- Every booking still current or upcoming (so one made months ahead never drops off the desk),
     -- plus the 300 most recently made for history.
     WHERE return_on >= (now() AT TIME ZONE 'Africa/Nairobi')::date - 60
        OR id IN (SELECT id FROM bookings ORDER BY created_at DESC LIMIT 300)
     ORDER BY created_at DESC`,
  );
  return result.rows.map((row) => mapStaff(row));
}

function staffError(message: string, status: number) {
  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  return error;
}

function wholeShillings(value: unknown) {
  const text = String(value ?? "").trim().replace(/,/g, "");
  if (!/^\d+$/.test(text)) return null;
  const amount = Number(text);
  if (amount > 500000) return null;
  return amount;
}

async function decideQuote(db: Pool, id: string, staffNote: string, nextStatus: "pending" | "confirmed", deliveryFeeInput: unknown) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{
      model_name: string;
      pickup_on: string;
      return_on: string;
      hire_total: number;
      insurance_total: number;
      delivery_fee: number | null;
      delivery_manual: boolean;
      status: string;
      discount: number;
    }>(
      `SELECT model_name, pickup_on::text, return_on::text, hire_total, insurance_total,
              delivery_fee, delivery_manual, status, discount
       FROM bookings
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );
    const row = current.rows[0];
    if (!row || row.status !== "quote") throw staffError("That booking has already been updated.", 409);

    let fee = row.delivery_fee === null || row.delivery_fee === undefined ? null : Number(row.delivery_fee);
    if (row.delivery_manual || fee === null) {
      fee = wholeShillings(deliveryFeeInput);
      if (fee === null) {
        throw staffError("Enter the delivery charge as a whole number of shillings. Use 0 if there is no delivery charge.", 400);
      }
    }

    const end = exclusiveEnd(row.pickup_on, row.return_on);
    const locked = await client.query<{ id: string }>(
      `SELECT v.id
       FROM vehicles v
       WHERE v.active = true
         AND v.model = $1
         AND NOT EXISTS (
           SELECT 1 FROM bookings b
           WHERE b.vehicle_id = v.id
             AND b.status IN ('pending', 'confirmed')
             AND b.pickup_on < $3::date
             AND $2::date < CASE WHEN b.return_on > b.pickup_on THEN b.return_on ELSE b.pickup_on + 1 END
         )
       ORDER BY v.id
       FOR UPDATE OF v`,
      [row.model_name, row.pickup_on, end],
    );
    const vehicleId = locked.rows[0]?.id;
    if (!vehicleId) throw staffError("No " + row.model_name + " is free for those dates.", 409);

    const total = Math.max(0, Number(row.hire_total) + Number(row.insurance_total) + fee - Number(row.discount || 0));
    const saved = await client.query(
      `UPDATE bookings
       SET status = $2,
           vehicle_id = $3,
           delivery_fee = $4,
           total_due = $5,
           delivery_manual = false,
           amount_paid = CASE WHEN $2 = 'confirmed' THEN GREATEST(amount_paid, $5) ELSE amount_paid END,
           staff_note = CASE WHEN $6 = '' THEN staff_note ELSE $6 END,
           confirmed_at = CASE WHEN $2 = 'confirmed' THEN now() ELSE confirmed_at END,
           held_at = now()
       WHERE id = $1 AND status = 'quote'`,
      [id, nextStatus, vehicleId, fee, total, staffNote],
    );
    if (saved.rowCount !== 1) throw staffError("That booking has already been updated.", 409);
    await client.query("COMMIT");
    return { ok: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type BookingEdit = {
  modelId: string;
  pickup: string;
  returnOn: string;
  pickTime: string;
  retTime: string;
  location: string;
  name: string;
  phone: string;
  email: string;
  insure: boolean;
  oohNote: string;
  mpesaCode: string;
  staffNote: string;
  deliveryFee?: unknown;
  amountPaid?: unknown;
};

// Staff correct a booking on the desk. Dates, times, model, customer details, the collision damage waiver, the M-Pesa code,
// the note and (for a priced delivery) the delivery charge can change. The status stays the same.
// If the model or dates change on a held or paid booking, a free vehicle is found again, keeping the
// current vehicle when it is still free. Totals are recalculated from the model's daily rate.
export async function editBooking(id: string, raw: Partial<BookingEdit>, editedBy: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const text = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  const model = raw.modelId ? modelById(String(raw.modelId)) : null;
  if (!model) throw staffError("Choose a vehicle model.", 400);
  const pickup = text(raw.pickup, 10);
  const returnOn = text(raw.returnOn, 10);
  const pickTime = text(raw.pickTime, 5);
  const retTime = text(raw.retTime, 5);
  const location = text(raw.location, 40);
  const name = text(raw.name, 120);
  const phone = text(raw.phone, 40);
  const email = text(raw.email, 160);
  const oohNote = text(raw.oohNote, 500);
  const mpesaCode = normaliseMpesa(text(raw.mpesaCode, 40));
  const note = text(raw.staffNote, 400);

  if (dayNumber(pickup) === null || dayNumber(returnOn) === null) throw staffError("Choose valid dates.", 400);
  if (returnOn < pickup) throw staffError("The return date must be on or after the pick-up date.", 400);
  if (hireDays(pickup, returnOn) > 90) throw staffError("Hires longer than 90 days are arranged directly.", 400);
  if (!(HOURS as readonly string[]).includes(pickTime) || !(HOURS as readonly string[]).includes(retTime)) {
    throw staffError("Choose a pick-up time and a return time.", 400);
  }
  if (!(PICKUP_LOCATIONS as readonly string[]).includes(location)) throw staffError("Choose a pick-up location.", 400);
  if (name.length < 2) throw staffError("Enter the customer's name.", 400);
  const digits = phone.replace(/\D/g, "");
  if (phone && (digits.length < 9 || digits.length > 15)) throw staffError("Enter a mobile number with at least 9 digits, or leave it blank.", 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw staffError("Enter a valid email address, or leave it blank.", 400);
  if (mpesaCode && (mpesaCode.length < 5 || mpesaCode.length > 12)) throw staffError("Enter a valid M-Pesa code, or leave it blank.", 400);
  const ooh = outOfHours(pickup, returnOn, pickTime, retTime);
  if (ooh.any && oohNote.length < 3) throw staffError("Add a short note about the out-of-hours pick-up or return.", 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{
      status: string;
      vehicle_id: string | null;
      model_name: string;
      pickup_on: string;
      delivery_mode: string;
      delivery_fee: number | null;
      delivery_manual: boolean;
      staff_note: string;
      discount: number;
      overlap_approved: boolean;
    }>(
      `SELECT status, vehicle_id, model_name, pickup_on::text, delivery_mode, delivery_fee, delivery_manual, staff_note, discount,
              overlap_approved
       FROM bookings WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const row = current.rows[0];
    if (!row) throw staffError("That booking was not found.", 404);
    if (row.status === "cancelled") throw staffError("Closed bookings cannot be edited.", 409);
    const today = todayNairobi();
    if (pickup < today && pickup !== row.pickup_on) throw staffError("The pick-up date cannot be moved into the past.", 400);

    // Delivery charge: staff can correct it on a priced delivery. Quotes keep using Hold the vehicle.
    let fee = row.delivery_fee === null || row.delivery_fee === undefined ? null : Number(row.delivery_fee);
    if (row.status !== "quote" && row.delivery_mode !== "none" && raw.deliveryFee !== undefined && raw.deliveryFee !== "") {
      const parsed = wholeShillings(raw.deliveryFee);
      if (parsed === null) throw staffError("Enter the delivery charge as a whole number of shillings.", 400);
      fee = parsed;
    }

    let vehicleId: string | null = row.vehicle_id;
    if (row.status === "pending" || row.status === "confirmed") {
      const end = exclusiveEnd(pickup, returnOn);
      const free = await client.query<{ id: string }>(
        `SELECT v.id
         FROM vehicles v
         WHERE v.active = true
           AND v.model = $1
           AND NOT EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.vehicle_id = v.id
               AND b.id <> $4
               AND b.status IN ('pending', 'confirmed')
               AND b.pickup_on < $3::date
               AND $2::date < CASE WHEN b.return_on > b.pickup_on THEN b.return_on ELSE b.pickup_on + 1 END
           )
         ORDER BY (v.id = $5) DESC, v.id
         FOR UPDATE OF v`,
        [model.name, pickup, end, id, row.vehicle_id || ""],
      );
      vehicleId = free.rows[0]?.id || null;
      // Both bookings in an approved overlap keep their shared vehicle when edited (same model), as long as every
      // booking it still clashes with is part of an approved overlap with this one.
      if (!vehicleId && row.vehicle_id && model.name === row.model_name) {
        const clashes = await client.query<{ overlap_approved: boolean }>(
          `SELECT overlap_approved FROM bookings
           WHERE vehicle_id = $1 AND id <> $2 AND status IN ('pending', 'confirmed')
             AND pickup_on < $4::date
             AND $3::date < CASE WHEN return_on > pickup_on THEN return_on ELSE pickup_on + 1 END`,
          [row.vehicle_id, id, pickup, end],
        );
        if (clashes.rows.every((clash) => clash.overlap_approved || row.overlap_approved)) vehicleId = row.vehicle_id;
      }
      if (!vehicleId) throw staffError("No " + model.name + " is free for those dates.", 409);
    }

    const days = hireDays(pickup, returnOn);
    const hireTotal = days * model.rate;
    const insuranceTotal = raw.insure && model.addon > 0 ? days * model.addon : 0;
    const discount = Number(row.discount || 0);
    if (discount > hireTotal + insuranceTotal + (fee || 0)) {
      throw staffError(
        "The discount of " + ksh(discount) + " is more than the new price of " + ksh(hireTotal + insuranceTotal + (fee || 0)) +
          ". Lower or remove the discount first.",
        400,
      );
    }
    const total = hireTotal + insuranceTotal + (fee || 0) - discount;
    let amountPaid: number | null = null; // null keeps what is stored
    if (raw.amountPaid !== undefined && String(raw.amountPaid).trim() !== "") {
      amountPaid = wholeShillings(raw.amountPaid);
      if (amountPaid === null) throw staffError("Enter the amount paid so far as a whole number of shillings.", 400);
      const priced = !(row.delivery_manual || (row.delivery_mode !== "none" && fee === null));
      if (priced && amountPaid > total) {
        throw staffError("The amount paid so far cannot be more than the total of " + ksh(total) + ".", 400);
      }
    }
    const stamp = "Edited by " + editedBy + " on " + today + ".";
    // Keep the "Added on the desk by …" line at the front (the bell and booking source rely on it).
    const added = /^Added on the desk by [a-z0-9._-]+?\.(\s|$)/i.exec(row.staff_note || "");
    const prefix = added ? added[0].trim() + " " : "";
    const body = note.replace(/^Added on the desk by [a-z0-9._-]+?\.(\s|$)\s*/i, "");
    const staffNote = (prefix + (body ? body + " · " + stamp : stamp)).slice(0, 500);

    await client.query(
      `UPDATE bookings
       SET vehicle_id = $2, model_name = $3, customer_name = $4, email = $5, phone = $6,
           pickup_on = $7, return_on = $8, pickup_time = $9, return_time = $10, pickup_location = $11,
           days = $12, daily_rate = $13, hire_total = $14, insurance_total = $15, delivery_fee = $16, total_due = $17,
           ooh = $18, ooh_note = $19, mpesa_code = $20, staff_note = $21,
           amount_paid = COALESCE($22::integer, amount_paid)
       WHERE id = $1`,
      [
        id,
        vehicleId,
        model.name,
        name,
        email,
        phone,
        pickup,
        returnOn,
        pickTime,
        retTime,
        location,
        days,
        model.rate,
        hireTotal,
        insuranceTotal,
        fee,
        total,
        ooh.any,
        oohNote,
        mpesaCode,
        staffNote,
        amountPaid,
      ],
    );
    await client.query("COMMIT");
    return { ok: true, total };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Staff record a payment found on the M-Pesa or bank statement ("Match a payment" on the desk).
// Adds it to the amount paid, keeps it in the payment log, and confirms the booking once it is paid in full.
// A code already recorded on any booking is refused, so the same payment can't be counted twice.
export async function recordPayment(id: string, raw: { amount?: unknown; code?: unknown }, recordedBy: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const amount = wholeShillings(raw.amount);
  if (amount === null || amount <= 0) throw staffError("Enter the amount received in whole shillings.", 400);
  const code = String(raw.code ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 30);
  if (code && code.length < 4) throw staffError("Enter the M-Pesa code or bank reference, or leave it blank.", 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ status: string; total_due: number; amount_paid: number; mpesa_code: string; payment_log: unknown[]; reference: string }>(
      `SELECT status, total_due, amount_paid, mpesa_code, payment_log, reference FROM bookings WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const row = current.rows[0];
    if (!row) throw staffError("That booking was not found.", 404);
    if (row.status !== "pending" && row.status !== "confirmed") {
      throw staffError("Payments can only be recorded on a held or paid booking.", 409);
    }
    if (code) {
      const clash = await client.query<{ reference: string }>(
        `SELECT reference FROM bookings
         WHERE id <> $1 AND (upper(mpesa_code) = $2 OR payment_log @> jsonb_build_array(jsonb_build_object('code', $2::text)))
         LIMIT 1`,
        [id, code],
      );
      if (clash.rows[0]) throw staffError("Code " + code + " is already recorded on " + clash.rows[0].reference + ".", 409);
      const log = Array.isArray(row.payment_log) ? (row.payment_log as { code?: string }[]) : [];
      if (log.some((entry) => entry.code === code)) throw staffError("Code " + code + " is already recorded on this booking.", 409);
    }
    const total = Number(row.total_due);
    const paidBefore = row.status === "confirmed" && !Number(row.amount_paid) ? total : Number(row.amount_paid);
    const balance = Math.max(0, total - paidBefore);
    if (balance === 0) throw staffError(row.reference + " is already paid in full.", 409);
    if (amount > balance) throw staffError("That is more than the balance of " + ksh(balance) + " on " + row.reference + ".", 400);
    const paid = paidBefore + amount;
    const entry = { code, amount, by: recordedBy.slice(0, 60), at: new Date().toISOString() };
    const updated = await client.query<{ status: string }>(
      `UPDATE bookings
       SET amount_paid = $2,
           payment_log = payment_log || jsonb_build_array($3::jsonb),
           mpesa_code = CASE WHEN mpesa_code = '' AND $4 ~ '^[A-Z0-9]{10}$' AND $4 ~ '[A-Z]' AND $4 ~ '[0-9]' THEN $4 ELSE mpesa_code END,
           status = CASE WHEN $2 >= total_due AND status = 'pending' THEN 'confirmed' ELSE status END,
           confirmed_at = CASE WHEN $2 >= total_due AND status = 'pending' THEN now() ELSE confirmed_at END
       WHERE id = $1
       RETURNING status`,
      [id, paid, JSON.stringify(entry), code],
    );
    await client.query("COMMIT");
    return { ok: true, status: updated.rows[0].status, balance: total - paid, reference: row.reference };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Staff give (or change, or remove) a discount on a booking ("Discount" on the desk booking card).
// The amount is whole shillings off the booking's normal price (hire + waiver + delivery). A reason is required,
// and who gave it and when are kept. 0 removes the discount. The discount can't take the price below what has
// already been paid; a refund is arranged outside the website. A held booking that is now fully paid is confirmed.
export async function setDiscount(id: string, raw: { amount?: unknown; note?: unknown }, givenBy: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const amount = wholeShillings(raw.amount);
  if (amount === null) throw staffError("Enter the discount as a whole number of shillings (0 removes it).", 400);
  const note = String(raw.note ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (amount > 0 && note.length < 3) throw staffError("Add a short reason for the discount.", 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{
      status: string;
      reference: string;
      hire_total: number;
      insurance_total: number;
      delivery_fee: number | null;
      delivery_manual: boolean;
      amount_paid: number;
      total_due: number;
    }>(
      `SELECT status, reference, hire_total, insurance_total, delivery_fee, delivery_manual, amount_paid, total_due
       FROM bookings WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const row = current.rows[0];
    if (!row) throw staffError("That booking was not found.", 404);
    if (row.status === "cancelled") throw staffError("Closed bookings can't be discounted.", 409);
    const normal = Number(row.hire_total) + Number(row.insurance_total) + Number(row.delivery_fee || 0);
    if (amount > normal) throw staffError("The discount can't be more than the normal price of " + ksh(normal) + ".", 400);
    // Bookings confirmed before part payments existed have 0 stored; confirmed means paid in full.
    const paid = row.status === "confirmed" && !Number(row.amount_paid) ? Number(row.total_due) : Number(row.amount_paid);
    const total = normal - amount;
    if (paid > total && !row.delivery_manual) {
      throw staffError(
        ksh(paid) + " has already been paid on " + row.reference + ", so the price can't go below that. " +
          "Arrange a refund with the customer and note it on the booking.",
        409,
      );
    }
    const updated = await client.query<{ status: string }>(
      `UPDATE bookings
       SET discount = $2, discount_note = $3, discount_by = $4, discount_at = CASE WHEN $2 > 0 THEN now() ELSE NULL END,
           total_due = $5,
           amount_paid = $6,
           status = CASE WHEN status = 'pending' AND $6 > 0 AND $6 >= $5 THEN 'confirmed' ELSE status END,
           confirmed_at = CASE WHEN status = 'pending' AND $6 > 0 AND $6 >= $5 THEN now() ELSE confirmed_at END
       WHERE id = $1
       RETURNING status`,
      [id, amount, amount > 0 ? note : "", amount > 0 ? givenBy.slice(0, 60) : "", total, paid],
    );
    await client.query("COMMIT");
    return { ok: true, reference: row.reference, total, discount: amount, status: updated.rows[0].status };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type NewBookingNotice = {
  id: string;
  reference: string;
  customerName: string;
  model: string;
  pickup: string;
  returnOn: string;
  status: string;
  source: "website" | "desk";
  total: number;
  createdAt: string;
  addedBy: string; // the staff member, for desk bookings
  unseen: boolean;
};

// The bell on the desk: the 30 newest bookings (website and desk), except ones this staff member added
// themselves, with when each was made and whether it is newer than the last time they opened the bell.
export async function bookingNotices(username: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const seen = await db.query<{ bookings_seen_at: string }>(`SELECT bookings_seen_at FROM staff_seen WHERE username = $1`, [username]);
  // First time: count only today's bookings as new, so a new login doesn't start with a long list.
  const seenAt = seen.rows[0] ? new Date(String(seen.rows[0].bookings_seen_at)) : new Date(Date.now() - 24 * 36e5);
  const result = await db.query(
    `SELECT id, reference, customer_name, model_name, pickup_on::text, return_on::text, status, source, total_due, created_at, staff_note
     FROM bookings
     WHERE COALESCE(staff_note, '') NOT LIKE $1
     ORDER BY created_at DESC
     LIMIT 30`,
    ["Added on the desk by " + username.replace(/[\\%_]/g, "\\$&") + "%"],
  );
  const notices: NewBookingNotice[] = result.rows.map((row) => {
    const createdAt = new Date(String(row.created_at));
    const desk = /^Added on the desk by ([a-z0-9._-]+?)\.(\s|$)/i.exec(String(row.staff_note || ""));
    return {
      id: String(row.id),
      reference: String(row.reference),
      customerName: String(row.customer_name),
      model: String(row.model_name),
      pickup: String(row.pickup_on),
      returnOn: String(row.return_on),
      status: String(row.status),
      source: row.source === "desk" ? "desk" : "website",
      total: Number(row.total_due),
      createdAt: createdAt.toISOString(),
      addedBy: desk ? desk[1] : "",
      unseen: createdAt > seenAt,
    };
  });
  return { notices, unseen: notices.filter((notice) => notice.unseen).length, seenAt: seenAt.toISOString() };
}

// Opening the bell marks every booking made so far as seen, for this staff member only.
export async function markBookingsSeen(username: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  await db.query(
    `INSERT INTO staff_seen (username, bookings_seen_at) VALUES ($1, now())
     ON CONFLICT (username) DO UPDATE SET bookings_seen_at = now()`,
    [username],
  );
  return { ok: true };
}

// Staff choose which vehicle (by number plate) a held or paid booking uses ("Change vehicle" on the desk card).
// Any active vehicle in the same class (saloon, SUV or 4x4) can be chosen; the booking's model follows the
// vehicle and its price stays the same. A plate already booked for the dates needs either:
// - an approved overlap with a reason (both bookings then share the vehicle), or
// - a swap (`swapWith`): the one booking on that plate moves to this booking's current vehicle, if it is free
//   for that booking's dates. Both moves happen together.
export async function allocateVehicle(
  id: string,
  vehicleIdRaw: unknown,
  allocatedBy: string,
  overlapRaw?: { approve?: unknown; note?: unknown },
  swapWithRaw?: unknown,
) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const vehicleId = String(vehicleIdRaw ?? "").trim().slice(0, 40);
  const overlapNote = String(overlapRaw?.note ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const approve = overlapRaw?.approve === true;
  const swapWith = String(swapWithRaw ?? "").trim().slice(0, 40);
  if (approve && overlapNote.length < 3) throw staffError("Add a short reason for the overlap.", 400);
  const by = allocatedBy.slice(0, 60);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    type Row = { id: string; status: string; reference: string; customer_name: string; model_name: string; pickup_on: string; return_on: string; vehicle_id: string | null };
    const load = async (bookingId: string) =>
      (
        await client.query<Row>(
          `SELECT id::text, status, reference, customer_name, model_name, pickup_on::text, return_on::text, vehicle_id
           FROM bookings WHERE id::text = $1 FOR UPDATE`,
          [bookingId],
        )
      ).rows[0];
    const row = await load(id);
    if (!row) throw staffError("That booking was not found.", 404);
    if (row.status !== "pending" && row.status !== "confirmed") {
      throw staffError("A vehicle can only be chosen for a held or paid booking.", 409);
    }
    const cls = await client.query<{ category: string }>(
      `SELECT category FROM vehicles WHERE id = $1 OR model = $2 ORDER BY (id = $1) DESC LIMIT 1`,
      [row.vehicle_id || "", row.model_name],
    );
    const category = cls.rows[0]?.category || "";
    const chosen = await pickVehicle(client, vehicleId, { category }, row.pickup_on, row.return_on, id);
    const note = (text: string) =>
      `staff_note = left(CASE WHEN staff_note = '' THEN ${text} ELSE staff_note || ' · ' || ${text} END, 500)`;

    if (swapWith) {
      // Swap plates with the one booking on the chosen vehicle.
      if (!row.vehicle_id) throw staffError("This booking has no vehicle to swap. Choose a free plate instead.", 409);
      const other = await load(swapWith);
      if (!other || (other.status !== "pending" && other.status !== "confirmed") || other.vehicle_id !== chosen.id) {
        throw staffError("That booking is no longer on " + chosen.plate + ". Refresh the desk and try again.", 409);
      }
      if (!chosen.clashes.some((c) => c.id === other.id)) {
        throw staffError(other.reference + " isn't on " + chosen.plate + " during these dates, so there's nothing to swap.", 409);
      }
      if (chosen.clashes.some((c) => c.id !== other.id)) {
        throw staffError(chosen.plate + " has more than one booking on these dates, so it can't be swapped.", 409);
      }
      const mine = await pickVehicle(client, row.vehicle_id, { category }, other.pickup_on, other.return_on, other.id);
      const blocking = mine.clashes.filter((c) => c.id !== id);
      if (blocking.length) {
        throw staffError(
          "Can't swap: " + mine.plate + " is booked on " + blocking.map((c) => c.reference).join(", ") + " during " + other.reference + "'s dates.",
          409,
        );
      }
      const today = todayNairobi();
      await client.query(
        `UPDATE bookings SET vehicle_id = $2, model_name = $3, ${note("$4")} WHERE id::text = $1`,
        [id, chosen.id, chosen.model, "Swapped plates with " + other.reference + ": now " + chosen.plate + ", by " + by + " on " + today + "."],
      );
      await client.query(
        `UPDATE bookings SET vehicle_id = $2, model_name = $3, ${note("$4")} WHERE id::text = $1`,
        [other.id, mine.id, mine.model, "Swapped plates with " + row.reference + ": now " + mine.plate + ", by " + by + " on " + today + "."],
      );
      await client.query("COMMIT");
      return { ok: true, reference: row.reference, plate: chosen.plate, overlap: "", swapped: { reference: other.reference, plate: mine.plate } };
    }

    if (chosen.clash && !approve) {
      throw staffError(chosen.plate + " is already booked on " + chosen.clash + " for those dates. Swap plates or approve the overlap.", 409);
    }
    if (chosen.id === row.vehicle_id && !chosen.clash) {
      await client.query("COMMIT");
      return { ok: true, reference: row.reference, plate: chosen.plate, overlap: "", swapped: null };
    }
    const stamp =
      chosen.plate + (chosen.model !== row.model_name ? " (" + chosen.model + ")" : "") + " allocated by " + by + " on " + todayNairobi() +
      (chosen.clash ? ", overlapping " + chosen.clash + " (approved)" : "") + ".";
    await client.query(
      `UPDATE bookings
       SET vehicle_id = $2, model_name = $7,
           overlap_approved = $4, overlap_note = $5, overlap_by = $6,
           ${note("$3")}
       WHERE id::text = $1`,
      [id, chosen.id, stamp, Boolean(chosen.clash), chosen.clash ? overlapNote : "", chosen.clash ? by : "", chosen.model],
    );
    await client.query("COMMIT");
    return { ok: true, reference: row.reference, plate: chosen.plate, overlap: chosen.clash, swapped: null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// "Undo payment confirmed" on the desk, for a booking confirmed by mistake. It goes back to held (the vehicle
// stays held). The amount paid goes back to the payments recorded with "Match a payment"; if those alone
// cover the total, the latest one is taken off too, since that is the payment that confirmed it.
export async function reverseConfirmation(id: string, reversedBy: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ status: string; reference: string; total_due: number; payment_log: unknown }>(
      `SELECT status, reference, total_due, payment_log FROM bookings WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const row = current.rows[0];
    if (!row) throw staffError("That booking was not found.", 404);
    if (row.status !== "confirmed") throw staffError("Only a paid booking can have its payment confirmation undone.", 409);
    const log = Array.isArray(row.payment_log) ? (row.payment_log as PaymentEntry[]) : [];
    let entries = log;
    let removed: PaymentEntry | null = null;
    const sum = (list: PaymentEntry[]) => list.reduce((total, entry) => total + (Number(entry.amount) || 0), 0);
    if (entries.length && sum(entries) >= Number(row.total_due)) {
      removed = entries[entries.length - 1];
      entries = entries.slice(0, -1);
    }
    const paid = Math.min(sum(entries), Number(row.total_due));
    const stamp =
      "Payment confirmation undone by " + reversedBy.slice(0, 60) + " on " + todayNairobi() +
      (removed ? " (removed " + ksh(Number(removed.amount) || 0) + (removed.code ? " " + removed.code : "") + ")" : "") + ".";
    await client.query(
      `UPDATE bookings
       SET status = 'pending',
           confirmed_at = NULL,
           amount_paid = $2,
           payment_log = $3::jsonb,
           mpesa_code = CASE WHEN $4 <> '' AND upper(mpesa_code) = $4 THEN '' ELSE mpesa_code END,
           staff_note = left(CASE WHEN staff_note = '' THEN $5 ELSE staff_note || ' · ' || $5 END, 500)
       WHERE id = $1`,
      [id, paid, JSON.stringify(entries), removed?.code ? String(removed.code).toUpperCase() : "", stamp],
    );
    await client.query("COMMIT");
    return { ok: true, reference: row.reference, paid, removed };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------- Calendar link (staff subscribe from Google Calendar) ----------

// This staff member's private calendar key, made the first time it is asked for. reset makes a new one, so the
// old link stops working (for example if it was shared by mistake).
export async function calendarToken(username: string, reset = false) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const staff = await db.query<{ id: number }>(`SELECT id FROM staff_users WHERE username = $1`, [username]);
  const staffId = staff.rows[0]?.id;
  if (!staffId) throw staffError("Sign in to the hire desk.", 401);
  if (!reset) {
    const existing = await db.query<{ token: string }>(`SELECT token FROM staff_calendar_links WHERE staff_id = $1`, [staffId]);
    if (existing.rows[0]) return existing.rows[0].token;
  }
  const token = crypto.randomBytes(24).toString("base64url");
  await db.query(
    `INSERT INTO staff_calendar_links (staff_id, token) VALUES ($1, $2)
     ON CONFLICT (staff_id) DO UPDATE SET token = EXCLUDED.token, created_at = now()`,
    [staffId, token],
  );
  return token;
}

// The bookings for a calendar link: every held, paid and quoted booking returning from 60 days ago onwards.
// Returns null for an unknown key.
export async function calendarBookings(token: string): Promise<CalendarBooking[] | null> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const owner = await db.query<{ username: string }>(
    `SELECT u.username FROM staff_calendar_links l JOIN staff_users u ON u.id = l.staff_id WHERE l.token = $1`,
    [token],
  );
  // Only logins allowed a calendar link (lib/access.ts); a link stops working if that changes.
  if (!owner.rows[0] || !canUseCalendarLink(owner.rows[0].username)) return null;
  const result = await db.query(
    `SELECT b.id::text, b.reference, b.status, b.customer_name, b.phone, b.email, b.model_name, COALESCE(v.plate, '') AS plate,
            b.pickup_on::text, b.pickup_time, b.return_on::text, b.return_time, b.pickup_location, b.delivery_summary,
            b.total_due, b.amount_paid, b.overlap_approved, b.overlap_note, b.staff_note,
            GREATEST(b.created_at, COALESCE(b.confirmed_at, b.created_at), COALESCE(b.held_at, b.created_at),
                     COALESCE(b.discount_at, b.created_at)) AS updated_at
     FROM bookings b LEFT JOIN vehicles v ON v.id = b.vehicle_id
     WHERE b.status IN ('pending', 'confirmed', 'quote')
       AND b.return_on >= (now() AT TIME ZONE 'Africa/Nairobi')::date - 60
     ORDER BY b.pickup_on`,
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    reference: String(row.reference),
    status: String(row.status),
    customerName: String(row.customer_name),
    phone: String(row.phone || ""),
    email: String(row.email || ""),
    model: String(row.model_name),
    plate: String(row.plate || ""),
    pickup: String(row.pickup_on),
    pickTime: String(row.pickup_time),
    returnOn: String(row.return_on),
    retTime: String(row.return_time),
    location: String(row.pickup_location),
    deliverySummary: String(row.delivery_summary || ""),
    total: Number(row.total_due),
    // Bookings confirmed before part payments existed have 0 stored; confirmed means paid in full.
    amountPaid: row.status === "confirmed" && !Number(row.amount_paid) ? Number(row.total_due) : Number(row.amount_paid || 0),
    overlapApproved: Boolean(row.overlap_approved),
    overlapNote: String(row.overlap_note || ""),
    staffNote: String(row.staff_note || ""),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }));
}

export async function updateBooking(id: string, action: string, note: string, deliveryFee?: unknown) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const staffNote = note.trim().slice(0, 500);
  if (action === "hold" || action === "settle") {
    return decideQuote(db, id, staffNote, action === "settle" ? "confirmed" : "pending", deliveryFee);
  }
  const expected =
    action === "confirm" ? "pending" : action === "release" ? "pending" : action === "cancel" ? "confirmed" : action === "dismiss" ? "quote" : "";
  if (!expected) {
    throw staffError("That action is not available.", 400);
  }
  const nextStatus = action === "confirm" ? "confirmed" : "cancelled";
  const result = await db.query(
    `UPDATE bookings
     SET status = $2,
         staff_note = CASE WHEN $3 = '' THEN staff_note ELSE $3 END,
         confirmed_at = CASE WHEN $2 = 'confirmed' THEN now() ELSE confirmed_at END,
         amount_paid = CASE WHEN $2 = 'confirmed' THEN GREATEST(amount_paid, total_due) ELSE amount_paid END,
         closed_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE closed_at END
     WHERE id = $1 AND status = $4`,
    [id, nextStatus, staffNote, expected],
  );
  if (result.rowCount !== 1) {
    const error = new Error("That booking has already been updated.");
    (error as Error & { status?: number }).status = 409;
    throw error;
  }
  return { ok: true };
}

// ---------- Customer reviews ----------

function newReviewToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function firstNameAndInitial(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.length > 1 ? parts[0] + " " + parts[parts.length - 1][0].toUpperCase() + "." : parts[0];
}

export type ReviewInfo = {
  reference: string;
  model: string;
  pickup: string;
  returnOn: string;
  suggestedName: string;
  status: "requested" | "skipped" | "pending" | "approved" | "hidden";
  started: boolean; // a review can be left once the hire has started
  rating: number | null;
  comment: string;
  displayName: string;
};

async function reviewRow(reference: string, token: string) {
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  const result = await db.query<{
    booking_id: string; reference: string; model_name: string; customer_name: string; pickup_on: string; return_on: string;
    status: ReviewInfo["status"]; rating: number | null; comment: string; display_name: string; booking_status: string;
  }>(
    `SELECT r.booking_id, b.reference, b.model_name, b.customer_name, b.pickup_on::text, b.return_on::text,
            r.status, r.rating, r.comment, r.display_name, b.status AS booking_status
     FROM reviews r JOIN bookings b ON b.id = r.booking_id
     WHERE r.token = $1 AND upper(b.reference) = upper($2)`,
    [token, reference.trim()],
  );
  return result.rows[0] || null;
}

// The customer's review page: only with the booking reference and its private token.
export async function reviewInfo(reference: string, token: string): Promise<ReviewInfo | null> {
  await ensureReady();
  const row = await reviewRow(reference, token);
  if (!row || row.booking_status === "cancelled") return null;
  return {
    reference: row.reference,
    model: row.model_name,
    pickup: row.pickup_on,
    returnOn: row.return_on,
    suggestedName: firstNameAndInitial(row.customer_name),
    status: row.status,
    started: row.pickup_on <= todayNairobi(),
    rating: row.rating,
    comment: row.status === "pending" || row.status === "approved" || row.status === "hidden" ? row.comment : "",
    displayName: row.display_name,
  };
}

export async function submitReview(
  reference: string,
  token: string,
  raw: { action?: unknown; rating?: unknown; comment?: unknown; displayName?: unknown },
) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const row = await reviewRow(reference, token);
  if (!row || row.booking_status === "cancelled") throw staffError("This review link is not valid. Please check it, or contact us.", 404);
  if (row.status === "approved" || row.status === "hidden") throw staffError("Thank you, your review has already been received.", 409);
  if (raw.action === "skip") {
    if (row.status === "requested") {
      await db.query(`UPDATE reviews SET status = 'skipped' WHERE booking_id = $1 AND status = 'requested'`, [row.booking_id]);
    }
    return { ok: true, status: row.status === "requested" ? "skipped" : row.status };
  }
  if (row.pickup_on > todayNairobi()) throw staffError("You can leave a review once your hire has started.", 400);
  const rating = Number(raw.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw staffError("Choose a star rating from 1 to 5.", 400);
  const comment = String(raw.comment ?? "").replace(/\r/g, "").trim().slice(0, 1000);
  const displayName = String(raw.displayName ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || firstNameAndInitial(row.customer_name);
  await db.query(
    `UPDATE reviews SET status = 'pending', rating = $2, comment = $3, display_name = $4, submitted_at = now()
     WHERE booking_id = $1`,
    [row.booking_id, rating, comment, displayName],
  );
  return { ok: true, status: "pending" };
}

export type StaffReview = {
  bookingId: string;
  reference: string;
  customerName: string;
  phone: string;
  model: string;
  pickup: string;
  returnOn: string;
  status: ReviewInfo["status"];
  rating: number | null;
  comment: string;
  displayName: string;
  submittedAt: string;
  decidedBy: string;
};

// Staff only: every review that has been written (pending, approved or hidden), newest first, and counts.
export async function listReviews() {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const result = await db.query<{
    booking_id: string; reference: string; customer_name: string; phone: string; model_name: string; pickup_on: string; return_on: string;
    status: ReviewInfo["status"]; rating: number | null; comment: string; display_name: string; submitted_at: Date | null; decided_by: string;
  }>(
    `SELECT r.booking_id, b.reference, b.customer_name, b.phone, b.model_name, b.pickup_on::text, b.return_on::text,
            r.status, r.rating, r.comment, r.display_name, r.submitted_at, r.decided_by
     FROM reviews r JOIN bookings b ON b.id = r.booking_id
     WHERE r.status IN ('pending', 'approved', 'hidden')
     ORDER BY r.submitted_at DESC NULLS LAST
     LIMIT 500`,
  );
  const counts = await db.query<{ status: string; n: number }>(`SELECT status, COUNT(*)::int AS n FROM reviews GROUP BY status`);
  const byStatus: Record<string, number> = {};
  for (const row of counts.rows) byStatus[row.status] = row.n;
  return {
    reviews: result.rows.map(
      (row): StaffReview => ({
        bookingId: row.booking_id,
        reference: row.reference,
        customerName: row.customer_name,
        phone: row.phone,
        model: row.model_name,
        pickup: row.pickup_on,
        returnOn: row.return_on,
        status: row.status,
        rating: row.rating,
        comment: row.comment,
        displayName: row.display_name,
        submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : "",
        decidedBy: row.decided_by,
      }),
    ),
    counts: byStatus,
  };
}

// Staff approve (shown on the website) or hide a review.
export async function decideReview(bookingId: string, action: string, decidedBy: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const status = action === "approve" ? "approved" : action === "hide" ? "hidden" : "";
  if (!status) throw staffError("That action is not available.", 400);
  const result = await db.query(
    `UPDATE reviews SET status = $2, decided_at = now(), decided_by = $3
     WHERE booking_id = $1 AND status IN ('pending', 'approved', 'hidden')`,
    [bookingId, status, decidedBy.slice(0, 60)],
  );
  if (result.rowCount !== 1) throw staffError("That review was not found.", 404);
  return { ok: true, status };
}

// Staff get a booking's review link (made now for older bookings that have none).
export async function reviewLinkFor(bookingId: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) throw staffError("That booking was not found.", 404);
  await db.query(`INSERT INTO reviews (booking_id, token) VALUES ($1, $2) ON CONFLICT (booking_id) DO NOTHING`, [bookingId, newReviewToken()]);
  const result = await db.query<{ token: string; reference: string; status: string }>(
    `SELECT r.token, b.reference, r.status FROM reviews r JOIN bookings b ON b.id = r.booking_id WHERE r.booking_id = $1`,
    [bookingId],
  );
  const row = result.rows[0];
  if (!row) throw staffError("That booking was not found.", 404);
  return { path: "/review?ref=" + encodeURIComponent(row.reference) + "&t=" + encodeURIComponent(row.token), status: row.status };
}

// Public: approved reviews for the hire page (display name only, no booking details).
export async function publishedReviews() {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const result = await db.query<{ rating: number; comment: string; display_name: string; model_name: string; submitted_at: Date }>(
    `SELECT r.rating, r.comment, r.display_name, b.model_name, r.submitted_at
     FROM reviews r JOIN bookings b ON b.id = r.booking_id
     WHERE r.status = 'approved'
     ORDER BY r.submitted_at DESC
     LIMIT 12`,
  );
  const stats = await db.query<{ n: number; avg: string | null }>(
    `SELECT COUNT(*)::int AS n, AVG(rating)::numeric(3,2)::text AS avg FROM reviews WHERE status = 'approved'`,
  );
  return {
    count: stats.rows[0].n,
    average: stats.rows[0].avg ? Number(stats.rows[0].avg) : null,
    reviews: result.rows.map((row) => ({
      rating: row.rating,
      comment: row.comment,
      name: row.display_name,
      vehicle: row.model_name,
      month: new Date(row.submitted_at).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Nairobi" }),
    })),
  };
}

// Mobile numbers are compared on their last 9 digits, so +254 7… and 07… match.
export function phoneKey(phone: string) {
  return phone.replace(/\D/g, "").slice(-9);
}

// The licence kept on file for a returning customer, if the email and mobile number both match and it is
// less than LICENCE_ON_FILE_MONTHS old. Server only: the image is never sent back to the public site.
export async function findLicenceOnFile(email: string, phone: string): Promise<LicenceOnFile | null> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const cleanEmail = email.trim().toLowerCase();
  const key = phoneKey(phone);
  if (!cleanEmail || key.length < 9) return null;
  const result = await db.query<{ licence: LicenceOnFile["licence"]; saved_at: Date; reference: string }>(
    `SELECT licence, saved_at, reference FROM customer_licences
     WHERE email = $1 AND phone_key = $2 AND saved_at > now() - ($3::int * interval '1 month')`,
    [cleanEmail, key, LICENCE_ON_FILE_MONTHS],
  );
  const row = result.rows[0];
  return row ? { licence: row.licence, savedAt: new Date(row.saved_at).toISOString(), reference: row.reference } : null;
}

export type LicenceOnFileSummary = { email: string; phoneKey: string; name: string; savedAt: string; reference: string; current: boolean };

// Staff only: who has a licence on file (no images).
export async function listLicencesOnFile(): Promise<LicenceOnFileSummary[]> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const result = await db.query<{ email: string; phone_key: string; customer_name: string; saved_at: Date; reference: string; current: boolean }>(
    `SELECT email, phone_key, customer_name, saved_at, reference,
            saved_at > now() - ($1::int * interval '1 month') AS current
     FROM customer_licences ORDER BY saved_at DESC`,
    [LICENCE_ON_FILE_MONTHS],
  );
  return result.rows.map((row) => ({
    email: row.email,
    phoneKey: row.phone_key,
    name: row.customer_name,
    savedAt: new Date(row.saved_at).toISOString(),
    reference: row.reference,
    current: Boolean(row.current),
  }));
}

// Staff remove a licence kept on file, for example when the customer asks. Bookings keep their own copy.
export async function removeLicenceOnFile(email: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const result = await db.query(`DELETE FROM customer_licences WHERE email = $1`, [email.trim().toLowerCase()]);
  if (result.rowCount !== 1) throw staffError("No licence on file for that email.", 404);
  return { ok: true };
}

// Performance analysis (owners only): hire days and income per vehicle per day for one year, built from held and
// paid bookings. Income is the hire and collision damage waiver charges spread evenly over the hire days, net of 16% VAT
// (the hire rates include VAT); delivery charges are left out. Days after today are not counted.
export type PerformanceYear = {
  year: number;
  today: string;
  vehicles: { id: string; plate: string; model: string; category: string; km: number | null }[];
  // days[vehicleId][dayOfYear-1] = income net of VAT that day, or null when the vehicle was not out
  days: Record<string, (number | null)[]>;
};

export async function performanceYear(year: number): Promise<PerformanceYear> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const first = year + "-01-01";
  const last = year + "-12-31";
  const today = todayNairobi();
  const result = await db.query<{ vehicle_id: string; pickup_on: string; return_on: string; days: number; hire_total: number; insurance_total: number; discount: number }>(
    `SELECT vehicle_id, pickup_on::text, return_on::text, days, hire_total, insurance_total, discount
     FROM bookings
     WHERE status IN ('pending', 'confirmed') AND vehicle_id IS NOT NULL
       AND pickup_on <= $2::date AND return_on >= $1::date`,
    [first, last],
  );
  const records = await listVehicleRecords();
  const length = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 864e5;
  const days: PerformanceYear["days"] = {};
  for (const vehicle of FLEET) days[vehicle.id] = Array.from({ length }, () => null);
  const start = Date.UTC(year, 0, 1);
  for (const row of result.rows) {
    const list = days[row.vehicle_id];
    if (!list) continue;
    const n = Math.max(1, Number(row.days));
    // Income after any desk discount (taken off the hire and waiver, never below 0).
    const perDay = Math.max(0, Number(row.hire_total) + Number(row.insurance_total) - Number(row.discount || 0)) / n / 1.16;
    const end = exclusiveEnd(row.pickup_on, row.return_on);
    for (let d = row.pickup_on; d < end; d = addDays(d, 1)) {
      if (d > today || d < first || d > last) continue;
      const index = Math.round((Date.parse(d + "T00:00:00Z") - start) / 864e5);
      list[index] = Math.round(((list[index] || 0) + perDay) * 100) / 100;
    }
  }
  return {
    year,
    today,
    vehicles: FLEET.map((vehicle) => ({
      id: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.make,
      category: vehicle.category,
      km: records[vehicle.id]?.km ?? null,
    })),
    days,
  };
}

export type VehicleRecord = {
  year: number | null;
  km: number | null;
  notes: string;
  updatedAt: string;
  updatedBy: string;
};

// Staff only: the saved record for every vehicle, by vehicle id.
export async function listVehicleRecords(): Promise<Record<string, VehicleRecord>> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const result = await db.query<{
    vehicle_id: string;
    year: number | null;
    odometer_km: number | null;
    notes: string;
    updated_at: Date;
    updated_by: string;
  }>(`SELECT vehicle_id, year, odometer_km, notes, updated_at, updated_by FROM vehicle_records`);
  const out: Record<string, VehicleRecord> = {};
  for (const row of result.rows) {
    out[row.vehicle_id] = {
      year: row.year === null ? null : Number(row.year),
      km: row.odometer_km === null ? null : Number(row.odometer_km),
      notes: row.notes || "",
      updatedAt: new Date(row.updated_at).toISOString(),
      updatedBy: row.updated_by || "",
    };
  }
  return out;
}

// Staff update a vehicle record on the desk. Saving also marks the vehicle as checked after its last return.
export async function updateVehicleRecord(id: string, raw: { year?: unknown; km?: unknown; notes?: unknown }, updatedBy: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!FLEET.some((vehicle) => vehicle.id === id)) throw staffError("That vehicle was not found.", 404);
  const whole = (value: unknown) => {
    const text = String(value ?? "").trim().replace(/[,\s]/g, "");
    if (!text) return null;
    return /^\d+$/.test(text) ? Number(text) : NaN;
  };
  const year = whole(raw.year);
  const thisYear = Number(todayNairobi().slice(0, 4));
  if (year !== null && (Number.isNaN(year) || year < 1950 || year > thisYear + 1)) {
    throw staffError("Enter the year as four digits, for example 2012, or leave it blank.", 400);
  }
  const km = whole(raw.km);
  if (km !== null && (Number.isNaN(km) || km > 3_000_000)) {
    throw staffError("Enter the odometer reading in whole kilometres, or leave it blank.", 400);
  }
  const notes = String(raw.notes ?? "").replace(/\r/g, "").trim().slice(0, 1000);
  await db.query(
    `INSERT INTO vehicle_records (vehicle_id, year, odometer_km, notes, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, now(), $5)
     ON CONFLICT (vehicle_id) DO UPDATE SET
       year = EXCLUDED.year,
       odometer_km = EXCLUDED.odometer_km,
       notes = EXCLUDED.notes,
       updated_at = now(),
       updated_by = EXCLUDED.updated_by`,
    [id, year, km, notes, updatedBy.slice(0, 60)],
  );
  return { ok: true };
}

// Staff only: the licence photos, drivers and signature saved with a booking.
// Staff add or change drivers and licence photos on the desk ("Drivers and licences" in Edit).
// raw.drivers: up to MAX_DRIVERS of { name, phone, photo?: DocImage, keep?: index of a driver already saved
// whose photo stays }. Every driver needs a photo. drivers[0] is the main driver. A booking with no documents
// yet (made on the desk) gets a record marked "not signed online".
export async function saveDeskDrivers(id: string, raw: { drivers?: unknown }, by: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw staffError("That booking was not found.", 404);
  const list = Array.isArray(raw.drivers) ? raw.drivers : [];
  if (!list.length) throw staffError("Keep at least the main driver.", 400);
  if (list.length > MAX_DRIVERS) throw staffError("A booking can have up to " + MAX_DRIVERS + " drivers.", 400);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const booking = await client.query<{ status: string; reference: string }>(
      `SELECT status, reference FROM bookings WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!booking.rows[0]) throw staffError("That booking was not found.", 404);
    if (booking.rows[0].status === "cancelled") throw staffError("Closed bookings can't be changed.", 409);
    const existing = await client.query<{ drivers: DriverDoc[] }>(`SELECT drivers FROM booking_documents WHERE booking_id = $1`, [id]);
    const saved: DriverDoc[] = existing.rows[0]?.drivers || [];
    const now = new Date().toISOString();
    const drivers: DriverDoc[] = list.map((item, index) => {
      const entry = (item || {}) as { name?: unknown; phone?: unknown; photo?: unknown; keep?: unknown };
      const label = index === 0 ? "the main driver" : "driver " + (index + 1);
      const name = String(entry.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
      const phone = String(entry.phone ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
      if (name.length < 2) throw staffError("Enter the name of " + label + ".", 400);
      if (phone && phone.replace(/\D/g, "").length < 9) throw staffError("Enter a mobile number with at least 9 digits for " + label + ", or leave it blank.", 400);
      if (entry.photo) {
        const image = cleanImage(entry.photo, label + "'s licence");
        if (typeof image === "string") throw staffError(image, 400);
        return { name, phone, licence: image, addedBy: by.slice(0, 60), addedAt: now };
      }
      const keep = Number(entry.keep);
      const old = Number.isInteger(keep) ? saved[keep] : undefined;
      if (!old) throw staffError("Add a licence photo for " + label + ".", 400);
      return { ...old, name, phone };
    });
    if (existing.rows[0]) {
      await client.query(`UPDATE booking_documents SET drivers = $2::jsonb WHERE booking_id = $1`, [id, JSON.stringify(drivers)]);
    } else {
      await client.query(
        `INSERT INTO booking_documents (booking_id, drivers, signature, agreement_version, schedule)
         VALUES ($1, $2::jsonb, $3::jsonb, '', NULL)`,
        [id, JSON.stringify(drivers), JSON.stringify({ kind: "none", name: by.slice(0, 60) })],
      );
    }
    await client.query("COMMIT");
    return { ok: true, reference: booking.rows[0].reference, drivers: drivers.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadDocuments(id: string): Promise<StoredDocuments | null> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await db.query<{
    drivers: StoredDocuments["drivers"];
    signature: StoredDocuments["signature"];
    agreement_version: string;
    signed_at: Date;
    schedule: StoredDocuments["schedule"];
  }>(
    `SELECT drivers, signature, agreement_version, signed_at, schedule FROM booking_documents WHERE booking_id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    drivers: row.drivers,
    signature: row.signature,
    agreementVersion: row.agreement_version,
    signedAt: new Date(row.signed_at).toISOString(),
    schedule: row.schedule || null,
  };
}

export async function staffReady() {
  await ensureReady();
  const db = pool();
  if (!db) return false;
  const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM staff_users");
  return count.rows[0].n > 0;
}

function checkedStaffCredentials(username: string, password: string) {
  const name = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(name)) {
    const error = new Error("Use 3 to 40 characters: letters, numbers, dots, underscores, or hyphens.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  if (password.length < 8 || password.length > 200) {
    const error = new Error("Use a password of 8 to 200 characters.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  return name;
}

export async function listStaff() {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const result = await db.query<{ username: string }>("SELECT username FROM staff_users ORDER BY username");
  return result.rows.map((row) => ({ username: row.username }));
}

export async function createStaff(username: string, password: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const name = checkedStaffCredentials(username, password);
  const { salt, hash } = hashPassword(password);
  try {
    await db.query("INSERT INTO staff_users (username, password_hash, salt) VALUES ($1, $2, $3)", [name, hash, salt]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const taken = new Error("That username is already in use.");
      (taken as Error & { status?: number }).status = 409;
      throw taken;
    }
    throw error;
  }
  return { username: name };
}

export async function loginStaff(username: string, password: string) {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const ready = await staffReady();
  if (!ready) {
    const error = new Error(SETUP_MESSAGE);
    (error as Error & { status?: number }).status = 503;
    throw error;
  }
  const name = username.trim().toLowerCase().slice(0, 60);
  // After LOGIN_LIMIT wrong attempts on a username within 15 minutes, refuse further tries for a while.
  const recent = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM staff_login_failures WHERE username = $1 AND at > now() - interval '15 minutes'`,
    [name],
  );
  if (recent.rows[0].n >= LOGIN_LIMIT) {
    const error = new Error("Too many attempts. Please wait 15 minutes and try again.");
    (error as Error & { status?: number }).status = 429;
    throw error;
  }
  const found = await db.query<{ id: number; password_hash: string; salt: string }>(
    "SELECT id, password_hash, salt FROM staff_users WHERE username = $1",
    [name],
  );
  const row = found.rows[0];
  const matches = row ? passwordMatches(password, row.salt, row.password_hash) : passwordMatches(password, "00".repeat(16), crypto.pbkdf2Sync("dummy-password", "00".repeat(16), 100000, 64, "sha512").toString("hex"));
  if (!row || !matches) {
    await db.query(`INSERT INTO staff_login_failures (username) VALUES ($1)`, [name]);
    const error = new Error("Those details were not recognised.");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  // Tidy up: this user's failed attempts, old failures, and expired sessions.
  await db.query(`DELETE FROM staff_login_failures WHERE username = $1 OR at < now() - interval '1 day'`, [name]);
  await db.query(`DELETE FROM staff_sessions WHERE expires_at < now()`);
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.query("INSERT INTO staff_sessions (token_hash, staff_id, expires_at) VALUES ($1, $2, $3)", [
    tokenHash(token),
    row.id,
    expires.toISOString(),
  ]);
  return { token, username: name, maxAge: SESSION_DAYS * 86400 };
}

export async function staffFromToken(token: string | undefined) {
  if (!token) return null;
  await ensureReady();
  const db = pool();
  if (!db) return null;
  const result = await db.query<{ username: string }>(
    `SELECT u.username
     FROM staff_sessions s
     JOIN staff_users u ON u.id = s.staff_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash(token)],
  );
  return result.rows[0] || null;
}

export async function logoutStaff(token: string | undefined) {
  if (!token || !pool()) return;
  await ensureReady();
  await pool()!.query("DELETE FROM staff_sessions WHERE token_hash = $1", [tokenHash(token)]);
}

export function httpStatus(error: unknown) {
  const status = (error as { status?: number }).status;
  return status && status >= 400 && status < 600 ? status : 500;
}

export function publicError(error: unknown) {
  const status = httpStatus(error);
  if (status === 500) {
    console.error("hire db", redact(error));
    return "The booking desk could not be reached. Please call or WhatsApp us.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
