"use client";

import { exclusiveEnd, type StaffBooking } from "../lib/hire";

// Number plate picker used by "+ Add booking" and "Change vehicle" on the desk. Plates already booked for the
// dates can still be chosen, but only after staff tick "Approve this overlap" and give a reason (for example a
// friend collecting the day another hire comes back). The server checks the same rules when it saves.
// Customers on the website can never make an overlapping booking.

export type PlateOption = { id: string; plate: string; model?: string };

// The held or paid bookings a vehicle already has on these dates (other than `ignoreId`).
export function clashesFor(vehicleId: string, pickup: string, returnOn: string, holds: StaffBooking[], ignoreId = "") {
  if (!vehicleId || !pickup || !returnOn || returnOn < pickup) return [];
  const end = exclusiveEnd(pickup, returnOn);
  return holds.filter(
    (other) => other.id !== ignoreId && other.vehicleId === vehicleId && other.pickup < end && pickup < exclusiveEnd(other.pickup, other.returnOn),
  );
}

export default function DeskPlateChoice({
  idPrefix,
  label,
  swap = null,
  swapChosen = false,
  onSwapChosen,
  vehicles,
  pickup,
  returnOn,
  holds,
  ignoreId = "",
  currentId = "",
  anyLabel,
  value,
  onChange,
  approve,
  onApprove,
  note,
  onNote,
}: {
  idPrefix: string;
  label: string;
  vehicles: PlateOption[];
  pickup: string;
  returnOn: string;
  holds: StaffBooking[];
  ignoreId?: string;
  currentId?: string;
  anyLabel?: string; // e.g. "Any free plate" on Add booking
  value: string;
  onChange: (id: string) => void;
  approve: boolean;
  onApprove: (value: boolean) => void;
  note: string;
  onNote: (value: string) => void;
  // Change vehicle: offer to swap plates with the one booking on the chosen vehicle, when it fits on ours.
  swap?: { other: StaffBooking; toPlate: string } | null;
  swapChosen?: boolean;
  onSwapChosen?: (value: boolean) => void;
}) {
  const options = [...vehicles]
    .sort((a, b) => a.plate.localeCompare(b.plate))
    .map((vehicle) => ({ vehicle, clashes: clashesFor(vehicle.id, pickup, returnOn, holds, ignoreId) }));
  const chosen = options.find((option) => option.vehicle.id === value);
  const clashes = chosen ? chosen.clashes : [];

  return (
    <div>
      <label htmlFor={idPrefix + "Plate"} className="mb-1.5 block text-[13px] text-[#595959]">
        {label}
      </label>
      <select
        id={idPrefix + "Plate"}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onApprove(false);
          onSwapChosen?.(false);
        }}
        className="h-10 w-full rounded-lg border border-[#c8c8c8] bg-white px-2 text-sm text-[#171717]"
      >
        {anyLabel !== undefined && <option value="">{anyLabel}</option>}
        {anyLabel === undefined && !value && <option value="">Choose a plate</option>}
        {options.map(({ vehicle, clashes: c }) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.plate}
            {vehicle.model ? " " + vehicle.model : ""}
            {vehicle.id === currentId ? " (current)" : ""}
            {c.length ? " · booked on " + c.map((b) => b.reference).join(", ") + " (overlap)" : vehicle.id === currentId ? "" : " (free)"}
          </option>
        ))}
      </select>
      {clashes.length > 0 && (
        <div className="mt-2 rounded-lg border border-[#f1a9a3] bg-[#fce8e6] p-3 text-[13px] text-[#5c0b0b]">
          <strong className="block text-sm">This plate is already booked for these dates</strong>
          {clashes.map((b) => (
            <span key={b.id} className="block">
              {b.reference} · {b.customerName} · {b.pickup} {b.pickTime} to {b.returnOn} {b.retTime}
            </span>
          ))}
          {swap && (
            <label className="mt-2 flex items-start gap-2 font-bold">
              <input
                type="checkbox"
                checked={swapChosen}
                onChange={(e) => {
                  onSwapChosen?.(e.target.checked);
                  if (e.target.checked) onApprove(false);
                }}
                className="mt-0.5 h-5 w-5 flex-none"
              />
              <span>
                Swap plates: {swap.other.reference} ({swap.other.customerName}) moves to {swap.toPlate}.
                <span className="block font-normal">Nothing overlaps; each booking keeps its own dates and price.</span>
              </span>
            </label>
          )}
          {clashes.length > 1 && !swap && (
            <span className="mt-1 block">A swap isn&apos;t possible: there is more than one booking on this plate for these dates.</span>
          )}
          <label className="mt-2 flex items-start gap-2 font-bold">
            <input
              type="checkbox"
              checked={approve}
              onChange={(e) => {
                onApprove(e.target.checked);
                if (e.target.checked) onSwapChosen?.(false);
              }}
              className="mt-0.5 h-5 w-5 flex-none"
            />
            Approve this overlap: both bookings will use this vehicle.
          </label>
          {approve && (
            <div className="mt-2">
              <label htmlFor={idPrefix + "OverlapNote"} className="mb-1 block text-[13px]">
                Reason for the overlap
              </label>
              <input
                id={idPrefix + "OverlapNote"}
                value={note}
                maxLength={200}
                onChange={(e) => onNote(e.target.value)}
                placeholder="e.g. Friend collects at 15:00 after the 10:00 return"
                className="h-10 w-full rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
