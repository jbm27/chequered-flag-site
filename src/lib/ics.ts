// Builds the hire desk calendar feed (an .ics file) that staff subscribe to from Google Calendar, Apple
// Calendar or Outlook. Plain text in the iCalendar format (RFC 5545); no library needed.

export type CalendarBooking = {
  id: string;
  reference: string;
  status: string;
  customerName: string;
  phone: string;
  email: string;
  model: string;
  plate: string;
  pickup: string; // YYYY-MM-DD, Nairobi
  pickTime: string; // HH:MM, Nairobi
  returnOn: string;
  retTime: string;
  location: string;
  deliverySummary: string;
  total: number;
  amountPaid: number;
  overlapApproved: boolean;
  overlapNote: string;
  staffNote: string;
  updatedAt: string; // ISO
};

const STATUS: Record<string, string> = { pending: "Held", confirmed: "Confirmed", quote: "Delivery quote, not held" };

// The payment state at the start of each event title (Homer: no payment colours in Google, a word instead).
function paymentWord(b: CalendarBooking) {
  if (b.status === "quote") return "Quote";
  if (b.amountPaid >= b.total && b.total > 0) return "Paid";
  if (b.amountPaid > 0) return "Part-paid";
  return "Awaiting payment";
}

// Whole-day events, so Google shows one bar from the day the vehicle goes out to the day it comes back,
// like the desk calendar. DTEND for a whole-day event is the day after the last day.
function dateValue(day: string, plusDays = 0) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + plusDays));
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function isoStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function text(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 bytes are folded onto continuation lines that start with a space.
function fold(line: string) {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const char of line) {
    if (bytes.encode(current + char).length > (out.length ? 74 : 75)) {
      out.push(current);
      current = char;
    } else current += char;
  }
  out.push(current);
  return out.join("\r\n ");
}

function ksh(amount: number) {
  return "KSh " + Math.round(amount).toLocaleString("en-US");
}

export function buildCalendar(bookings: CalendarBooking[], deskUrl: string, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Chequered Flag//Hire desk//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Chequered Flag hire bookings",
    "X-WR-TIMEZONE:Africa/Nairobi",
    "X-WR-CALDESC:Vehicle hire bookings from the Chequered Flag hire desk",
    // Yellow for hire bookings. Google Calendar ignores this (set the calendar's colour to Banana there);
    // Apple Calendar and some others use it.
    "COLOR:gold",
    "X-APPLE-CALENDAR-COLOR:#F6BF26",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const stamp = isoStamp(now.toISOString());
  for (const b of bookings) {
    const vehicle = (b.plate ? b.plate + " " : "") + b.model;
    const balance = Math.max(0, b.total - b.amountPaid);
    const summary = paymentWord(b) + " · " + (b.overlapApproved ? "⇄ " : "") + b.customerName + " · " + vehicle;
    const description = [
      b.reference + " · " + paymentWord(b) + " · " + (STATUS[b.status] || b.status),
      "Customer: " + b.customerName,
      b.phone ? "Phone: " + b.phone : "Phone: not given",
      b.email ? "Email: " + b.email : "",
      "Vehicle: " + vehicle,
      "Goes out: " + b.pickup + " at " + b.pickTime + " · Comes back: " + b.returnOn + " at " + b.retTime,
      b.deliverySummary ? "Delivery: " + b.deliverySummary : "",
      "Total: " + ksh(b.total) + " · Paid: " + ksh(b.amountPaid) + " · Balance: " + ksh(balance),
      b.overlapApproved ? "Approved overlap on this vehicle" + (b.overlapNote ? ": " + b.overlapNote : "") : "",
      b.staffNote ? "Note: " + b.staffNote : "",
      "Open the hire desk: " + deskUrl,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + b.id + "@thechequeredflag.net",
      "DTSTAMP:" + stamp,
      "LAST-MODIFIED:" + isoStamp(b.updatedAt),
      "DTSTART;VALUE=DATE:" + dateValue(b.pickup),
      "DTEND;VALUE=DATE:" + dateValue(b.returnOn >= b.pickup ? b.returnOn : b.pickup, 1),
      "SUMMARY:" + text(summary),
      "LOCATION:" + text(b.deliverySummary || b.location),
      "DESCRIPTION:" + text(description),
      "STATUS:" + (b.status === "quote" ? "TENTATIVE" : "CONFIRMED"),
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
