"use client";

import { useState } from "react";
import { ksh, type StaffBooking } from "../lib/hire";

// "Discount" on the desk booking card. The customer books at the normal price; staff can then take an amount
// or a percentage off. A reason is required, and who gave it and when are shown. Saving 0 removes it.

const input = "h-10 w-full rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";

export default function DeskDiscount({ booking, onSaved }: { booking: StaffBooking; onSaved: (message: string) => void }) {
  const current = booking.discount || 0;
  const normal = booking.total + current; // the price before any discount
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"ksh" | "percent">("ksh");
  const [value, setValue] = useState(current ? String(current) : "");
  const [note, setNote] = useState(booking.discountNote || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const number = Number(value.replace(/[,\s]/g, "")) || 0;
  const amount = mode === "percent" ? Math.round((normal * Math.min(100, number)) / 100) : Math.round(number);
  const valid = /^\d*(\.\d+)?$/.test(value.replace(/[,\s]/g, "")) && amount >= 0 && amount <= normal;

  async function save(remove = false) {
    setError("");
    if (!remove && !valid) return setError("Enter an amount up to " + ksh(normal) + ".");
    if (!remove && amount > 0 && note.trim().length < 3) return setError("Add a short reason for the discount.");
    setBusy(true);
    try {
      const response = await fetch("/api/hire/staff/bookings/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, amount: remove ? 0 : amount, note: remove ? "" : note }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The discount could not be saved.");
      setEditing(false);
      onSaved(
        body.discount > 0
          ? booking.reference + ": discount of " + ksh(body.discount) + " saved. New total " + ksh(body.total) + "." +
              (body.status === "confirmed" && booking.status === "pending" ? " Now paid in full, so the booking is confirmed." : "")
          : booking.reference + ": discount removed. Total back to " + ksh(body.total) + ".",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "The discount could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (booking.status === "cancelled") return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(current ? String(current) : "");
          setMode("ksh");
          setNote(booking.discountNote || "");
          setError("");
          setEditing(true);
        }}
        className="inline-flex min-h-[36px] items-center rounded-lg border border-[#dadce0] bg-white px-3 text-[13px] font-bold hover:bg-[#f5f5f3]"
      >
        {current ? "Change discount" : "Add discount"}
      </button>
    );
  }

  return (
    <div className="mt-1 rounded-[10px] border border-[#e5e5e5] bg-[#fafaf8] p-3.5">
      <strong className="block text-sm">{current ? "Change the discount" : "Add a discount"}</strong>
      <p className="mt-0.5 text-[13px] text-[#595959]">
        Normal price {ksh(normal)}
        {booking.deliveryManual ? " plus delivery" : ""}. The customer&apos;s booking stays at the normal price; this changes
        the total on the desk and on the booking PDF.
      </p>
      <div role="group" aria-label="Discount as" className="mt-2.5 flex gap-1.5">
        {(
          [
            { id: "ksh", label: "KSh amount" },
            { id: "percent", label: "Percentage" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => {
              setMode(item.id);
              setValue("");
            }}
            className={
              "min-h-[34px] rounded-full border px-3 text-[13px] font-semibold " +
              (mode === item.id ? "border-[#171717] bg-[#171717] text-white" : "border-[#c8c8c8] bg-white text-[#171717]")
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2.5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <div>
          <label htmlFor={"disc-" + booking.id} className="mb-1 block text-[13px] text-[#595959]">
            {mode === "percent" ? "Discount (%)" : "Discount (KSh)"}
          </label>
          <input
            id={"disc-" + booking.id}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "percent" ? "e.g. 10" : "e.g. 2000"}
            className={input}
          />
        </div>
        <div>
          <label htmlFor={"discnote-" + booking.id} className="mb-1 block text-[13px] text-[#595959]">
            Reason
          </label>
          <input
            id={"discnote-" + booking.id}
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Returning customer"
            className={input}
          />
        </div>
      </div>
      {valid && amount > 0 && (
        <p className="mt-2 text-sm">
          {ksh(normal)} − {ksh(amount)}
          {mode === "percent" ? " (" + Math.min(100, number) + "%)" : ""} = <strong>{ksh(normal - amount)}</strong>
          {booking.amountPaid > 0 ? " · paid so far " + ksh(booking.amountPaid) : ""}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-[#a50e0e]">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => save()}
          className="inline-flex min-h-[38px] items-center rounded-lg bg-[#171717] px-4 text-[13px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save discount"}
        </button>
        {current > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => save(true)}
            className="inline-flex min-h-[38px] items-center rounded-lg border border-[#dadce0] bg-white px-4 text-[13px] font-bold text-[#a50e0e] disabled:opacity-50"
          >
            Remove discount
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex min-h-[38px] items-center rounded-lg border border-[#dadce0] bg-white px-4 text-[13px] font-bold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
