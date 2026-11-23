"use client";

import { useEffect, useState } from "react";
import { MAX_DRIVERS, type DocImage, type StoredDocuments } from "../lib/documents";
import type { StaffBooking } from "../lib/hire";
import { LicencePicker } from "./CheckoutDocuments";

// "Drivers and licences" in the desk's Edit form: add or replace the main driver's licence photo, and add,
// change or remove extra drivers (up to MAX_DRIVERS in all), each with a licence photo. Used for phone and
// walk-in bookings that have no licences yet, and to correct website bookings. Saved with "Save changes".

export type DriverRow = {
  key: string;
  name: string;
  phone: string;
  photo: DocImage | null; // a new photo chosen here
  keep: number | null; // index of a saved driver whose photo stays
  saved: DocImage | null; // that saved photo, for the preview
};

// What the server expects (see saveDeskDrivers in lib/db.ts).
export function driversPayload(rows: DriverRow[]) {
  return rows.map((row) => ({ name: row.name, phone: row.phone, photo: row.photo || undefined, keep: row.photo ? undefined : row.keep ?? undefined }));
}

export function driversProblem(rows: DriverRow[]) {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const label = index === 0 ? "the main driver" : "driver " + (index + 1);
    if (row.name.trim().length < 2) return "Enter the name of " + label + ".";
    if (!row.photo && row.keep === null) return "Add a licence photo for " + label + ", or leave the drivers unchanged.";
  }
  return "";
}

const input = "h-10 w-full min-w-0 rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";
let counter = 0;
const newKey = () => "d" + (counter += 1);

export default function DeskDrivers({
  booking,
  rows,
  onChange,
}: {
  booking: StaffBooking;
  rows: DriverRow[] | null;
  onChange: (rows: DriverRow[], touched: boolean) => void;
}) {
  const [error, setError] = useState("");

  // Load what is saved: a website booking's drivers, or the main driver from the booking if there are none.
  useEffect(() => {
    const fallback: DriverRow[] = [
      { key: newKey(), name: booking.customerName, phone: booking.phone, photo: null, keep: null, saved: null },
    ];
    if (!booking.hasDocuments) {
      onChange(fallback, false);
      return;
    }
    let live = true;
    fetch("/api/hire/staff/bookings/documents?id=" + encodeURIComponent(booking.id), { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "The drivers could not be loaded.");
        const docs = body as StoredDocuments;
        if (live)
          onChange(
            docs.drivers.map((d, i) => ({ key: newKey(), name: d.name, phone: d.phone, photo: null, keep: i, saved: d.licence })),
            false,
          );
      })
      .catch((err) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : "The drivers could not be loaded.");
        onChange(fallback, false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  if (!rows) return <p className="mt-3.5 text-sm text-[#595959]">Loading drivers…</p>;

  const update = (index: number, change: Partial<DriverRow>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...change } : row)), true);

  return (
    <div className="mt-3.5 rounded-lg border border-[#e5e5e5] bg-[#fafaf8] p-3.5">
      <strong className="block text-sm">Drivers and licences</strong>
      <p className="mt-0.5 text-[13px] text-[#595959]">
        {booking.hasDocuments
          ? "Change a driver's details, replace a licence photo, or add another driver."
          : "No licences on this booking yet. Add a photo of each driver's licence."}{" "}
        Up to {MAX_DRIVERS} drivers. Saved with Save changes.
      </p>
      {error && <p className="mt-1 text-[13px] font-bold text-[#a50e0e]">{error}</p>}
      <div className="mt-2.5 grid gap-3">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-lg border border-[#e5e5e5] bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <strong className="text-[13px]">{index === 0 ? "Main driver" : "Driver " + (index + 1)}</strong>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, i) => i !== index), true)}
                  className="text-[13px] font-semibold text-[#a50e0e] underline"
                >
                  Remove driver
                </button>
              )}
            </div>
            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
              <div>
                <label htmlFor={"drvName" + row.key} className="mb-1 block text-[13px] text-[#595959]">
                  Name
                </label>
                <input id={"drvName" + row.key} value={row.name} onChange={(e) => update(index, { name: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor={"drvPhone" + row.key} className="mb-1 block text-[13px] text-[#595959]">
                  Mobile number (optional)
                </label>
                <input id={"drvPhone" + row.key} type="tel" value={row.phone} onChange={(e) => update(index, { phone: e.target.value })} className={input} />
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-start gap-3">
              {!row.photo && row.saved && (
                <a href={row.saved.data} target="_blank" rel="noopener noreferrer" title="Open the saved licence photo">
                  <img src={row.saved.data} alt={"Saved licence of " + row.name} className="h-16 w-24 rounded border border-[#d0d0d0] object-cover" />
                </a>
              )}
              <div className="min-w-[200px] flex-1">
                <LicencePicker
                  id={"drvLic" + row.key}
                  label={row.saved ? "Replace the licence photo" : "Licence photo"}
                  value={row.photo}
                  onChange={(image) => update(index, { photo: image })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {rows.length < MAX_DRIVERS && (
        <button
          type="button"
          onClick={() => onChange([...rows, { key: newKey(), name: "", phone: "", photo: null, keep: null, saved: null }], true)}
          className="mt-2.5 inline-flex min-h-[36px] items-center rounded-lg border border-[#dadce0] bg-white px-3 text-[13px] font-bold hover:bg-[#f5f5f3]"
        >
          + Add another driver
        </button>
      )}
    </div>
  );
}
