"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  dateProblem,
  exclusiveEnd,
  formatDay,
  HOURS,
  hireDays,
  hoursReason,
  ksh,
  outOfHours,
  PICKUP_LOCATIONS,
  todayNairobi,
  type PublicBookingResult,
  type StaffBooking,
} from "../lib/hire";

// Staff form for adding a booking by hand, for example one taken over the phone.
// It posts to /api/hire/staff/bookings/create, which runs the same checks, prices and vehicle
// assignment as a website booking. Email is optional, and staff can mark it as already paid.

type FleetRow = {
  id: string;
  model: string;
  modelId?: string;
  category: "saloon" | "suv" | "4x4";
  rate?: number;
  addon?: number;
};

const input = "h-10 w-full min-w-0 rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";
const label = "mb-1.5 block text-[13px] text-[#595959]";
const dateIn = "h-10 min-w-0 flex-[1_1_130px] rounded-lg border border-[#c8c8c8] bg-white px-2 text-sm text-[#171717]";
const timeSel = "h-10 w-[88px] flex-none rounded-lg border border-[#c8c8c8] bg-white px-1 text-sm text-[#171717]";
const btnDark =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg bg-[#171717] px-4 text-[13px] font-bold text-white hover:bg-[#2b2b2b] disabled:opacity-50";
const btnLight =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg border border-[#dadce0] bg-white px-4 text-[13px] font-bold text-[#171717] hover:bg-[#f5f5f3]";

function plural(n: number, word: string) {
  return n + " " + word + (n === 1 ? "" : "s");
}

export default function DeskAddBooking({
  fleet,
  holds,
  onDone,
  onClose,
}: {
  fleet: FleetRow[];
  holds: StaffBooking[];
  onDone: (result: PublicBookingResult) => void;
  onClose: () => void;
}) {
  const today = todayNairobi();
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

  const [modelId, setModelId] = useState(models[0]?.id || "");
  const [pickup, setPickup] = useState(addDays(today, 1));
  const [returnOn, setReturnOn] = useState(addDays(today, 3));
  const [pickTime, setPickTime] = useState("09:00");
  const [retTime, setRetTime] = useState("09:00");
  const [location, setLocation] = useState<string>(PICKUP_LOCATIONS[0]);
  const [delivery, setDelivery] = useState<"none" | "deliver" | "both">("none");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [insure, setInsure] = useState(false);
  const [oohNote, setOohNote] = useState("");
  const [paid, setPaid] = useState(false);
  const [paidSoFar, setPaidSoFar] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const model = models.find((item) => item.id === modelId) || models[0];
  const dateError = dateProblem(pickup, returnOn);
  const days = dateError ? 0 : hireDays(pickup, returnOn);
  const hours = outOfHours(pickup, returnOn, pickTime, retTime);
  const quote = delivery !== "none";

  const freeCount = useMemo(() => {
    if (!model || dateError) return null;
    const end = exclusiveEnd(pickup, returnOn);
    return model.ids.filter(
      (id) => !holds.some((b) => b.vehicleId === id && b.pickup < end && pickup < exclusiveEnd(b.pickup, b.returnOn)),
    ).length;
  }, [model, holds, pickup, returnOn, dateError]);

  const hireTotal = model ? days * model.rate : 0;
  const coverTotal = model && insure ? days * model.addon : 0;
  const total = hireTotal + coverTotal;
  const paidText = paidSoFar.replace(/,/g, "").trim();
  const paidAmount = paid && !quote ? total : /^\d+$/.test(paidText) ? Number(paidText) : 0;
  const balance = Math.max(0, total - paidAmount);

  async function save() {
    setError("");
    if (!model) return setError("Choose a vehicle model.");
    if (dateError) return setError(dateError);
    if (!quote && freeCount === 0) return setError("No " + model.name + " is free for those dates. Choose other dates or another model.");
    if (paid && quote) return setError("A delivery booking is saved as a quote first. Untick 'paid' and set the delivery charge on the booking.");
    if (!(paid && !quote) && paidText && !/^\d+$/.test(paidText)) {
      return setError("Enter the amount paid so far as a whole number of shillings, or leave it blank.");
    }
    if (!(paid && !quote) && !quote && paidAmount > total) {
      return setError("The amount paid so far cannot be more than the total of " + ksh(total) + ".");
    }
    if (!terms) return setError("Tick the box to confirm the driver requirements were explained.");
    setSaving(true);
    try {
      const response = await fetch("/api/hire/staff/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: model.id,
          pickup,
          returnOn,
          pickTime,
          retTime,
          location,
          delivery,
          address: quote ? address : "",
          note: quote ? note : "",
          insure,
          name,
          email,
          phone,
          oohNote,
          mpesaCode,
          paid,
          amountPaid: paid && !quote ? "" : paidText,
          staffNote,
          terms,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The booking could not be saved.");
      onDone(body as PublicBookingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The booking could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-[22px] rounded-xl border-2 border-[#171717] bg-white p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">Add a booking</h2>
          <p className="mt-1 max-w-[720px] text-sm text-[#595959]">
            For bookings taken by phone or in person. It uses the same checks and prices as the website and holds a free
            vehicle of the chosen model. Email is optional here.
          </p>
        </div>
        <button type="button" onClick={onClose} className={btnLight}>
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        <div>
          <label htmlFor="nbModel" className={label}>
            Vehicle model
          </label>
          <select id="nbModel" value={modelId} onChange={(e) => setModelId(e.target.value)} className={input}>
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({ksh(item.rate)}/day)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nbLoc" className={label}>
            Pick-up location
          </label>
          <select id="nbLoc" value={location} onChange={(e) => setLocation(e.target.value)} className={input}>
            {PICKUP_LOCATIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nbPick" className={label}>
            Pick-up date and time
          </label>
          <div className="flex gap-1.5">
            <input
              id="nbPick"
              type="date"
              min={today}
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
          <label htmlFor="nbRet" className={label}>
            Return date and time
          </label>
          <div className="flex gap-1.5">
            <input id="nbRet" type="date" min={pickup || today} value={returnOn} onChange={(e) => setReturnOn(e.target.value)} className={dateIn} />
            <select aria-label="Return time" value={retTime} onChange={(e) => setRetTime(e.target.value)} className={timeSel}>
              {HOURS.map((hour) => (
                <option key={hour}>{hour}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="nbDel" className={label}>
            Delivery
          </label>
          <select id="nbDel" value={delivery} onChange={(e) => setDelivery(e.target.value as "none" | "deliver" | "both")} className={input}>
            <option value="none">No, they collect it</option>
            <option value="deliver">Deliver to them</option>
            <option value="both">Deliver and collect</option>
          </select>
        </div>
      </div>

      {quote && (
        <div className="mt-3.5 grid gap-3.5 rounded-lg bg-[#fef7e0] p-3.5 sm:grid-cols-2">
          <p className="text-sm text-[#5f4b00] sm:col-span-2">
            Delivery bookings are saved as a quote and do not hold a vehicle yet. Open the booking afterwards, set the
            delivery charge and hold the vehicle.
          </p>
          <div>
            <label htmlFor="nbAddr" className={label}>
              Delivery address
            </label>
            <input id="nbAddr" value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="nbDelNote" className={label}>
              Delivery details (optional)
            </label>
            <input id="nbDelNote" value={note} onChange={(e) => setNote(e.target.value)} className={input} />
          </div>
        </div>
      )}

      {hours.any && (
        <div className="mt-3.5 rounded-lg border border-[#f3d57a] bg-[#fef7e0] p-3.5 text-sm text-[#5f4b00]">
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
          <label htmlFor="nbOoh" className={label + " mt-2 text-[#5f4b00]"}>
            Out-of-hours arrangement (needed)
          </label>
          <input id="nbOoh" value={oohNote} onChange={(e) => setOohNote(e.target.value)} className={input} />
        </div>
      )}

      <div className="mt-3.5 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        <div>
          <label htmlFor="nbName" className={label}>
            Customer name
          </label>
          <input id="nbName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor="nbPhone" className={label}>
            Mobile number
          </label>
          <input id="nbPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" placeholder="+254" className={input} />
        </div>
        <div>
          <label htmlFor="nbEmail" className={label}>
            Email (optional)
          </label>
          <input id="nbEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor="nbNote" className={label}>
            Note for the file (optional)
          </label>
          <input id="nbNote" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} placeholder="e.g. Booked by phone" className={input} />
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2.5 text-sm">
        {model && model.addon > 0 && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={insure} onChange={(e) => setInsure(e.target.checked)} className="h-5 w-5" />
            Damage cover ({ksh(model.addon)}/day)
          </label>
        )}
        {!quote && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-5 w-5" />
            Full payment already received and checked
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="h-5 w-5" />
          Driver is 25+ and will bring licence and ID
        </label>
      </div>
      <div className="mt-3 grid max-w-[660px] gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {!(paid && !quote) && (
          <div>
            <label htmlFor="nbPaid" className={label}>
              Paid so far, KSh (optional)
            </label>
            <input
              id="nbPaid"
              inputMode="numeric"
              value={paidSoFar}
              onChange={(e) => setPaidSoFar(e.target.value)}
              placeholder="0"
              className={input}
            />
          </div>
        )}
        {!quote && (
          <div>
            <label htmlFor="nbMpesa" className={label}>
              M-Pesa code (optional)
            </label>
            <input id="nbMpesa" value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value)} className={input} />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f5f5f3] px-4 py-3 text-sm">
        <div>
          {dateError ? (
            <span className="font-bold text-[#9b1c1c]">{dateError}</span>
          ) : (
            <>
              <strong>{model?.name}</strong> · {plural(days, "day")} · hire {ksh(hireTotal)}
              {coverTotal ? " + cover " + ksh(coverTotal) : ""} = <strong>{ksh(total)}</strong>
              {quote ? " plus delivery (set later)" : ""}
              {paidAmount > 0 && (
                <span className="block">
                  Paid so far {ksh(paidAmount)} · <strong>Balance {ksh(balance)}</strong>
                  {quote ? " plus delivery" : ""}
                </span>
              )}
              {freeCount !== null && !quote && (
                <span className={"font-bold " + (freeCount > 0 ? "text-[#0d5a2a]" : "text-[#a50e0e]")}>
                  {" · "}
                  {freeCount > 0 ? freeCount + " of " + (model?.ids.length || 0) + " free" : "None free on these dates"}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={btnLight}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className={btnDark}>
            {saving ? "Saving…" : quote ? "Save as quote" : paid ? "Save as paid" : "Save and hold vehicle"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-[#a50e0e]">
          {error}
        </p>
      )}
    </section>
  );
}
