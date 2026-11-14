"use client";

import { useEffect, useState } from "react";
import { buildBookingPdf, downloadPdf, type BookingPdfData } from "../lib/bookingPdf";
import { CONTACT } from "../lib/contact";
import { AGREEMENT_TEXT, AGREEMENT_TITLE, AGREEMENT_VERSION, type StoredDocuments } from "../lib/documents";
import { formatDay, ksh, type StaffBooking } from "../lib/hire";

// Desk view of a website booking's licences, drivers and signed hire agreement, with the booking PDF.
// The photos are fetched only when a staff member opens the booking, and are never cached.

const STATUS: Record<StaffBooking["status"], string> = {
  pending: "Vehicle held – awaiting full payment",
  confirmed: "Confirmed – paid in full",
  quote: "Delivery quote – vehicle not held yet",
  cancelled: "Cancelled",
};

function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}

function pdfData(booking: StaffBooking, docs: StoredDocuments): BookingPdfData {
  const days = booking.days === 1 ? "1 day" : booking.days + " days";
  const costs = [
    { label: "Hire, " + days + " × " + ksh(booking.days ? booking.hireTotal / booking.days : 0), amount: ksh(booking.hireTotal) },
  ];
  if (booking.insuranceTotal) costs.push({ label: "Damage cover, " + days, amount: ksh(booking.insuranceTotal) });
  if (booking.deliverySummary && !/^collect/i.test(booking.deliverySummary)) {
    costs.push({
      label: "Delivery",
      amount: booking.deliveryManual || booking.deliveryFee === null ? "To be set" : booking.deliveryFee ? ksh(booking.deliveryFee) : "Free",
    });
  }
  const sameText = docs.agreementVersion === AGREEMENT_VERSION;
  return {
    reference: booking.reference,
    status: STATUS[booking.status],
    created: stamp(booking.createdAt),
    vehicle: booking.model, // registration numbers stay on the desk, so they are left out of the PDF
    pickupText: formatDay(booking.pickup) + ", " + booking.pickTime,
    returnText: formatDay(booking.returnOn) + ", " + booking.retTime,
    daysText: days,
    location: [booking.deliverySummary || booking.location, ...booking.deliveryDetail.split("\n")].filter(Boolean),
    costs,
    totalLabel: booking.status === "confirmed" ? "Paid in full" : "Due in full",
    total: ksh(booking.total) + (booking.deliveryManual ? " plus delivery" : ""),
    customer: { name: booking.customerName, phone: booking.phone, email: booking.email },
    drivers: docs.drivers,
    signature: docs.signature,
    signedAt: stamp(docs.signedAt),
    agreementTitle: AGREEMENT_TITLE,
    agreementVersion: docs.agreementVersion,
    agreementText: sameText
      ? AGREEMENT_TEXT
      : ["The customer signed version " + docs.agreementVersion + " of the hire agreement. That wording has since been replaced on the website."],
    footer: "Chequered Flag · " + CONTACT.locationShort + " · " + CONTACT.phoneDisplay,
  };
}

export default function DeskDocuments({ booking }: { booking: StaffBooking }) {
  const [docs, setDocs] = useState<StoredDocuments | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setDocs(null);
    setError("");
    fetch("/api/hire/staff/bookings/documents?id=" + encodeURIComponent(booking.id), { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "The documents could not be loaded.");
        if (live) setDocs(body as StoredDocuments);
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : "The documents could not be loaded."));
    return () => {
      live = false;
    };
  }, [booking.id]);

  return (
    <div className="min-w-0 rounded-[10px] bg-[#f5f5f3] px-4 py-3.5">
      <div className="mb-2 text-[13px] font-bold uppercase tracking-[1.5px] text-[#595959]">Licences and agreement</div>
      {error && <p className="text-sm font-bold text-[#9b1c1c]">{error}</p>}
      {!docs && !error && <p className="text-sm text-[#595959]">Loading documents…</p>}
      {docs && (
        <div className="grid gap-3 text-sm">
          {docs.drivers.map((driver, index) => (
            <div key={index} className="flex items-start gap-3">
              <a href={driver.licence.data} target="_blank" rel="noopener noreferrer" title="Open the licence photo full size">
                <img
                  src={driver.licence.data}
                  alt={"Driving licence of " + driver.name}
                  className="h-16 w-24 rounded border border-[#d0d0d0] bg-white object-cover"
                />
              </a>
              <div className="min-w-0">
                <strong className="block">{driver.name}</strong>
                <span className="text-[#595959]">{index === 0 ? "Main driver" : "Driver " + (index + 1)} · {driver.phone}</span>
              </div>
            </div>
          ))}
          <div>
            <span className="text-[#595959]">Signed {stamp(docs.signedAt)} · agreement {docs.agreementVersion}</span>
            {docs.signature.kind === "drawn" && docs.signature.image ? (
              <img src={docs.signature.image.data} alt="Customer's signature" className="mt-1 h-14 w-auto rounded border border-[#d0d0d0] bg-white" />
            ) : (
              <span className="mt-1 block text-lg italic" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>
                {docs.signature.name} <span className="font-sans text-xs not-italic text-[#595959]">(typed)</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => downloadPdf(buildBookingPdf(pdfData(booking, docs)), "Chequered-Flag-" + booking.reference + ".pdf")}
            className="min-h-[40px] justify-self-start rounded-lg bg-[#171717] px-4 text-sm font-bold text-white"
          >
            Download booking PDF
          </button>
        </div>
      )}
    </div>
  );
}
