"use client";

import { useMemo, useState } from "react";
import { exclusiveEnd, ksh, type StaffBooking } from "../lib/hire";

// Customer log on the hire desk. Built from the bookings the desk already loads, so it needs no extra storage.
// Customers are matched by mobile number (last 9 digits, so +254 7… and 07… match), or by email if there is no number.
// Only held and paid bookings count as hires; quotes and cancelled bookings are listed in the history but not counted.

export const REGULAR_HIRES = 3; // "Regular hirers": this many hires or more
export const TOP_SPEND = 100_000; // "Top spenders": this much paid to date (KSh) or more

type Customer = {
  key: string;
  name: string;
  phone: string;
  email: string;
  bookings: StaffBooking[]; // every booking, newest first
  hires: StaffBooking[]; // held or paid, oldest first
  totalDays: number;
  paid: number;
  value: number;
  first: string;
  last: string; // most recent hire that has started
  next: string; // next hire that has not started
  onHire: boolean;
  everyDays: number | null; // average days between hires
  favourite: string;
  regular: boolean;
  top: boolean;
};

const TABS = [
  { id: "all", label: "All customers" },
  { id: "regular", label: "Regular hirers" },
  { id: "top", label: "Top spenders" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const SORTS = [
  { id: "recent", label: "Most recent hire" },
  { id: "hires", label: "Most hires" },
  { id: "paid", label: "Most paid" },
  { id: "name", label: "Name A–Z" },
] as const;
type Sort = (typeof SORTS)[number]["id"];

function customerKey(booking: StaffBooking) {
  const digits = booking.phone.replace(/\D/g, "");
  if (digits.length >= 9) return "p" + digits.slice(-9);
  if (booking.email) return "e" + booking.email.toLowerCase();
  return "n" + booking.customerName.toLowerCase().replace(/\s+/g, " ").trim();
}

function dayNum(iso: string) {
  return Math.round(Date.parse(iso + "T00:00:00Z") / 864e5);
}

function nice(iso: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function plural(n: number, word: string) {
  return n + " " + word + (n === 1 ? "" : "s");
}

function howOften(days: number | null) {
  if (days === null) return "Only one hire so far";
  if (days < 14) return "About every " + plural(Math.max(1, Math.round(days)), "day");
  if (days < 60) return "About every " + plural(Math.round(days / 7), "week");
  return "About every " + plural(Math.round(days / 30.4), "month");
}

function buildCustomers(bookings: StaffBooking[], today: string): Customer[] {
  const groups = new Map<string, StaffBooking[]>();
  for (const booking of bookings) {
    const key = customerKey(booking);
    const list = groups.get(key);
    if (list) list.push(booking);
    else groups.set(key, [booking]);
  }
  const out: Customer[] = [];
  groups.forEach((list, key) => {
    const hires = list
      .filter((b) => b.status === "pending" || b.status === "confirmed")
      .sort((a, b) => a.pickup.localeCompare(b.pickup));
    if (!hires.length) return;
    const newest = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const started = hires.filter((b) => b.pickup <= today);
    const upcoming = hires.filter((b) => b.pickup > today);
    const gaps: number[] = [];
    for (let i = 1; i < hires.length; i += 1) gaps.push(dayNum(hires[i].pickup) - dayNum(hires[i - 1].pickup));
    const counts = new Map<string, number>();
    hires.forEach((b) => counts.set(b.model, (counts.get(b.model) || 0) + 1));
    const favourite = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const paid = hires.reduce((sum, b) => sum + Math.min(b.amountPaid, b.total), 0);
    out.push({
      key,
      name: newest[0].customerName,
      phone: newest[0].phone,
      email: newest.find((b) => b.email)?.email || "",
      bookings: [...list].sort((a, b) => b.pickup.localeCompare(a.pickup)),
      hires,
      totalDays: hires.reduce((sum, b) => sum + b.days, 0),
      paid,
      value: hires.reduce((sum, b) => sum + b.total, 0),
      first: hires[0].pickup,
      last: started.length ? started[started.length - 1].pickup : "",
      next: upcoming.length ? upcoming[0].pickup : "",
      onHire: hires.some((b) => b.pickup <= today && today < exclusiveEnd(b.pickup, b.returnOn)),
      everyDays: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
      favourite,
      regular: hires.length >= REGULAR_HIRES,
      top: paid >= TOP_SPEND,
    });
  });
  return out;
}

const STATUS: Record<StaffBooking["status"], { label: string; cls: string }> = {
  confirmed: { label: "Paid", cls: "border-[#81c995] bg-[#ceead6] text-[#0d5a2a]" },
  pending: { label: "Held, awaiting payment", cls: "border-[#f9d46b] bg-[#feefc3] text-[#5f4400]" },
  quote: { label: "Quote", cls: "border-[#cdb9f0] bg-[#e8def8] text-[#3c1f7a]" },
  cancelled: { label: "Cancelled", cls: "border-[#dadce0] bg-[#e8eaed] text-[#3c4043]" },
};

function Badge({ kind }: { kind: "regular" | "top" | "now" }) {
  const look =
    kind === "regular"
      ? { text: "Regular hirer", cls: "border-[#aecbfa] bg-[#e8f0fe] text-[#174ea6]" }
      : kind === "top"
        ? { text: "Top spender", cls: "border-[#f7b267] bg-[#fff4e5] text-[#7a3e00]" }
        : { text: "On hire now", cls: "border-[#81c995] bg-[#ceead6] text-[#0d5a2a]" };
  return <span className={"inline-block whitespace-nowrap rounded-[10px] border px-2 py-0.5 text-xs font-bold " + look.cls}>{look.text}</span>;
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white px-3 py-2.5">
      <div className="text-xs text-[#595959]">{label}</div>
      <div className="text-[15px] font-bold">{value}</div>
      {note && <div className="text-xs text-[#595959]">{note}</div>}
    </div>
  );
}

export default function DeskCustomers({
  bookings,
  today,
  onOpenBooking,
}: {
  bookings: StaffBooking[];
  today: string;
  onOpenBooking: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  const customers = useMemo(() => buildCustomers(bookings, today), [bookings, today]);
  const counts = {
    all: customers.length,
    regular: customers.filter((c) => c.regular).length,
    top: customers.filter((c) => c.top).length,
  };

  const needle = query.trim().toLowerCase();
  const shown = customers
    .filter((c) => (tab === "regular" ? c.regular : tab === "top" ? c.top : true))
    .filter((c) => !needle || [c.name, c.phone, c.email].join(" ").toLowerCase().includes(needle))
    .sort((a, b) => {
      if (sort === "hires") return b.hires.length - a.hires.length || b.paid - a.paid;
      if (sort === "paid") return b.paid - a.paid || b.hires.length - a.hires.length;
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.last || b.next).localeCompare(a.last || a.next);
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Customer groups">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={
              "inline-flex min-h-[38px] cursor-pointer items-center rounded-full border border-[#dadce0] px-4 text-[13px] font-bold " +
              (tab === item.id ? "bg-[#171717] text-white" : "bg-white text-[#171717]")
            }
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>
      <p className="mb-3 text-[13px] text-[#595959]">
        {tab === "regular"
          ? "Customers with " + REGULAR_HIRES + " or more hires."
          : tab === "top"
            ? "Customers who have paid " + ksh(TOP_SPEND) + " or more in total."
            : "Everyone who has held or paid for a hire. Regular hirers have " +
              REGULAR_HIRES +
              "+ hires; top spenders have paid " +
              ksh(TOP_SPEND) +
              "+."}
      </p>
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <input
          type="text"
          aria-label="Search customers by name, phone or email"
          placeholder="Search name, phone or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full max-w-[320px] rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]"
        />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[#595959]">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 rounded-lg border border-[#c8c8c8] bg-white px-2 text-sm"
          >
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg bg-[#f5f5f3] px-4 py-3 text-sm text-[#595959]">
          {customers.length === 0 ? "No customers yet. They appear here once a booking is held or paid." : "No customers match."}
        </p>
      ) : (
        <ul className="grid min-w-0 grid-cols-1 gap-2.5">
          {shown.map((c) => {
            const isOpen = !!openKeys[c.key];
            const avgDays = Math.round((c.totalDays / c.hires.length) * 10) / 10;
            return (
              <li key={c.key} className="min-w-0 rounded-[10px] border border-[#e5e5e5] bg-[#fafaf8]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-[16px]">{c.name}</strong>
                      {c.regular && <Badge kind="regular" />}
                      {c.top && <Badge kind="top" />}
                      {c.onHire && <Badge kind="now" />}
                    </div>
                    <div className="mt-0.5 text-[13px] text-[#595959]">
                      <a href={"tel:" + c.phone.replace(/\s/g, "")} className="underline">
                        {c.phone}
                      </a>
                      {c.email ? " · " + c.email : ""}
                    </div>
                    <div className="mt-1 text-sm">
                      <strong>{plural(c.hires.length, "hire")}</strong> · {plural(c.totalDays, "day")} in total ·{" "}
                      <strong>{ksh(c.paid)}</strong> paid
                      <span className="text-[#595959]">
                        {" · "}
                        {c.last ? "last hired " + nice(c.last) : "first hire " + nice(c.next)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenKeys((cur) => ({ ...cur, [c.key]: !cur[c.key] }))}
                    className="inline-flex min-h-[40px] flex-none cursor-pointer items-center rounded-full border border-[#dadce0] bg-white px-4 text-[13px] font-bold"
                  >
                    {isOpen ? "Hide details ▲" : "Show details ▼"}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-[#e5e5e5] px-4 pb-4 pt-3">
                    <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(132px,1fr))]">
                      <Fact label="Customer since" value={nice(c.first)} />
                      <Fact label="Last hire" value={c.last ? nice(c.last) : "Not started yet"} />
                      <Fact label="Next hire" value={c.next ? nice(c.next) : "None booked"} />
                      <Fact label="How often" value={howOften(c.everyDays)} />
                      <Fact label="Usual length" value={plural(avgDays, "day")} note="Average per hire" />
                      <Fact label="Favourite vehicle" value={c.favourite} />
                      <Fact label="Paid to date" value={ksh(c.paid)} note={c.value > c.paid ? ksh(c.value - c.paid) + " still due" : "Nothing owed"} />
                    </div>

                    <div className="mt-3 text-[13px] font-bold uppercase tracking-[1.5px] text-[#595959]">Hire history</div>
                    <div className="relative mt-1.5 overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#e5e5e5] text-[13px] text-[#595959]">
                            <th className="px-2 py-1.5 font-semibold">Dates</th>
                            <th className="px-2 py-1.5 font-semibold">Vehicle</th>
                            <th className="px-2 py-1.5 font-semibold">Length</th>
                            <th className="px-2 py-1.5 font-semibold">Total</th>
                            <th className="px-2 py-1.5 font-semibold">Status</th>
                            <th className="px-2 py-1.5 font-semibold">
                              <span className="sr-only">Open</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.bookings.map((b) => (
                            <tr key={b.id} className="border-b border-[#eef0f2] align-top">
                              <td className="px-2 py-2">
                                {nice(b.pickup)} to {nice(b.returnOn)}
                                <span className="block text-xs text-[#595959]">{b.reference}</span>
                              </td>
                              <td className="px-2 py-2">{b.model}</td>
                              <td className="px-2 py-2">{plural(b.days, "day")}</td>
                              <td className="px-2 py-2">{ksh(b.total)}</td>
                              <td className="px-2 py-2">
                                <span className={"inline-block whitespace-nowrap rounded-[10px] border px-2 py-0.5 text-xs font-bold " + STATUS[b.status].cls}>
                                  {STATUS[b.status].label}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => onOpenBooking(b.id)}
                                  className="inline-flex min-h-[34px] cursor-pointer items-center rounded-lg border border-[#dadce0] bg-white px-3 text-[13px] font-bold"
                                >
                                  Open booking
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
