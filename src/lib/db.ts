import crypto from "crypto";
import { Pool, type PoolClient } from "pg";
import { FLEET, fleetModels, modelById, vehicleById } from "./fleet";
import {
  addDays,
  assessBooking,
  assessmentError,
  bookingMessage,
  dateProblem,
  exclusiveEnd,
  hireDays,
  rangesOverlap,
  todayNairobi,
  type AvailabilityResponse,
  type BookingInput,
  type PublicBookingResult,
  type PublicModelCard,
  type StaffBooking,
} from "./hire";

const SESSION_DAYS = 14;
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
    CREATE INDEX IF NOT EXISTS bookings_vehicle_status_idx ON bookings (vehicle_id, status);
    CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at DESC);
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
      tag: model.tag,
      seatsText: model.seatsText,
      gear: model.gear,
      fuel: model.fuel,
      mileage: model.mileage,
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

function deliveryDetail(booking: { delivery: { kmText: string; breakdown: string }; directions: string; note: string }) {
  return [booking.delivery.kmText, booking.delivery.breakdown, booking.directions ? "Directions: " + booking.directions : "", booking.note ? "Note: " + booking.note : ""]
    .filter(Boolean)
    .join("\n");
}

export async function createBooking(raw: Partial<BookingInput>): Promise<PublicBookingResult> {
  await ensureReady();
  const db = pool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const model = raw.modelId ? modelById(String(raw.modelId)) : null;
  const assessed = assessBooking(model, raw);
  const problem = assessmentError(assessed);
  if (problem || !assessed.ok) {
    const error = new Error(problem || "The booking could not be checked.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const booking = assessed.booking;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    let vehicleId: string | null = null;
    if (!booking.manual && model) {
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
        const error = new Error("That vehicle is no longer free for those dates. Please choose another.");
        (error as Error & { status?: number }).status = 409;
        throw error;
      }
    }

    let reference = "";
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      reference = referenceFor(booking.manual);
      const id = crypto.randomUUID();
      await client.query("SAVEPOINT booking_ref");
      try {
        await client.query(
          `INSERT INTO bookings (
             id, reference, vehicle_id, model_name, customer_name, email, phone,
             pickup_on, return_on, pickup_time, return_time, pickup_location,
             delivery_mode, delivery_summary, delivery_detail, delivery_manual,
             days, daily_rate, hire_total, insurance_total, delivery_fee, total_due,
             ooh, ooh_note, mpesa_code, status
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11, $12,
             $13, $14, $15, $16,
             $17, $18, $19, $20, $21, $22,
             $23, $24, $25, $26
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
            booking.total,
            booking.ooh.any,
            booking.oohNote,
            booking.mpesaCode,
            booking.manual ? "quote" : "pending",
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
    await client.query("COMMIT");
    return {
      reference,
      status: booking.manual ? "quote" : "pending",
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
      total: booking.total,
      email: booking.customer.email,
      phone: booking.customer.phone,
      message: bookingMessage({
        manual: booking.manual,
        reference,
        total: booking.total,
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
    deliveryManual: Boolean(row.delivery_manual),
    hireTotal: Number(row.hire_total),
    insuranceTotal: Number(row.insurance_total),
    deliveryFee: row.delivery_fee === null || row.delivery_fee === undefined ? null : Number(row.delivery_fee),
    total: Number(row.total_due),
    ooh: Boolean(row.ooh),
    oohNote: String(row.ooh_note || ""),
    mpesaCode: String(row.mpesa_code || ""),
    staffNote: String(row.staff_note || ""),
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
            ooh, ooh_note, mpesa_code, status, staff_note, created_at
     FROM bookings
     ORDER BY created_at DESC
     LIMIT 300`,
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
    }>(
      `SELECT model_name, pickup_on::text, return_on::text, hire_total, insurance_total,
              delivery_fee, delivery_manual, status
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

    const total = Number(row.hire_total) + Number(row.insurance_total) + fee;
    const saved = await client.query(
      `UPDATE bookings
       SET status = $2,
           vehicle_id = $3,
           delivery_fee = $4,
           total_due = $5,
           delivery_manual = false,
           staff_note = CASE WHEN $6 = '' THEN staff_note ELSE $6 END,
           confirmed_at = CASE WHEN $2 = 'confirmed' THEN now() ELSE confirmed_at END
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
  const name = username.trim().toLowerCase();
  const found = await db.query<{ id: number; password_hash: string; salt: string }>(
    "SELECT id, password_hash, salt FROM staff_users WHERE username = $1",
    [name],
  );
  const row = found.rows[0];
  const matches = row ? passwordMatches(password, row.salt, row.password_hash) : passwordMatches(password, "00".repeat(16), crypto.pbkdf2Sync("dummy-password", "00".repeat(16), 100000, 64, "sha512").toString("hex"));
  if (!row || !matches) {
    const error = new Error("Those details were not recognised.");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
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
