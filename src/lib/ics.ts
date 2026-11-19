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

const STATUS: Record<string, string> = { pending: "Held, awaiting payment", confirmed: "Paid", quote: "Delivery quote, not held" };
const SHORT: Record<string, string> = { pending: "Held", confirmed: "Paid", quote: "Quote" };

// Nairobi is UTC+3 all year, so local times convert to UTC by taking 3 hours off.
function utcStamp(day: string, time: string) {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = (time || "09:00").split(":").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, (h || 0) - 3, min || 0));
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
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
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const stamp = isoStamp(now.toISOString());
  for (const b of bookings) {
    const vehicle = (b.plate ? b.plate + " " : "") + b.model;
    const balance = Math.max(0, b.total - b.amountPaid);
    const summary =
      (b.overlapApproved ? "⇄ " : "") + b.customerName + " · " + vehicle + " (" + (SHORT[b.status] || b.status) + ")";
    const description = [
      b.reference + " · " + (STATUS[b.status] || b.status),
      "Customer: " + b.customerName,
      b.phone ? "Phone: " + b.phone : "Phone: not given",
      b.email ? "Email: " + b.email : "",
      "Vehicle: " + vehicle,
      "Pick-up: " + b.pickup + " " + b.pickTime + " · Return: " + b.returnOn + " " + b.retTime,
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
      "DTSTART:" + utcStamp(b.pickup, b.pickTime),
      "DTEND:" + utcStamp(b.returnOn, b.retTime),
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
