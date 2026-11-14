"use client";

import { useMemo, useState } from "react";
import {
  dayNumber,
  exclusiveEnd,
  formatDay,
  HOURS,
  hireDays,
  hoursReason,
  ksh,
  outOfHours,
  PICKUP_LOCATIONS,
  type StaffBooking,
} from "../lib/hire";

// Staff form for correcting a booking that is already on the desk (Edit button in the booking panel).
// It posts to /api/hire/staff/bookings/edit, which re-checks the dates, finds a free vehicle again if the
// model or dates change (keeping the current one when it is still free), and recalculates the totals.

type FleetRow = {
  id: string;
  model: string;
  modelId?: string;
  rate?: number;
  addon?: number;
};

const input = "h-10 w-full min-w-0 rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";
const dateIn = "h-10 min-w-0 flex-[1_1_130px] rounded-lg border border-[#c8c8c8] bg-white px-2 text-sm text-[#171717]";
const timeSel = "h-10 w-[88px] flex-none rounded-lg border border-[#c8c8c8] bg-white px-1 text-sm text-[#171717]";
const label = "mb-1.5 block text-[13px] text-[#595959]";
const btnDark =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg bg-[#171717] px-4 text-[13px] font-bold text-white hover:bg-[#2b2b2b] disabled:opacity-50";
const btnLight =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg border border-[#dadce0] bg-white px-4 text-[13px] font-bold text-[#171717] hover:bg-[#f5f5f3]";

function plural(n: number, word: string) {
  return n + " " + word + (n === 1 ? "" : "s");
}

// Notes added by the desk end with "Edited by … on …." or start with "Added on the desk by …";
// those stamps are added again by the server, so they are not shown in the box.
function editableNote(note: string) {
  return note
    .replace(/\s*·?\s*Edited by [^.]+ on \d{4}-\d{2}-\d{2}\.\s*$/g, "")
    .replace(/^Added on the desk by [^.]+\.\s*/, "")
    .trim();
}

export default function DeskEditBooking({
  booking,
  fleet,
  holds,
  onSaved,
  onClose,
}: {
  booking: StaffBooking;
  fleet: FleetRow[];
  holds: StaffBooking[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const models = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; rate: number; addon: number; ids: string[] }>();
    for (const vehicle of fleet) {
      const id = vehicle.modelId || vehicle.model;
      const entry = seen.get(id) || { id, name: vehicle.model, rate: vehicle.rate || 0, addon: vehicle.addon || 0, ids: [] };
      entry.ids.push(vehicle.id);
      seen.set(id, entry);
    }
    return Array.from(seen.values());
  }, [fleet]);

  const startModel = models.find((item) => item.name === booking.model)?.id || models[0]?.id || "";
  const [modelId, setModelId] = useState(startModel);
  const [pickup, setPickup] = useState(booking.pickup);
  const [returnOn, setReturnOn] = useState(booking.returnOn);
  const [pickTime, setPickTime] = useState(booking.pickTime);
  const [retTime, setRetTime] = useState(booking.retTime);
  const [location, setLocation] = useState(booking.location);
  const [name, setName] = useState(booking.customerName);
  const [phone, setPhone] = useState(booking.phone);
  const [email, setEmail] = useState(booking.email);
  const [insure, setInsure] = useState(booking.insuranceTotal > 0);
  const [oohNote, setOohNote] = useState(booking.oohNote);
  const [mpesaCode, setMpesaCode] = useState(booking.mpesaCode);
  const [staffNote, setStaffNote] = useState(editableNote(booking.staffNote));
  const delivered = !booking.deliverySummary.startsWith("Collect at");
  const feeEditable = booking.status !== "quote" && delivered && booking.deliveryFee !== null;
  const [deliveryFee, setDeliveryFee] = useState(booking.deliveryFee === null ? "" : String(booking.deliveryFee));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const model = models.find((item) => item.id === modelId) || models[0];
  const validDates = dayNumber(pickup) !== null && dayNumber(returnOn) !== null && returnOn >= pickup;
  const days = validDates ? hireDays(pickup, returnOn) : 0;
  const hours = outOfHours(pickup, returnOn, pickTime, retTime);
  const holdsVehicle = booking.status === "pending" || booking.status === "confirmed";

  const freeCount = useMemo(() => {
    if (!model || !validDates) return null;
    const end = exclusiveEnd(pickup, returnOn);
    return model.ids.filter(
      (id) =>
        !holds.some(
          (b) => b.id !== booking.id && b.vehicleId === id && b.pickup < end && pickup < exclusiveEnd(b.pickup, b.returnOn),
        ),
    ).length;
  }, [model, holds, pickup, returnOn, validDates, booking.id]);

  const hireTotal = model ? days * model.rate : 0;
  const coverTotal = model && insure ? days * model.addon : 0;
  const fee = feeEditable ? Number(deliveryFee.replace(/,/g, "")) || 0 : booking.deliveryFee || 0;
  const total = hireTotal + coverTotal + fee;

  async function save() {
    setError("");
    if (!model) return setError("Choose a vehicle model.");
    if (!validDates) return setError("Choose valid dates.");
    if (holdsVehicle && freeCount === 0) return setError("No " + model.name + " is free for those dates.");
    setSaving(true);
    try {
      const response = await fetch("/api/hire/staff/bookings/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          modelId: model.id,
          pickup,
          returnOn,
          pickTime,
          retTime,
          location,
          name,
          phone,
          email,
          insure,
          oohNote,
          mpesaCode,
          staffNote,
          deliveryFee: feeEditable ? deliveryFee : undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The changes could not be saved.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-[#171717] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Edit {booking.reference}</h3>
          <p className="mt-0.5 max-w-[640px] text-[13px] text-[#595959]">
            Correct any details. If you change the dates or model, the desk checks a vehicle is free and recalculates
            the total. The payment status stays the same.
          </p>
        </div>
        <button type="button" onClick={onClose} className={btnLight}>
          Cancel
        </button>
      </div>

      <div className="mt-3.5 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        <div>
          <label htmlFor="ebModel" className={label}>
            Vehicle model
          </label>
          <select id="ebModel" value={modelId} onChange={(e) => setModelId(e.target.value)} className={input}>
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({ksh(item.rate)}/day)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ebLoc" className={label}>
            Pick-up location
          </label>
          <select id="ebLoc" value={location} onChange={(e) => setLocation(e.target.value)} className={input}>
            {PICKUP_LOCATIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ebPick" className={label}>
            Pick-up date and time
          </label>
          <div className="flex gap-1.5">
            <input
              id="ebPick"
              type="date"
              value={pickup}
              onChange={(e) => {
                setPickup(e.target.value);
                if (returnOn < e.target.value) setReturnOn(e.target.value);
              }}
              className={dateIn}
            />
            <select aria-label="Pick-up time" value={pickTime} onChange={(e) => setPickTime(e.target.value)} className={timeSel}>
              {HOURS.map((hour) => (
                <option key={hour}>{hour}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ebRet" className={label}>
            Return date and time
          </label>
          <div className="flex gap-1.5">
            <input id="ebRet" type="date" min={pickup} value={returnOn} onChange={(e) => setReturnOn(e.target.value)} className={dateIn} />
            <select aria-label="Return time" value={retTime} onChange={(e) => setRetTime(e.target.value)} className={timeSel}>
              {HOURS.map((hour) => (
                <option key={hour}>{hour}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ebName" className={label}>
            Customer name
          </label>
          <input id="ebName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor="ebPhone" className={label}>
            Mobile number
          </label>
          <input id="ebPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor="ebEmail" className={label}>
            Email (optional)
          </label>
          <input id="ebEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor="ebMpesa" className={label}>
            M-Pesa code (optional)
          </label>
          <input id="ebMpesa" value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value)} className={input} />
        </div>
        {feeEditable && (
          <div>
            <label htmlFor="ebFee" className={label}>
              Delivery charge (KSh)
            </label>
            <input id="ebFee" inputMode="numeric" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={input} />
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="ebNote" className={label}>
            Note for the file
          </label>
          <input id="ebNote" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} className={input} />
        </div>
      </div>

      {hours.any && (
        <div className="mt-3.5 rounded-lg border border-[#f3d57a] bg-[#fef7e0] p-3 text-sm text-[#5f4b00]">
          {hours.pick && (
            <strong className="block">
              Pick-up on {formatDay(pickup)} at {pickTime} is outside opening hours: {hoursReason(pickup, pickTime)}.
            </strong>
          )}
          {hours.ret && (
            <strong className="block">
              Return on {formatDay(returnOn)} at {retTime} is outside opening hours: {hoursReason(returnOn, retTime)}.
            </strong>
          )}
          <label htmlFor="ebOoh" className={label + " mt-2 text-[#5f4b00]"}>
            Out-of-hours arrangement (needed)
          </label>
          <input id="ebOoh" value={oohNote} onChange={(e) => setOohNote(e.target.value)} className={input} />
        </div>
      )}

      {model && model.addon > 0 && (
        <label className="mt-3.5 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={insure} onChange={(e) => setInsure(e.target.checked)} className="h-5 w-5" />
          Damage cover ({ksh(model.addon)}/day)
        </label>
      )}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f5f5f3] px-4 py-3 text-sm">
        <div>
          {validDates ? (
            <>
              <strong>{model?.name}</strong> · {plural(days, "day")} · hire {ksh(hireTotal)}
              {coverTotal ? " + cover " + ksh(coverTotal) : ""}
              {fee ? " + delivery " + ksh(fee) : ""} = <strong>{ksh(total)}</strong>
              {booking.status === "quote" ? " plus delivery (set when you hold it)" : ""}
              {holdsVehicle && freeCount !== null && (
                <span className={"font-bold " + (freeCount > 0 ? "text-[#0d5a2a]" : "text-[#a50e0e]")}>
                  {" · "}
                  {freeCount > 0 ? "a vehicle is free" : "none free on these dates"}
                </span>
              )}
            </>
          ) : (
            <span className="font-bold text-[#9b1c1c]">Choose valid dates.</span>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={btnLight}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className={btnDark}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-[#a50e0e]">
          {error}
        </p>
      )}
    </div>
  );
}
