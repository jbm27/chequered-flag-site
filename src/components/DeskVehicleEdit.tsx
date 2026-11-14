"use client";

import { useState } from "react";

// Edit form on a vehicle card (Vehicle records on the desk). Saving also clears the "back from hire" flag.

const label = "mb-1 block text-[13px] text-[#595959]";
const input = "h-10 w-full rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";

export default function DeskVehicleEdit({
  vehicle,
  returnNote,
  onClose,
  onSaved,
}: {
  vehicle: { id: string; model: string; plate: string; year?: number | null; km?: number | null; notes?: string };
  returnNote?: string; // set when the vehicle is back from a hire and needs checking
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, setYear] = useState(vehicle.year ? String(vehicle.year) : "");
  const [km, setKm] = useState(vehicle.km ? String(vehicle.km) : "");
  const [notes, setNotes] = useState(vehicle.notes || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const kmNumber = Number(km.replace(/[,\s]/g, ""));
  const lower = vehicle.km && km.trim() && Number.isFinite(kmNumber) && kmNumber < vehicle.km;

  async function save() {
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/hire/staff/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vehicle.id, year, km, notes }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The record could not be saved.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 border-t border-[#e5e5e5] bg-[#f5f5f3] px-3.5 py-3">
      <strong className="text-sm">
        Edit record: {vehicle.plate} {vehicle.model}
      </strong>
      {returnNote && (
        <p className="rounded-md border border-[#f1a9a3] bg-[#fce8e6] px-3 py-2 text-[13px] text-[#a50e0e]">{returnNote}</p>
      )}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
        <div>
          <label htmlFor={"vrKm-" + vehicle.id} className={label}>
            Odometer (km)
          </label>
          <input
            id={"vrKm-" + vehicle.id}
            inputMode="numeric"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label htmlFor={"vrYear-" + vehicle.id} className={label}>
            Year
          </label>
          <input
            id={"vrYear-" + vehicle.id}
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={input}
          />
        </div>
      </div>
      {lower ? (
        <p className="text-[13px] font-bold text-[#7a3e00]">
          This is lower than the last reading ({vehicle.km!.toLocaleString("en-US")} km). Check it before saving.
        </p>
      ) : null}
      <div>
        <label htmlFor={"vrNotes-" + vehicle.id} className={label}>
          Condition notes (damage, fuel, cleaning, service due)
        </label>
        <textarea
          id={"vrNotes-" + vehicle.id}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-[#c8c8c8] bg-white px-3 py-2 text-sm text-[#171717]"
        />
      </div>
      <p className="text-xs text-[#595959]">
        Model, number plate and prices are set in the fleet list, because bookings and pricing use them. Ask James to change those.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-[40px] items-center rounded-lg bg-[#171717] px-4 text-[13px] font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : returnNote ? "Save and mark as checked" : "Save record"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[40px] items-center rounded-lg border border-[#dadce0] bg-white px-4 text-[13px] font-bold"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-[#a50e0e]">
          {error}
        </p>
      )}
    </div>
  );
}
