"use client";

import { useState } from "react";
import type { StaffBooking } from "../lib/hire";
import type { DeskVehicle } from "./HireDesk";
import DeskPlateChoice, { clashesFor } from "./DeskPlateChoice";

// "Change vehicle" on the desk booking card: choose the number plate a held or paid booking uses.
// Every vehicle in the same class (saloon, SUV or 4x4) is listed; the booking's price stays the same.
// A plate already booked for these dates can be swapped (the other booking moves to this booking's vehicle,
// when it is free for that booking's dates) or shared with an approved overlap and a reason.
// The server checks again when it saves.

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
  const [swapChosen, setSwapChosen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (booking.status !== "pending" && booking.status !== "confirmed") return null;

  const current = fleet.find((v) => v.id === booking.vehicleId) || fleet.find((v) => v.model === booking.model);
  const vehicles = fleet
    .filter((v) => current && v.category === current.category)
    .map((v) => ({ id: v.id, plate: v.plate, model: v.make || v.model }));
  const clashes = clashesFor(choice, booking.pickup, booking.returnOn, holds, booking.id);
  // A swap works when exactly one booking is on the chosen plate and it fits on this booking's vehicle.
  const swapOther = clashes.length === 1 && booking.vehicleId ? clashes[0] : null;
  const swapFits =
    swapOther && booking.vehicleId
      ? clashesFor(booking.vehicleId, swapOther.pickup, swapOther.returnOn, holds, swapOther.id).every((b) => b.id === booking.id)
      : false;
  const swap = swapOther && swapFits ? { other: swapOther, toPlate: fleet.find((v) => v.id === booking.vehicleId)?.plate || "" } : null;

  async function save() {
    setError("");
    if (!choice) return setError("Choose a number plate.");
    if (choice === booking.vehicleId && !clashes.length) return setOpen(false);
    const swapping = Boolean(swap && swapChosen);
    if (clashes.length && !approve && !swapping) {
      return setError(swap ? "Tick 'Swap plates' or 'Approve this overlap' to use a plate that is already booked." : "Tick 'Approve this overlap' to use a plate that is already booked.");
    }
    if (clashes.length && !swapping && note.trim().length < 3) return setError("Add a short reason for the overlap.");
    setBusy(true);
    try {
      const response = await fetch("/api/hire/staff/bookings/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          vehicleId: choice,
          approveOverlap: clashes.length > 0 && !swapping && approve,
          overlapNote: note,
          swapWith: swapping && swap ? swap.other.id : "",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The vehicle could not be changed.");
      setOpen(false);
      onSaved(
        booking.reference + " now uses " + body.plate +
          (body.swapped ? "; " + body.swapped.reference + " moved to " + body.swapped.plate + "." : body.overlap ? ", overlapping " + body.overlap + " (approved)." : "."),
      );
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
          setSwapChosen(false);
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
        label={"Number plate (any " + (current?.category === "4x4" ? "4x4" : current?.category === "suv" ? "SUV" : "saloon") + "; price stays the same)"}
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
        swap={swap}
        swapChosen={swapChosen}
        onSwapChosen={setSwapChosen}
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
