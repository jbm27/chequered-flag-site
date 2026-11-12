// Shared hire rules from Homer's booking page.
// Payment is the full hire amount. Nothing is charged on the website.

export const YARD = { lat: -1.3185853, lng: 36.7161047, name: "Chequered Flag, Karen" };

export const PRICING = { base: 1000, perKm: 50, freeKm: 5, maxKm: 150, roadFactor: 1.3 };

export const PICKUP_LOCATIONS = ["Nairobi – Karen", "JKIA Airport", "Wilson Airport"] as const;

export const HOURS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
] as const;

export const DELIVERY_LABELS = {
  none: "No delivery",
  deliver: "Deliver to me",
  both: "Deliver and collect from me",
} as const;

export type DeliveryMode = keyof typeof DELIVERY_LABELS;

export type Place = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  outside?: boolean;
};

export const PLACES: Place[] = [
  { id: "village-market", name: "Village Market", area: "Gigiri", lat: -1.2297, lng: 36.8045 },
  { id: "tribe-hotel", name: "Tribe Hotel", area: "Gigiri", lat: -1.2305, lng: 36.804 },
  { id: "sarit-centre", name: "Sarit Centre", area: "Westlands", lat: -1.2611, lng: 36.8027 },
  { id: "westgate-mall", name: "Westgate Mall", area: "Westlands", lat: -1.257, lng: 36.803 },
  { id: "kenyatta-avenue", name: "Kenyatta Avenue", area: "Nairobi CBD", lat: -1.2864, lng: 36.8172 },
  { id: "yaya-centre", name: "Yaya Centre", area: "Kilimani", lat: -1.2923, lng: 36.788 },
  { id: "junction-mall", name: "The Junction Mall", area: "Ngong Road", lat: -1.2985, lng: 36.762 },
  { id: "two-rivers", name: "Two Rivers Mall", area: "Limuru Road", lat: -1.212, lng: 36.795 },
  { id: "syokimau", name: "Syokimau", area: "Machakos County", lat: -1.37, lng: 36.933, outside: true },
  { id: "thika", name: "Thika town", area: "Kiambu County", lat: -1.0333, lng: 37.0693 },
  { id: "machakos", name: "Machakos town", area: "Machakos County", lat: -1.5177, lng: 37.2634 },
  { id: "naivasha", name: "Lake Naivasha Country Club", area: "Naivasha", lat: -0.766, lng: 36.431 },
  { id: "nakuru", name: "Nakuru town", area: "Nakuru County", lat: -0.3031, lng: 36.08 },
  { id: "nanyuki", name: "Nanyuki town", area: "Laikipia County", lat: 0.0167, lng: 37.0728 },
  { id: "mombasa", name: "Mombasa", area: "Mombasa County", lat: -4.0435, lng: 39.6682 },
];

export type QuoteModel = {
  id: string;
  name: string;
  rate: number;
  addon: number;
};

export type BookingInput = {
  modelId: string;
  pickup: string;
  returnOn: string;
  pickTime: string;
  retTime: string;
  location: string;
  delivery: string;
  placeId: string;
  address: string;
  directions: string;
  note: string;
  insure: boolean;
  name: string;
  email: string;
  phone: string;
  oohNote: string;
  mpesaCode: string;
  terms: boolean;
};

export type DeliveryAssessment = {
  mode: DeliveryMode;
  label: string;
  summary: string;
  fee: number | null;
  manual: boolean;
  tooFar: boolean;
  km: number | null;
  kmText: string;
  breakdown: string;
  message: string;
  placeLabel: string;
};

export type OutOfHours = {
  any: boolean;
  pick: boolean;
  ret: boolean;
  title: string;
};

export type PricedBooking = {
  model: QuoteModel;
  pickup: string;
  returnOn: string;
  pickTime: string;
  retTime: string;
  location: string;
  days: number;
  ooh: OutOfHours;
  delivery: DeliveryAssessment;
  hireTotal: number;
  insuranceTotal: number;
  total: number;
  manual: boolean;
  mpesaCode: string;
  customer: { name: string; email: string; phone: string };
  oohNote: string;
  directions: string;
  note: string;
};

