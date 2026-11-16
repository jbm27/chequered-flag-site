// Helpers for checking payments on the hire desk: M-Pesa code format, duplicate codes, and matching a pasted
// M-Pesa message or statement line to a booking. Used in the browser only; nothing here talks to M-Pesa.

import { balanceOf, type StaffBooking } from "./hire";

// M-Pesa transaction codes are 10 capital letters and numbers, for example QJK3X7AB12.
export function normaliseCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function looksLikeMpesaCode(value: string) {
  const code = normaliseCode(value);
  return /^[A-Z0-9]{10}$/.test(code) && /[A-Z]/.test(code) && /[0-9]/.test(code);
}

// A short note for a code input: "" when the code looks right or the box is empty.
export function mpesaCodeHint(value: string) {
  const code = normaliseCode(value);
  if (!code) return "";
  if (looksLikeMpesaCode(code)) return "";
  if (code.length !== 10) return "M-Pesa codes have 10 letters and numbers (this has " + code.length + "). Please check it.";
  return "M-Pesa codes mix letters and numbers, for example QJK3X7AB12. Please check it.";
}

// Every code recorded on a booking: the one the customer sent, and payments recorded on the desk.
export function bookingCodes(booking: StaffBooking) {
  const codes = new Set<string>();
  if (booking.mpesaCode) codes.add(normaliseCode(booking.mpesaCode));
  for (const entry of booking.paymentLog || []) if (entry.code) codes.add(normaliseCode(entry.code));
  return Array.from(codes);
}

// Codes that appear on more than one booking (not counting cancelled ones), with the references they appear on.
export function duplicateCodes(bookings: StaffBooking[]) {
  const seen = new Map<string, string[]>();
  for (const booking of bookings) {
    if (booking.status === "cancelled") continue;
    for (const code of bookingCodes(booking)) seen.set(code, [...(seen.get(code) || []), booking.reference]);
  }
  const out = new Map<string, string[]>();
  seen.forEach((refs, code) => {
    if (refs.length > 1) out.set(code, refs);
  });
  return out;
}

export type ParsedPayment = { code: string; amount: number | null; phoneKey: string; name: string; reference: string };

// Reads an M-Pesa confirmation message or a statement line, for example:
// "QJK3X7AB12 Confirmed. Ksh5,000.00 received from JOHN DOE 0722123456 on 16/11/26 at 10:15 AM."
export function parsePayment(text: string): ParsedPayment {
  const upper = text.toUpperCase();
  const code = (upper.match(/\b[A-Z0-9]{10}\b/g) || []).find((token) => /[A-Z]/.test(token) && /[0-9]/.test(token)) || "";
  const money = /(?:KSH|KES)\.?\s*([\d,]+(?:\.\d{1,2})?)/i.exec(text);
  const amount = money ? Math.round(Number(money[1].replace(/,/g, ""))) : null;
  const phone = /(?:\+?254|\b0)\s?([17]\d{2})\s?(\d{3})\s?(\d{3})\b/.exec(text);
  const phoneKey = phone ? phone[1] + phone[2] + phone[3] : "";
  const from = /\bfrom\s+([A-Za-z][A-Za-z'.\- ]{1,60}?)(?=\s+(?:\+?254|0)\d|\s+on\s|\s+REF\b|\s{2,}|\s*[.,]|$)/i.exec(text);
  const name = from ? from[1].trim() : "";
  const ref = /\bCFQ?\s?-?\s?(\d{6})\b/i.exec(text);
  const reference = ref ? (/CFQ/i.test(ref[0]) ? "CFQ-" : "CF-") + ref[1] : "";
  return { code, amount: Number.isFinite(amount) ? amount : null, phoneKey, name, reference };
}

export type PaymentMatch = { booking: StaffBooking; score: number; reasons: string[]; balance: number };

// Scores held and paid bookings against a parsed payment. The best matches come first.
export function matchPayment(parsed: ParsedPayment, bookings: StaffBooking[]): PaymentMatch[] {
  const nameWords = parsed.name.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  const out: PaymentMatch[] = [];
  for (const booking of bookings) {
    if (booking.status !== "pending" && booking.status !== "confirmed") continue;
    const balance = balanceOf(booking);
    const reasons: string[] = [];
    let score = 0;
    if (parsed.reference && booking.reference === parsed.reference) {
      score += 100;
      reasons.push("Booking reference matches");
    }
    if (parsed.code && bookingCodes(booking).includes(parsed.code)) {
      score += 100;
      reasons.push("Same code as on this booking");
    }
    if (parsed.phoneKey && booking.phone.replace(/\D/g, "").slice(-9) === parsed.phoneKey) {
      score += 40;
      reasons.push("Phone number matches");
    }
    if (parsed.amount !== null && balance > 0) {
      if (parsed.amount === balance) {
        score += 35;
        reasons.push("Amount matches the balance due");
      } else if (parsed.amount === booking.total) {
        score += 25;
        reasons.push("Amount matches the booking total");
      } else if (parsed.amount < balance) {
        score += 5;
        reasons.push("Could be a part payment");
      }
    }
    if (nameWords.length) {
      const customer = booking.customerName.toLowerCase();
      const hits = nameWords.filter((word) => customer.includes(word)).length;
      if (hits) {
        score += hits >= 2 ? 25 : 15;
        reasons.push(hits >= 2 ? "Name matches" : "Part of the name matches");
      }
    }
    if (score >= 15 && (balance > 0 || score >= 100)) out.push({ booking, score, reasons, balance });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}
