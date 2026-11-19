"use client";

import { useState } from "react";
import type { StaffBooking } from "../lib/hire";
import type { DeskVehicle } from "./HireDesk";
import DeskPlateChoice, { clashesFor } from "./DeskPlateChoice";

// "Change vehicle" on the desk booking card: choose the number plate a held or paid booking uses.
// Only vehicles of the same model are listed. A plate already booked for these dates needs the overlap
// approved, with a reason. The server checks again when it saves. To change the model, use Edit.

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
  const [approve, setApprove] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (booking.status !== "pending" && booking.status !== "confirmed") return null;

  const vehicles = fleet.filter((vehicle) => vehicle.model === booking.model).map((v) => ({ id: v.id, plate: v.plate }));
  const clashes = clashesFor(choice, booking.pickup, booking.returnOn, holds, booking.id);

  async function save() {
    setError("");
    if (!choice) return setError("Choose a number plate.");
    if (choice === booking.vehicleId && !clashes.length) return setOpen(false);
    if (clashes.length && !approve) return setError("Tick 'Approve this overlap' to use a plate that is already booked.");
    if (clashes.length && note.trim().length < 3) return setError("Add a short reason for the overlap.");
    setBusy(true);
    try {
      const response = await fetch("/api/hire/staff/bookings/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, vehicleId: choice, approveOverlap: clashes.length > 0 && approve, overlapNote: note }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The vehicle could not be changed.");
      setOpen(false);
      onSaved(booking.reference + " now uses " + body.plate + (body.overlap ? ", overlapping " + body.overlap + " (approved)." : "."));
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
          setApprove(false);
          setNote("");
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
      <DeskPlateChoice
        idPrefix={"alloc-" + booking.id}
        label={"Number plate (" + booking.model + ")"}
        vehicles={vehicles}
        pickup={booking.pickup}
        returnOn={booking.returnOn}
        holds={holds}
        ignoreId={booking.id}
        currentId={booking.vehicleId || ""}
        value={choice}
        onChange={setChoice}
        approve={approve}
        onApprove={setApprove}
        note={note}
        onNote={setNote}
      />
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
