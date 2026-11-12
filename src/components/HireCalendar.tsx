"use client";

import { useMemo, useState } from "react";
import { addDays, dayNumber, formatDay, formatDayShort, ksh, todayNairobi, type StaffBooking } from "../lib/hire";

export type DeskVehicle = {
  id: string;
  model: string;
  plate: string;
  category: "saloon" | "suv" | "4x4";
};

const WIN = 28;
const TYPES = [
  { id: "all", label: "All vehicles" },
  { id: "saloon", label: "Saloon" },
  { id: "suv", label: "SUV" },
  { id: "4x4", label: "4x4" },
] as const;

function lastHireDay(pickup: string, returnOn: string) {
  if (returnOn > pickup) {
    const end = addDays(returnOn, -1);
    return end < pickup ? pickup : end;
  }
  return pickup;
}

function overlaps(start: number, end: number, from: number, to: number) {
  return start <= to && end >= from;
}

function clip(start: number, end: number, first: number) {
  const a = Math.max(start, first);
  const b = Math.min(end, first + WIN - 1);
  if (b < a) return null;
  return { left: ((a - first) / WIN) * 100, width: ((b - a + 1) / WIN) * 100 };
}

export default function HireCalendar({
  bookings,
  fleet,
  onAct,
}: {
  bookings: StaffBooking[];
  fleet: DeskVehicle[];
  onAct: (booking: StaffBooking, action: string, prompt: string, extra?: { deliveryFee?: string }) => void;
}) {
  const today = todayNairobi();
  const todayNum = dayNumber(today) ?? 0;
  const [offset, setOffset] = useState(0);
  const [before, setBefore] = useState(1);
  const [after, setAfter] = useState(1);
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("all");
  const [hideIdle, setHideIdle] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [quoteFee, setQuoteFee] = useState("");

  const holds = useMemo(
    () => bookings.filter((booking) => (booking.status === "pending" || booking.status === "confirmed") && booking.vehicleId),
    [bookings],
  );
  const quotes = bookings.filter((booking) => booking.status === "quote");
  const first = todayNum - 2 + offset;
  const days = Array.from({ length: WIN }, (_, index) => {
    const iso = addDays(today, index - 2 + offset);
    const num = dayNumber(iso) ?? 0;
    return { iso, num, label: formatDayShort(iso), today: iso === today };
  });

  const windowStart = offset === 0 ? todayNum : first;
  const windowEnd = offset === 0 ? todayNum + 6 : first + WIN - 1;
  const needle = query.trim().toLowerCase();

  const rows = fleet
    .filter((vehicle) => type === "all" || vehicle.category === type)
    .map((vehicle) => {
      const mine = holds.filter((booking) => booking.vehicleId === vehicle.id);
      const busy = mine.some((booking) => {
        const start = dayNumber(booking.pickup) ?? 0;
        const end = dayNumber(lastHireDay(booking.pickup, booking.returnOn)) ?? start;
        return overlaps(start - before, end + after, windowStart, windowEnd);
      });
      const matches =
        !needle ||
        (vehicle.model + " " + vehicle.plate).toLowerCase().includes(needle) ||
        mine.some((booking) => (booking.customerName + " " + booking.reference).toLowerCase().includes(needle));
      return { vehicle, mine, busy, matches };
    })
    .filter((row) => row.matches && !(hideIdle && !row.busy));

  const outToday = holds.filter((booking) => booking.pickup <= today && lastHireDay(booking.pickup, booking.returnOn) >= today);
  const coming = holds.filter((booking) => booking.pickup >= today && booking.pickup <= addDays(today, 6));
  const awaiting = holds.filter((booking) => booking.status === "pending");
  const chase = awaiting.filter((booking) => booking.pickup <= today);
  const awaitingTotal = awaiting.reduce((sum, booking) => sum + booking.total, 0);
  const chaseTotal = chase.reduce((sum, booking) => sum + booking.total, 0);
  const selected = bookings.find((booking) => booking.id === selectedId) || null;

  const pickups = holds.filter((booking) => booking.pickup === today).slice().sort((a, b) => a.pickTime.localeCompare(b.pickTime));
  const returns = holds.filter((booking) => booking.returnOn === today).slice().sort((a, b) => a.retTime.localeCompare(b.retTime));
  const onHire = holds
    .filter((booking) => booking.pickup < today && lastHireDay(booking.pickup, booking.returnOn) >= today)
    .slice()
    .sort((a, b) => a.returnOn.localeCompare(b.returnOn));

  function stepDays(current: number, delta: number) {
    return Math.max(0, Math.min(3, current + delta));
  }

  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Today</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <DayList title="Pick-ups today" empty="No pick-ups today." items={pickups} time={(booking) => booking.pickTime} onPick={setSelectedId} />
          <DayList title="Returns today" empty="No returns today." items={returns} time={(booking) => booking.retTime} onPick={setSelectedId} />
          <DayList title="On hire now" empty="No vehicles out on a longer hire." items={onHire} time={(booking) => "back " + formatDayShort(booking.returnOn)} onPick={setSelectedId} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Vehicles out today" value={outToday.length + " of " + fleet.length} note="On hire right now" />
        <Tile label="Collections in the next 7 days" value={String(coming.length)} note="Including today" />
        <Tile label="Awaiting payment" value={ksh(awaitingTotal)} note={awaiting.length + " booking" + (awaiting.length === 1 ? "" : "s") + " held until you confirm the full amount"} />
        <Tile label="Pickup reached, still unpaid" value={String(chase.length)} note={chase.length ? ksh(chaseTotal) + " to check before handover" : "Nothing to chase"} />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Booking calendar</h2>
            <p className="mt-1 text-sm text-neutral-600">Four weeks. A request holds the vehicle until you confirm the full payment, or you release it.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm" onClick={() => setOffset((value) => value - 7)}>
              ‹ Earlier
            </button>
            <button type="button" className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(0)}>
              Today
            </button>
            <button type="button" className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm" onClick={() => setOffset((value) => value + 7)}>
              Later ›
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-600">Prep before hire</span>
          <button type="button" className="rounded-md border border-neutral-300 px-2 py-1" onClick={() => setBefore((value) => stepDays(value, -1))}>−</button>
          <span>{before} day{before === 1 ? "" : "s"}</span>
          <button type="button" className="rounded-md border border-neutral-300 px-2 py-1" onClick={() => setBefore((value) => stepDays(value, 1))}>+</button>
          <span className="ml-3 text-neutral-600">Clean and service after</span>
          <button type="button" className="rounded-md border border-neutral-300 px-2 py-1" onClick={() => setAfter((value) => stepDays(value, -1))}>−</button>
          <span>{after} day{after === 1 ? "" : "s"}</span>
          <button type="button" className="rounded-md border border-neutral-300 px-2 py-1" onClick={() => setAfter((value) => stepDays(value, 1))}>+</button>
        </div>
        <p className="mt-2 text-sm text-neutral-500">Prep and cleaning days are a planning guide. Only the hire dates hold the vehicle.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vehicles, plates or customers"
            className="h-10 min-w-64 flex-1 rounded-md border border-neutral-300 px-3 text-sm"
          />
          {TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setType(item.id)}
              className={"rounded-full px-3 py-1.5 text-sm " + (type === item.id ? "bg-neutral-900 text-white" : "border border-neutral-300")}
            >
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => setHideIdle((value) => !value)} className={"rounded-full px-3 py-1.5 text-sm " + (hideIdle ? "bg-neutral-900 text-white" : "border border-neutral-300")}>
            {hideIdle ? "Hiding idle vehicles" : "Showing idle vehicles"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-600">
          <span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#ceead6] align-middle" /> Paid in full</span>
          <span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#feefc3] align-middle" /> Awaiting payment</span>
          <span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-[#f6d98a] align-middle" /> Prep or clean</span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
          <div className="min-w-[1100px]">
            <div className="grid" style={{ gridTemplateColumns: "220px 1fr" }}>
              <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">Vehicle</div>
              <div className="grid border-b border-neutral-200 bg-neutral-50" style={{ gridTemplateColumns: "repeat(28, minmax(0, 1fr))" }}>
                {days.map((day) => (
                  <div key={day.iso} className="px-0.5 py-2 text-center text-[10px] text-neutral-500">
                    <span className={"inline-flex h-5 min-w-5 items-center justify-center rounded-full " + (day.today ? "bg-neutral-900 text-white" : "")}>{day.label.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            {rows.length === 0 && <p className="p-5 text-sm text-neutral-600">No vehicles match this view.</p>}
            {rows.map(({ vehicle, mine }) => (
              <div key={vehicle.id} className="grid border-t border-neutral-100" style={{ gridTemplateColumns: "220px 1fr" }}>
                <div className="px-3 py-3">
                  <p className="text-sm font-medium">{vehicle.model}</p>
                  <p className="text-xs text-neutral-500">{vehicle.plate}</p>
                </div>
                <div className="relative h-16">
                  {mine.map((booking) => {
                    const start = dayNumber(booking.pickup) ?? 0;
                    const end = dayNumber(lastHireDay(booking.pickup, booking.returnOn)) ?? start;
                    const hire = clip(start, end, first);
                    const prep = before > 0 ? clip(start - before, start - 1, first) : null;
                    const clean = after > 0 ? clip(end + 1, end + after, first) : null;
                    const paid = booking.status === "confirmed";
                    return (
                      <div key={booking.id}>
                        {prep && <span className="absolute top-1 h-1.5 rounded-sm bg-[#f6d98a]" style={{ left: prep.left + "%", width: prep.width + "%" }} title="Prep before hire" />}
                        {clean && <span className="absolute bottom-1 h-1.5 rounded-sm bg-[#f6d98a]" style={{ left: clean.left + "%", width: clean.width + "%" }} title="Clean and service after hire" />}
                        {hire && (
                          <button
                            type="button"
                            onClick={() => setSelectedId(booking.id)}
                            className="absolute top-4 h-7 overflow-hidden rounded px-1 text-left text-[11px] font-medium"
                            style={{
                              left: hire.left + "%",
                              width: hire.width + "%",
                              background: paid ? "#ceead6" : "#feefc3",
                              color: paid ? "#0d5a2a" : "#5f4400",
                              outline: selectedId === booking.id ? "2px solid #171717" : "none",
                            }}
                          >
                            {booking.customerName}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selected && (
        <section className="rounded-xl border border-neutral-200 p-5">
          <h2 className="text-lg font-semibold">{selected.reference} · {selected.model}{selected.plate ? " · " + selected.plate : ""}</h2>
          <p className="mt-1 text-sm text-neutral-600">{selected.customerName} · {selected.phone} · {selected.email}</p>
          <p className="mt-3 text-sm">{formatDay(selected.pickup)}, {selected.pickTime} to {formatDay(selected.returnOn)}, {selected.retTime} · {selected.location}</p>
          <p className="mt-1 text-sm">{selected.deliverySummary}</p>
          <p className="mt-2 text-sm font-medium">{selected.status === "confirmed" ? "Paid in full" : selected.status === "pending" ? "Awaiting the full payment" : "Quote, not held yet"} · {ksh(selected.total)}{selected.deliveryManual ? " plus delivery" : ""}{selected.mpesaCode ? " · M-Pesa " + selected.mpesaCode : ""}</p>
          {selected.status === "quote" && (selected.deliveryManual || selected.deliveryFee === null) && (
            <label className="mt-4 block max-w-xs text-sm">
              <span className="mb-1 block text-neutral-500">Delivery charge (KSh). Use 0 if there is none.</span>
              <input
                inputMode="numeric"
                value={quoteFee}
                onChange={(event) => setQuoteFee(event.target.value)}
                className="h-10 w-full rounded-md border border-neutral-300 px-3"
              />
            </label>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {selected.status === "pending" && (
              <button type="button" className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white" onClick={() => onAct(selected, "confirm", "Confirm that the full payment for " + selected.reference + " has arrived?")}>
                Confirm payment received
              </button>
            )}
            {selected.status === "pending" && (
              <button type="button" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" onClick={() => onAct(selected, "release", "Release the hold on " + (selected.plate || selected.model) + "?")}>
                Release hold
              </button>
            )}
            {selected.status === "confirmed" && (
              <button type="button" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" onClick={() => onAct(selected, "cancel", "Cancel " + selected.reference + " and free the vehicle?")}>
                Cancel booking
              </button>
            )}
            {selected.status === "quote" && (
              <button type="button" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white" onClick={() => onAct(selected, "hold", "Hold a " + selected.model + " for " + selected.reference + "? It stays unpaid until you confirm the full amount.", { deliveryFee: quoteFee })}>
                Hold the vehicle
              </button>
            )}
            {selected.status === "quote" && (
              <button type="button" className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white" onClick={() => onAct(selected, "settle", "Confirm that the full payment for " + selected.reference + " has arrived, and hold a " + selected.model + "?", { deliveryFee: quoteFee })}>
                Confirm payment received
              </button>
            )}
            {selected.status === "quote" && (
              <button type="button" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" onClick={() => onAct(selected, "dismiss", "Reject " + selected.reference + "? The vehicle will not be held.")}>
                Reject request
              </button>
            )}
          </div>
        </section>
      )}

      {quotes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Quotes</h2>
          <p className="mt-1 text-sm text-neutral-600">These requests do not hold a vehicle. The amount, including delivery, is still to be agreed.</p>
          <ul className="mt-3 space-y-2">
            {quotes.map((booking) => (
              <li key={booking.id}>
                <button type="button" className="text-left text-sm underline" onClick={() => setSelectedId(booking.id)}>
                  {booking.reference} · {booking.customerName} · {booking.model} · {formatDayShort(booking.pickup)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-neutral-600">{note}</p>
    </div>
  );
}

function DayList({
  title,
  empty,
  items,
  time,
  onPick,
}: {
  title: string;
  empty: string;
  items: StaffBooking[];
  time: (booking: StaffBooking) => string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <h3 className="font-semibold">{title} <span className="text-neutral-500">{items.length}</span></h3>
      {items.length === 0 && <p className="mt-3 text-sm text-neutral-600">{empty}</p>}
      <ul className="mt-3 space-y-2">
        {items.map((booking) => (
          <li key={booking.id}>
            <button type="button" onClick={() => onPick(booking.id)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50">
              <span className="font-medium">{booking.customerName}</span>
              <span className="float-right text-neutral-500">{time(booking)}</span>
              <span className="mt-1 block text-neutral-600">{booking.plate} {booking.model}</span>
              <span className="mt-1 block text-xs">{booking.status === "confirmed" ? "Paid in full" : "Awaiting payment"} · {ksh(booking.total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
