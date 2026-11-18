"use client";

import { useState } from "react";
import { exclusiveEnd, type StaffBooking } from "../lib/hire";
import type { DeskVehicle } from "./HireDesk";

// "Change vehicle" on the desk booking card: choose the number plate a held or paid booking uses.
// Only vehicles of the same model are listed; ones already booked for these dates can't be chosen.
// The server checks again when it saves. To change the model, use Edit.

export default function DeskAllocate({
  booking,
  fleet,
  holds,
  onSaved,
}: {
  booking: StaffBooking;
  fleet: DeskVehicle[];
  holds: StaffBooking[];
  onSaved: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(booking.vehicleId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (booking.status !== "pending" && booking.status !== "confirmed") return null;

  const end = exclusiveEnd(booking.pickup, booking.returnOn);
  const options = fleet
    .filter((vehicle) => vehicle.model === booking.model)
    .map((vehicle) => {
      const clash = holds.find(
        (other) =>
          other.id !== booking.id && other.vehicleId === vehicle.id && other.pickup < end && booking.pickup < exclusiveEnd(other.pickup, other.returnOn),
      );
      return { vehicle, clash };
    })
    .sort((a, b) => a.vehicle.plate.localeCompare(b.vehicle.plate));

  async function save() {
    setError("");
    if (!choice) return setError("Choose a number plate.");
    if (choice === booking.vehicleId) return setOpen(false);
    setBusy(true);
    try {
      const response = await fetch("/api/hire/staff/bookings/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, vehicleId: choice }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The vehicle could not be changed.");
      setOpen(false);
      onSaved(booking.reference + " now uses " + body.plate + ".");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The vehicle could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setChoice(booking.vehicleId || "");
          setError("");
          setOpen(true);
        }}
        className="mt-1 inline-flex min-h-[32px] items-center rounded-lg border border-[#dadce0] bg-white px-2.5 text-[13px] font-bold hover:bg-[#f5f5f3]"
      >
        {booking.vehicleId ? "Change vehicle" : "Choose vehicle"}
      </button>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border border-[#e5e5e5] bg-white p-2.5">
      <label htmlFor={"alloc-" + booking.id} className="mb-1 block text-[13px] text-[#595959]">
        Number plate ({booking.model})
      </label>
      <select
        id={"alloc-" + booking.id}
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="h-10 w-full rounded-lg border border-[#c8c8c8] bg-white px-2 text-sm text-[#171717]"
      >
        {!booking.vehicleId && <option value="">Choose a plate</option>}
        {options.map(({ vehicle, clash }) => (
          <option key={vehicle.id} value={vehicle.id} disabled={Boolean(clash)}>
            {vehicle.plate}
            {vehicle.id === booking.vehicleId ? " (current)" : clash ? " (booked on " + clash.reference + ")" : " (free)"}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1.5 text-[13px] font-bold text-[#a50e0e]">
          {error}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="inline-flex min-h-[34px] items-center rounded-lg bg-[#171717] px-3 text-[13px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Use this vehicle"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-[34px] items-center rounded-lg border border-[#dadce0] bg-white px-3 text-[13px] font-bold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