const HOUR_SET = new Set<string>(HOURS);
const LOCATION_SET = new Set<string>(PICKUP_LOCATIONS);

export function ksh(n: number) {
  return "KSh " + Math.round(n).toLocaleString("en-US");
}

export function todayNairobi() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

export function dayNumber(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return Math.floor(date.getTime() / 86400000);
}

export function addDays(iso: string, days: number) {
  const n = dayNumber(iso);
  if (n === null) return iso;
  return new Date((n + days) * 86400000).toISOString().slice(0, 10);
}

export function formatDay(iso: string) {
  const n = dayNumber(iso);
  if (n === null) return iso;
  return new Date(n * 86400000).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDayShort(iso: string) {
  const n = dayNumber(iso);
  if (n === null) return iso;
  return new Date(n * 86400000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function hireDays(pickup: string, returnOn: string) {
  const start = dayNumber(pickup);
  const end = dayNumber(returnOn);
  if (start === null || end === null || end < start) return 0;
  return Math.max(1, end - start);
}

export function exclusiveEnd(pickup: string, returnOn: string) {
  if (returnOn > pickup) return returnOn;
  return addDays(pickup, 1);
}

export function rangesOverlap(pickup: string, returnOn: string, otherPickup: string, otherReturn: string) {
  return pickup < exclusiveEnd(otherPickup, otherReturn) && otherPickup < exclusiveEnd(pickup, returnOn);
}

export function dateProblem(pickup: string, returnOn: string) {
  const today = todayNairobi();
  if (!pickup || !returnOn) return "Choose a pick-up date and a return date.";
  if (dayNumber(pickup) === null || dayNumber(returnOn) === null) return "Choose a valid pick-up and return date.";
  if (pickup < today) return "The pick-up date cannot be in the past.";
  if (returnOn < pickup) return "The return date must be on or after the pick-up date.";
  const span = dayNumber(returnOn)! - dayNumber(pickup)!;
  if (span > 90) return "Please call us for hires longer than 90 days.";
  if (pickup > addDays(today, 365)) return "Please choose a pick-up date within the next year.";
  return "";
}

export function outOfHours(pickup: string, returnOn: string, pickTime: string, retTime: string): OutOfHours {
  const check = (date: string, time: string) => {
    const n = dayNumber(date);
    if (n === null || !time) return false;
    const dow = new Date(n * 86400000).getUTCDay();
    const hm = time.slice(0, 5);
    if (dow === 0) return true;
    if (dow === 6) return hm < "08:00" || hm > "13:00";
    return hm < "08:00" || hm > "17:00";
  };
  const pick = check(pickup, pickTime);
  const ret = check(returnOn, retTime);
  const title =
    pick && ret
      ? "Your pick-up and return are outside our opening hours"
      : pick
        ? "Your pick-up time is outside our opening hours"
        : "Your return time is outside our opening hours";
  return { any: pick || ret, pick, ret, title };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

export function inNairobi(lat: number, lng: number) {
  return haversineKm(-1.2864, 36.8172, lat, lng) <= 16;
}

export function roadKm(lat: number, lng: number) {
  return Math.max(1, Math.round(haversineKm(YARD.lat, YARD.lng, lat, lng) * PRICING.roadFactor));
}

export function placeById(id: string) {
  return PLACES.find((place) => place.id === id) || null;
}

export function quoteDelivery(input: {
  delivery: DeliveryMode;
  place: Place | null;
  address: string;
  location: string;
  ooh: OutOfHours;
  directions: string;
  note: string;
}): DeliveryAssessment {
  const label = DELIVERY_LABELS[input.delivery];
  if (input.delivery === "none") {
    return {
      mode: "none",
      label,
      summary: "Collect at " + input.location,
      fee: 0,
      manual: false,
      tooFar: false,
      km: null,
      kmText: "",
      breakdown: "",
      message: "Collection from Karen, JKIA, or Wilson Airport is included.",
      placeLabel: "",
    };
  }

  const address = input.address.trim();
  if (!input.place) {
    return {
      mode: input.delivery,
      label,
      summary: address ? "Delivery address: " + address : label,
      fee: null,
      manual: true,
      tooFar: false,
      km: null,
      kmText: "",
      breakdown: "",
      message: "We will price this delivery and tell you the full amount before you pay. The vehicle is not held yet.",
      placeLabel: address,
    };
  }

  const place = input.place;
  const nbi = !place.outside && inNairobi(place.lat, place.lng);
  const km = roadKm(place.lat, place.lng);
  const kmText =
    "About " + km + " km by road from our yard in Karen" + (nbi ? ", inside Nairobi" : ", outside Nairobi");
  const trips = [{ name: "Delivery", late: input.ooh.pick }].concat(
    input.delivery === "both" ? [{ name: "Collection", late: input.ooh.ret }] : [],
  );
  const charged = trips.filter((trip) => !(nbi && !trip.late));
  const placeLabel = place.name + ", " + place.area;
  const returned = input.delivery === "both" ? ", and collected from there" : ". You return it to " + input.location;
  const summary =
    "Delivered to " +
    placeLabel +
    returned +
    (input.directions.trim() ? ". Directions: " + input.directions.trim() : "");

  if (charged.length && km > PRICING.maxKm) {
    return {
      mode: input.delivery,
      label,
      summary,
      fee: null,
      manual: true,
      tooFar: true,
      km,
      kmText,
      breakdown: "",
      message:
        "This is more than " +
        PRICING.maxKm +
        " km away, so we price it by hand. Send a request and we will contact you with the full amount before you pay. The vehicle is not held yet.",
      placeLabel,
    };
  }

  const perTrip = Math.ceil((PRICING.base + Math.max(0, km - PRICING.freeKm) * PRICING.perKm) / 50) * 50;
  const fee = perTrip * charged.length;
  const breakdown = trips
    .map((trip) => {
      const freeTrip = nbi && !trip.late;
      const lateNote = trip.late && nbi ? " (out of hours)" : "";
      return trip.name + " " + (freeTrip ? "free" : ksh(perTrip) + lateNote);
    })
    .join(" · ");

  return {
    mode: input.delivery,
    label,
    summary,
    fee,
    manual: false,
    tooFar: false,
    km,
    kmText,
    breakdown,
    message: fee
      ? "The delivery charge is included in the full amount due now."
      : "Free delivery: inside Nairobi during our opening hours.",
    placeLabel,
  };
}

function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function normaliseMpesa(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export type BookingAssessment = { ok: true; booking: PricedBooking } | { ok: false; error: string };

export function assessmentError(result: BookingAssessment) {
  return "error" in result ? result.error : "";
}

export function assessBooking(model: QuoteModel | null, raw: Partial<BookingInput>): BookingAssessment {
  if (!model) return { ok: false, error: "Choose a vehicle." };
  const pickup = cleanText(raw.pickup, 10);
  const returnOn = cleanText(raw.returnOn, 10);
  const dates = dateProblem(pickup, returnOn);
  if (dates) return { ok: false, error: dates };

  const pickTime = cleanText(raw.pickTime, 5);
  const retTime = cleanText(raw.retTime, 5);
  if (!HOUR_SET.has(pickTime) || !HOUR_SET.has(retTime)) return { ok: false, error: "Choose a pick-up time and a return time." };

  const location = cleanText(raw.location, 40);
  if (!LOCATION_SET.has(location)) return { ok: false, error: "Choose a pick-up location." };

  const delivery = cleanText(raw.delivery, 16);
  if (delivery !== "none" && delivery !== "deliver" && delivery !== "both") {
    return { ok: false, error: "Choose how you would like to collect the vehicle." };
  }

  const place = raw.placeId ? placeById(cleanText(raw.placeId, 40)) : null;
  if (raw.placeId && !place && delivery !== "none") {
    return { ok: false, error: "Choose a delivery place from the list, or type the address for a quote." };
  }

  const address = cleanText(raw.address, 180);
  const directions = cleanText(raw.directions, 400);
  const note = cleanText(raw.note, 500);
  const ooh = outOfHours(pickup, returnOn, pickTime, retTime);
  const oohNote = cleanText(raw.oohNote, 500);
  if (ooh.any && oohNote.length < 3) {
    return { ok: false, error: "Please add a short note about the out-of-hours pick-up or return." };
  }

  const quoted = quoteDelivery({
    delivery,
    place: delivery === "none" ? null : place,
    address,
    location,
    ooh,
    directions,
    note,
  });
  if (delivery !== "none" && !place && address.length < 3) {
    return { ok: false, error: "Search for a delivery place, or type the address." };
  }
  if (quoted.manual && note.length < 5) {
    return { ok: false, error: "Add the delivery details so we can price it before you pay." };
  }

  const name = cleanText(raw.name, 120);
  const email = cleanText(raw.email, 160);
  const phone = cleanText(raw.phone, 40);
  if (name.length < 2) return { ok: false, error: "Please enter your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return { ok: false, error: "Please enter a mobile number with at least 9 digits." };
  if (!raw.terms) return { ok: false, error: "Please confirm that you meet the driver requirements." };

  const mpesaCode = normaliseMpesa(cleanText(raw.mpesaCode, 40));
  if (mpesaCode && (mpesaCode.length < 5 || mpesaCode.length > 12)) {
    return { ok: false, error: "Enter the M-Pesa transaction code, or leave it blank until you have paid." };
  }

  const days = hireDays(pickup, returnOn);
  const insure = Boolean(raw.insure) && model.addon > 0;
  const hireTotal = days * model.rate;
  const insuranceTotal = insure ? days * model.addon : 0;
  const deliveryFee = quoted.manual ? 0 : quoted.fee || 0;
  const total = hireTotal + insuranceTotal + deliveryFee;

  return {
    ok: true,
    booking: {
      model,
      pickup,
      returnOn,
      pickTime,
      retTime,
      location,
      days,
      ooh,
      delivery: quoted,
      hireTotal,
      insuranceTotal,
      total,
      manual: quoted.manual,
      mpesaCode,
      customer: { name, email, phone },
      oohNote,
      directions,
      note,
    },
  };
}

export function bookingMessage(input: { manual: boolean; reference: string; total: number; model: string }) {
  if (input.manual) {
    return (
      "Request " +
      input.reference +
      ". We will contact you with the full amount, including delivery, before you pay. The vehicle is not held yet."
    );
  }
  return (
    "Reference " +
    input.reference +
    ". " +
    input.model +
    " is held for you. Pay " +
    ksh(input.total) +
    " in full by M-Pesa or bank transfer and quote this reference. We confirm the booking once we have checked the payment. Nothing is taken on this page."
  );
}

export type PublicModelCard = {
  id: string;
  name: string;
  group: "saloon" | "4x4";
  tag: string;
  seatsText: string;
  gear: string;
  fuel: string;
  mileage: string;
  count: number;
  rate: number;
  addon: number;
  free: number;
  available: boolean;
  hireTotal: number;
  dayFree: number[];
  nextFree: string | null;
};

export type AvailabilityResponse = {
  pickup: string;
  returnOn: string;
  days: number;
  today: string;
  rangeLabel: string;
  calendar: string[];
  models: PublicModelCard[];
};

export type PublicBookingResult = {
  reference: string;
  status: "pending" | "quote";
  manual: boolean;
  model: string;
  pickup: string;
  returnOn: string;
  pickTime: string;
  retTime: string;
  days: number;
  location: string;
  summary: string;
  hireTotal: number;
  insuranceTotal: number;
  deliveryFee: number | null;
  total: number;
  email: string;
  phone: string;
  message: string;
};

export type StaffBooking = {
  id: string;
  reference: string;
  status: "pending" | "confirmed" | "quote" | "cancelled";
  createdAt: string;
  model: string;
  plate: string | null;
  customerName: string;
  email: string;
  phone: string;
  pickup: string;
  returnOn: string;
  pickTime: string;
  retTime: string;
  days: number;
  location: string;
  deliverySummary: string;
  deliveryDetail: string;
  deliveryManual: boolean;
  hireTotal: number;
  insuranceTotal: number;
  deliveryFee: number | null;
  total: number;
  ooh: boolean;
  oohNote: string;
  mpesaCode: string;
  staffNote: string;
};
