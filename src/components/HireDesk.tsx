"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, dayNumber, exclusiveEnd, formatDay, ksh, todayNairobi, type PublicBookingResult, type StaffBooking } from "../lib/hire";
import DeskAddBooking from "./DeskAddBooking";

// Staff desk laid out like Homer's fleet dashboard design (V1.5).
// It only uses the data and actions the desk already had: bookings, the fleet list, staff logins,
// and the confirm / release / cancel / quote actions. Booking rules are unchanged: a booking is held
// until staff confirm the full payment; prep and cleaning days are a visual guide only.

export type DeskVehicle = {
  id: string;
  model: string;
  plate: string;
  category: "saloon" | "suv" | "4x4";
  modelId?: string;
  fuel?: string;
  seats?: number;
  rate?: number;
  addon?: number;
  year?: number | null;
  km?: number | null;
};

type Chip = { label: string; bg: string; fg: string; bd: string };
type SectionKey = "overview" | "calendar" | "table" | "payments" | "vehicles" | "compare" | "schedule";

const WIN = 28;
const PAID = { bg: "#ceead6", fg: "#0d5a2a" };
const AWAIT = { bg: "#feefc3", fg: "#5f4400" };
const BUFFER = "#c4c7c5";

const CHIP_PAID: Chip = { label: "Paid in full", bg: "#ceead6", fg: "#0d5a2a", bd: "#81c995" };
const CHIP_AWAIT: Chip = { label: "Awaiting payment", bg: "#feefc3", fg: "#5f4400", bd: "#f9d46b" };
const CHIP_CODE: Chip = { label: "Payment code to check", bg: "#e8f0fe", fg: "#174ea6", bd: "#aecbfa" };
const CHIP_LATE: Chip = { label: "Unpaid, pick-up reached", bg: "#fce8e6", fg: "#a50e0e", bd: "#f1a9a3" };
const CHIP_QUOTE: Chip = { label: "Quote, not held", bg: "#e8def8", fg: "#3c1f7a", bd: "#cdb9f0" };
const CHIP_CLOSED: Chip = { label: "Closed", bg: "#e8eaed", fg: "#3c4043", bd: "#dadce0" };

const TYPES = [
  { id: "all", label: "All vehicles" },
  { id: "saloon", label: "Saloon" },
  { id: "suv", label: "SUV" },
  { id: "4x4", label: "4x4" },
] as const;

const TABLE_FILTERS = [
  { id: "pending", label: "Awaiting payment" },
  { id: "quote", label: "Quotes" },
  { id: "confirmed", label: "Paid in full" },
  { id: "cancelled", label: "Closed" },
  { id: "all", label: "All" },
] as const;

const card = "rounded-xl border border-[#e5e5e5] bg-white";
const pill =
  "inline-flex min-h-[38px] cursor-pointer items-center rounded-full border border-[#dadce0] px-4 text-[13px] font-bold";
const btnDark =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg bg-[#171717] px-4 text-[13px] font-bold text-white hover:bg-[#2b2b2b] disabled:opacity-50";
const btnGreen =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg bg-[#188038] px-4 text-[13px] font-bold text-white hover:bg-[#137333]";
const btnLight =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg border border-[#dadce0] bg-white px-4 text-[13px] font-bold text-[#171717] hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:opacity-40";
const input = "h-10 w-full rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";
const search = "h-10 w-full max-w-[320px] rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";

function lastHireDay(pickup: string, returnOn: string) {
  if (returnOn > pickup) {
    const end = addDays(returnOn, -1);
    return end < pickup ? pickup : end;
  }
  return pickup;
}

function num(iso: string) {
  return dayNumber(iso) ?? 0;
}

function isoOf(n: number) {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}

function short(iso: string) {
  const n = dayNumber(iso);
  if (n === null) return iso;
  return new Date(n * 86400000).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function range(a: number, b: number) {
  return a === b ? short(isoOf(a)) : short(isoOf(a)) + " to " + short(isoOf(b));
}

// Prep and cleaning time, in quarter days. A planning guide only: it never holds a vehicle.
const STEP = 0.25;
const MAX_BUFFER = 3;

function spanText(len: number) {
  if (len <= 0) return "None";
  const whole = Math.floor(len);
  const frac = Math.round((len - whole) * 4) / 4;
  const sym = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : "";
  if (whole === 0) return frac === 0.25 ? "Quarter day" : frac === 0.5 ? "Half day" : "Three-quarter day";
  return whole + sym + " day" + (whole === 1 && !sym ? "" : "s");
}

// A buffer runs from day s (may be fractional) for len days.
function bufferWhen(s: number, len: number) {
  return range(Math.floor(s), Math.ceil(s + len) - 1) + " (" + spanText(len).toLowerCase() + ")";
}

function plural(n: number, word: string) {
  return n + " " + word + (n === 1 ? "" : "s");
}

// The four-week strip of days used by both desk calendars.
function buildDays(first: number, todayNum: number) {
  return Array.from({ length: WIN }, (_, index) => {
    const n = first + index;
    const date = new Date(n * 86400000);
    return {
      n,
      dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()],
      num: date.getUTCDate(),
      mon:
        index === 0 || date.getUTCDate() === 1
          ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getUTCMonth()]
          : "",
      today: n === todayNum,
      weekend: date.getUTCDay() === 0,
    };
  });
}

function chipFor(booking: StaffBooking, today: string): Chip {
  if (booking.status === "confirmed") return CHIP_PAID;
  if (booking.status === "quote") return CHIP_QUOTE;
  if (booking.status === "cancelled") return CHIP_CLOSED;
  if (booking.pickup <= today) return CHIP_LATE;
  if (booking.mpesaCode) return CHIP_CODE;
  return CHIP_AWAIT;
}

function ChipView({ chip }: { chip: Chip }) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded-[10px] border px-2 py-0.5 text-xs font-bold"
      style={{ background: chip.bg, color: chip.fg, borderColor: chip.bd }}
    >
      {chip.label}
    </span>
  );
}

function matches(query: string, parts: (string | null | undefined)[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.join(" ").toLowerCase().includes(needle);
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

export default function HireDesk() {
  const today = todayNairobi();
  const T = num(today);

  const [ready, setReady] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [signedIn, setSignedIn] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [fleet, setFleet] = useState<DeskVehicle[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [fees, setFees] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const [team, setTeam] = useState<string[]>([]);
  const [memberName, setMemberName] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberPasswordAgain, setMemberPasswordAgain] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamNotice, setTeamNotice] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    overview: false,
    calendar: true,
    table: false,
    payments: false,
    vehicles: false,
    compare: false,
    schedule: false,
  });
  const [selectedId, setSelectedId] = useState("");
  const [detailOpen, setDetailOpen] = useState(true);
  const [offset, setOffset] = useState(0);
  const [availOffset, setAvailOffset] = useState(0);
  const [before, setBefore] = useState(1);
  const [after, setAfter] = useState(1);
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("all");
  const [hideIdle, setHideIdle] = useState(true);
  const [calQuery, setCalQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<(typeof TABLE_FILTERS)[number]["id"]>("pending");
  const [tableQuery, setTableQuery] = useState("");
  const [payQuery, setPayQuery] = useState("");
  const [scheduleQuery, setScheduleQuery] = useState("");
  const [hover, setHover] = useState<{ id: string; left: number; top: number; bottom: number } | null>(null);
  const [vehQuery, setVehQuery] = useState("");
  const [vehType, setVehType] = useState<(typeof TYPES)[number]["id"]>("all");
  const [vehOpen, setVehOpen] = useState<Record<string, boolean>>({});

  async function loadSession() {
    const response = await fetch("/api/hire/session");
    const body = await response.json();
    if (!response.ok) {
      setAuthError(body.error || "The hire desk could not be reached.");
      setReady(false);
      setLoading(false);
      return;
    }
    setReady(Boolean(body.ready));
    setSignedIn(body.authenticated ? body.username : "");
    setLoading(false);
  }

  async function loadBookings(): Promise<StaffBooking[]> {
    const response = await fetch("/api/hire/staff/bookings");
    const body = await response.json();
    if (response.status === 401) {
      setSignedIn("");
      return [];
    }
    if (!response.ok) {
      setMessage(body.error || "Bookings could not be loaded.");
      return [];
    }
    setBookings(body.bookings || []);
    setFleet(body.fleet || []);
    return body.bookings || [];
  }

  async function bookingAdded(result: PublicBookingResult) {
    setShowAdd(false);
    setMessage("");
    setNotice(
      result.reference +
        " added: " +
        result.model +
        ", " +
        short(result.pickup) +
        " to " +
        short(result.returnOn) +
        (result.status === "confirmed"
          ? ". Saved as paid in full."
          : result.status === "quote"
            ? ". Saved as a quote: set the delivery charge and hold the vehicle."
            : ". The vehicle is held until you confirm the payment."),
    );
    const list = await loadBookings();
    const added = list.find((booking) => booking.reference === result.reference);
    if (added) pick(added.id);
  }

  async function loadTeam() {
    const response = await fetch("/api/hire/staff/team");
    const body = await response.json();
    if (response.status === 401) {
      setSignedIn("");
      return;
    }
    if (!response.ok) {
      setTeamError(body.error || "The team list could not be loaded.");
      return;
    }
    setTeam((body.team || []).map((member: { username: string }) => member.username));
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (signedIn) {
      loadBookings();
      loadTeam();
    }
  }, [signedIn]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setAuthError("");
    const response = await fetch("/api/hire/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const body = await response.json();
    if (!response.ok) {
      setAuthError(body.error || "Sign-in failed.");
      return;
    }
    setPassword("");
    setSignedIn(body.username);
  }

  async function signOut() {
    await fetch("/api/hire/session", { method: "DELETE" });
    setSignedIn("");
    setBookings([]);
    setFleet([]);
    setSelectedId("");
    setShowTeam(false);
    setTeam([]);
    setTeamNotice("");
    setTeamError("");
  }

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setTeamError("");
    setTeamNotice("");
    if (memberPassword !== memberPasswordAgain) {
      setTeamError("Type the same password in both boxes.");
      return;
    }
    setAddingMember(true);
    const response = await fetch("/api/hire/staff/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: memberName, password: memberPassword }),
    });
    const body = await response.json();
    setAddingMember(false);
    if (response.status === 401) {
      setSignedIn("");
      return;
    }
    if (!response.ok) {
      setTeamError(body.error || "That team member could not be added.");
      return;
    }
    setTeam((body.team || []).map((member: { username: string }) => member.username));
    setMemberName("");
    setMemberPassword("");
    setMemberPasswordAgain("");
    setTeamNotice(body.username + " can now sign in on this page.");
  }

  function needsDeliveryPrice(booking: StaffBooking) {
    return booking.deliveryManual || booking.deliveryFee === null;
  }

  async function act(booking: StaffBooking, action: string, prompt: string) {
    let deliveryFee = fees[booking.id] || "";
    if ((action === "hold" || action === "settle") && needsDeliveryPrice(booking)) {
      deliveryFee = deliveryFee.trim().replace(/,/g, "");
      if (!/^\d+$/.test(deliveryFee) || Number(deliveryFee) > 500000) {
        setNotice("");
        setMessage("Enter the delivery charge as a whole number of shillings. Use 0 if there is no delivery charge.");
        return;
      }
    }
    if (!window.confirm(prompt)) return;
    setMessage("");
    setNotice("");
    const response = await fetch("/api/hire/staff/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, action, note: notes[booking.id] || "", deliveryFee }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "The booking could not be updated.");
      return;
    }
    if (action === "hold") setNotice(booking.reference + " is held. It is waiting for the full payment.");
    else if (action === "settle" || action === "confirm") setNotice(booking.reference + " is confirmed. The vehicle is held.");
    else if (action === "dismiss") setNotice(booking.reference + " was rejected.");
    else setNotice(booking.reference + " was closed and the vehicle is free.");
    await loadBookings();
  }

  function showHover(id: string, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    setHover({ id, left: rect.left, top: rect.top, bottom: rect.bottom });
  }

  useEffect(() => {
    if (!hover) return;
    const hide = () => setHover(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [hover]);

  function pick(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
    window.setTimeout(() => {
      document.getElementById("booking-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  // ---------- derived data ----------
  const fleetById = useMemo(() => {
    const map: Record<string, DeskVehicle> = {};
    for (const vehicle of fleet) map[vehicle.id] = vehicle;
    return map;
  }, [fleet]);

  const holds = useMemo(
    () => bookings.filter((booking) => (booking.status === "pending" || booking.status === "confirmed") && booking.vehicleId),
    [bookings],
  );
  const current = holds.filter((booking) => lastHireDay(booking.pickup, booking.returnOn) >= today);
  const outToday = holds.filter((booking) => booking.pickup <= today && lastHireDay(booking.pickup, booking.returnOn) >= today);
  const coming = holds.filter((booking) => booking.pickup >= today && booking.pickup <= addDays(today, 6));
  const awaiting = current.filter((booking) => booking.status === "pending");
  const chase = awaiting.filter((booking) => booking.pickup <= today);
  const awaitingTotal = awaiting.reduce((sum, booking) => sum + booking.total, 0);
  const chaseTotal = chase.reduce((sum, booking) => sum + booking.total, 0);
  const paidCurrent = current.filter((booking) => booking.status === "confirmed");
  const paidTotal = paidCurrent.reduce((sum, booking) => sum + booking.total, 0);
  const codesToCheck = bookings.filter((booking) => booking.status === "pending" && booking.mpesaCode);
  const quotes = bookings.filter((booking) => booking.status === "quote");
  const selected = bookings.find((booking) => booking.id === selectedId) || null;

  const pickups = holds.filter((b) => b.pickup === today).sort((a, b) => a.pickTime.localeCompare(b.pickTime));
  const returns = holds.filter((b) => b.returnOn === today).sort((a, b) => a.retTime.localeCompare(b.retTime));
  const onHire = holds
    .filter((b) => b.pickup < today && b.returnOn > today)
    .sort((a, b) => a.returnOn.localeCompare(b.returnOn));

  const chaseText = chase.length
    ? plural(chase.length, "booking") + " reached pick-up still unpaid (" + ksh(chaseTotal) + ")"
    : "";
  const flags: Record<SectionKey, string> = {
    overview: chaseText,
    calendar: "",
    table: chaseText,
    payments: codesToCheck.length ? plural(codesToCheck.length, "payment code") + " to check" : "",
    vehicles: "",
    compare: chase.length ? plural(chase.length, "booking") + " unpaid at pick-up" : "",
    schedule: "",
  };

  // Calendar
  const first = T - 2 + offset;
  const lastCol = first + WIN - 1;
  const calDays = buildDays(first, T);
  function bufferBox(s: number, len: number) {
    const a = Math.max(s, first);
    const b = Math.min(s + len, first + WIN);
    if (b <= a) return null;
    return { left: ((a - first) / WIN) * 100 + "%", width: ((b - a) / WIN) * 100 + "%" };
  }
  function col(start: number, end: number) {
    const a = Math.max(start, first);
    const b = Math.min(end, lastCol);
    if (b < a) return null;
    return a - first + 1 + " / " + (b - first + 2);
  }
  const calRows = fleet
    .filter((vehicle) => type === "all" || vehicle.category === type)
    .map((vehicle) => {
      const mine = holds.filter((booking) => booking.vehicleId === vehicle.id);
      const busy = mine.some((booking) => {
        const start = num(booking.pickup);
        const end = num(lastHireDay(booking.pickup, booking.returnOn));
        return start - before <= lastCol && end + after >= first;
      });
      const hit = matches(calQuery, [vehicle.model, vehicle.plate, ...mine.map((b) => b.customerName + " " + b.reference)]);
      return { vehicle, mine, busy, hit };
    })
    .filter((row) => row.hit && !(hideIdle && !row.busy && !calQuery.trim()));
  const idleCount = fleet.filter((vehicle) => type === "all" || vehicle.category === type).length - calRows.length;

  // Availability by model: how many of each model are free each day in the same window.
  // Held (pending) and paid hires count as booked; quotes and prep or cleaning days do not,
  // which matches what the public booking page checks.
  // It has its own Earlier / Later, independent of the job calendar above.
  const availFirst = T - 2 + availOffset;
  const availDays = buildDays(availFirst, T);
  const modelAvail = Array.from(
    new Set(fleet.filter((vehicle) => type === "all" || vehicle.category === type).map((vehicle) => vehicle.model)),
  ).map((model) => {
    const ids = fleet.filter((vehicle) => vehicle.model === model).map((vehicle) => vehicle.id);
    const counts = availDays.map((day) => {
      const iso = isoOf(day.n);
      const busy = ids.filter((id) =>
        holds.some((booking) => booking.vehicleId === id && booking.pickup <= iso && iso < exclusiveEnd(booking.pickup, booking.returnOn)),
      ).length;
      return ids.length - busy;
    });
    return { model, total: ids.length, counts };
  });

  // Table
  const tableCounts = {
    pending: bookings.filter((b) => b.status === "pending").length,
    quote: quotes.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    all: bookings.length,
  };
  const tableRows = bookings
    .filter((b) => tableFilter === "all" || b.status === tableFilter)
    .filter((b) => matches(tableQuery, [b.customerName, b.reference, b.model, b.plate, b.phone, chipFor(b, today).label]))
    .sort((a, b) => a.pickup.localeCompare(b.pickup));

  // Payment codes
  const payRows = bookings
    .filter((b) => b.mpesaCode && (b.status === "pending" || b.status === "confirmed"))
    .filter((b) => matches(payQuery, [b.customerName, b.phone, b.mpesaCode, b.reference]))
    .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "pending" ? -1 : 1));

  // Schedule
  const schedule = holds
    .flatMap((booking) => {
      const vehicle = booking.vehicleId ? fleetById[booking.vehicleId] : null;
      const name = vehicle ? vehicle.plate + " " + vehicle.model : booking.model;
      const start = num(booking.pickup);
      const end = num(lastHireDay(booking.pickup, booking.returnOn));
      const items: { name: string; kind: string; s: number; len: number; detail: string }[] = [];
      if (before > 0) items.push({ name, kind: "Prep before hire", s: start - before, len: before, detail: "for " + booking.customerName });
      if (after > 0) items.push({ name, kind: "Clean and service after hire", s: end + 1, len: after, detail: "after " + booking.customerName });
      return items;
    })
    .filter((item) => item.s + item.len > T && item.s < T + 14)
    .filter((item) => matches(scheduleQuery, [item.name, item.kind, item.detail]))
    .sort((a, b) => a.s - b.s);

  // Vehicle records (read-only)
  const thisYear = Number(today.slice(0, 4));
  const vehCards = fleet
    .filter((vehicle) => vehType === "all" || vehicle.category === vehType)
    .filter((vehicle) => matches(vehQuery, [vehicle.model, vehicle.plate, vehicle.year ? String(vehicle.year) : ""]))
    .map((vehicle) => {
      const mine = holds
        .filter((booking) => booking.vehicleId === vehicle.id)
        .sort((a, b) => a.pickup.localeCompare(b.pickup));
      const now = mine.find((booking) => booking.pickup <= today && lastHireDay(booking.pickup, booking.returnOn) >= today) || null;
      const next = mine.find((booking) => booking.pickup > today) || null;
      return { vehicle, now, next };
    });
  const allVehOpen = vehCards.length > 0 && vehCards.every((card) => vehOpen[card.vehicle.id]);

  function downloadCsv() {
    const header = ["Reference", "Status", "Customer", "Phone", "Email", "Vehicle", "Plate", "Pick-up", "Return", "Total (KSh)", "M-Pesa code", "Staff note"];
    const lines = [header.join(",")].concat(
      bookings.map((b) =>
        [b.reference, chipFor(b, today).label, b.customerName, b.phone, b.email, b.model, b.plate || "", b.pickup, b.returnOn, b.total, b.mpesaCode, b.staffNote]
          .map(csvCell)
          .join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hire-bookings-" + today + ".csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // ---------- rendering ----------
  if (loading) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-[#595959]">Checking sign-in…</p>;
  }

  if (!signedIn) {
    return (
      <div className="min-h-[70vh] bg-[#f7f7f5] text-[15px] text-[#171717]">
        <DeskHeader today={today} />
        <main className="mx-auto max-w-md px-5 py-14">
          <div className={card + " p-6"}>
            <h1 className="text-[26px] font-bold tracking-[-0.02em]">Hire desk</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#3f3f3f]">
              Staff sign-in for vehicle bookings. A request holds the vehicle until you confirm that the full payment has
              arrived, or you release it.
            </p>
            {ready === false && (
              <p className="mt-4 text-sm font-bold text-[#a50e0e]" role="alert">
                {authError || "Add HIRE_STAFF_USERNAME and HIRE_STAFF_PASSWORD in Vercel, then redeploy, before signing in."}
              </p>
            )}
            <form onSubmit={signIn} className="mt-5 space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block text-[13px] text-[#595959]">Username</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={input + " h-11"} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-[13px] text-[#595959]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={input + " h-11"}
                />
              </label>
              {authError && ready !== false && (
                <p className="text-sm font-bold text-[#a50e0e]" role="alert">
                  {authError}
                </p>
              )}
              <button type="submit" className={btnDark + " min-h-[44px] w-full uppercase tracking-[1px]"}>
                Sign in
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  const sectionHead = (key: SectionKey, title: string, size: "lg" | "md" = "lg") => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {size === "lg" ? (
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">{title}</h2>
      ) : (
        <strong className="text-lg">{title}</strong>
      )}
      <button
        type="button"
        aria-expanded={open[key]}
        onClick={() => setOpen((value) => ({ ...value, [key]: !value[key] }))}
        className="inline-flex min-h-[40px] flex-none cursor-pointer items-center rounded-full border border-[#dadce0] bg-white px-4 text-[13px] font-bold text-[#171717]"
      >
        {open[key] ? "Hide details ▲" : "Show details ▼"}
      </button>
      {flags[key] && (
        <span
          role="status"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-[#f1a9a3] bg-[#fce8e6] px-3 py-1.5 text-[13px] font-bold text-[#a50e0e]"
        >
          ⚠ {flags[key]}
        </span>
      )}
    </div>
  );

  const tiles = [
    { label: "Vehicles out today", value: outToday.length + " of " + fleet.length, note: "On hire right now", accent: "#1a73e8" },
    { label: "Collections in the next 7 days", value: String(coming.length), note: "Including today", accent: "#171717" },
    {
      label: "Awaiting payment",
      value: ksh(awaitingTotal),
      note: plural(awaiting.length, "booking") + " held until you confirm the full amount",
      accent: "#171717",
    },
    {
      label: "Pick-up reached, still unpaid",
      value: String(chase.length),
      note: chase.length ? ksh(chaseTotal) + " to check before handover" : "Nothing to chase",
      accent: "#d93025",
    },
  ];

  const todayGroups = [
    { title: "Pick-ups today", items: pickups, empty: "No pick-ups today.", time: (b: StaffBooking) => b.pickTime, accent: "#1a73e8" },
    { title: "Returns today", items: returns, empty: "No returns today.", time: (b: StaffBooking) => b.retTime, accent: "#188038" },
    {
      title: "On hire now",
      items: onHire,
      empty: "No vehicles out on a longer hire.",
      time: (b: StaffBooking) => "back " + short(b.returnOn),
      accent: "#e37400",
    },
  ];

  const collectedPct = paidTotal + awaitingTotal ? Math.round((paidTotal / (paidTotal + awaitingTotal)) * 100) : 0;

  return (
    <div className="bg-[#f7f7f5] text-[15px] leading-normal text-[#171717]">
      <DeskHeader today={today}>
        <span className="text-sm text-[#595959]">Signed in as {signedIn}</span>
        <button
          type="button"
          onClick={() => {
            setShowAdd((value) => !value);
            setNotice("");
          }}
          className={btnDark}
        >
          + Add booking
        </button>
        <button type="button" onClick={() => setShowTeam((value) => !value)} className={btnLight}>
          Team
        </button>
        <a href="/vehicle-hire" className="font-medium text-[#171717]">
          Customer website
        </a>
        <button type="button" onClick={signOut} className={btnLight}>
          Sign out
        </button>
      </DeskHeader>

      <main className="mx-auto box-border max-w-[1280px] px-[5.5%] pb-14 pt-7">
        <p className="mb-[18px] rounded-lg bg-[#e8f0fe] px-3.5 py-2.5 text-sm text-[#174ea6]">
          Confirm a booking only after the full amount is on the M-Pesa or bank statement. Prep and cleaning days are a
          planning guide; only the hire dates hold a vehicle.
        </p>

        {message && (
          <p role="alert" className="mb-4 rounded-lg border border-[#f1a9a3] bg-[#fce8e6] px-3.5 py-2.5 text-sm font-bold text-[#a50e0e]">
            {message}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-4 rounded-lg border border-[#81c995] bg-[#ceead6] px-3.5 py-2.5 text-sm font-bold text-[#0d5a2a]">
            {notice}
          </p>
        )}

        {showAdd && fleet.length > 0 && (
          <DeskAddBooking fleet={fleet} holds={holds} onDone={bookingAdded} onClose={() => setShowAdd(false)} />
        )}

        {showTeam && (
          <section className={card + " mb-[22px] p-[22px]"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-bold tracking-[-0.02em]">Team</h2>
                <p className="mt-1 text-sm text-[#595959]">
                  Add a username for someone else. They sign in on this same page and can confirm payments.
                </p>
              </div>
              <button type="button" onClick={() => setShowTeam(false)} className={btnLight}>
                Close
              </button>
            </div>
            {team.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {team.map((name) => (
                  <li key={name} className="rounded-full border border-[#dadce0] px-3 py-1 text-sm">
                    {name}
                    {name === signedIn ? " (you)" : ""}
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addMember} className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1.5 block text-[13px] text-[#595959]">Username</span>
                <input value={memberName} onChange={(e) => setMemberName(e.target.value)} autoComplete="off" className={input} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-[13px] text-[#595959]">Password</span>
                <input
                  type="password"
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  autoComplete="new-password"
                  className={input}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-[13px] text-[#595959]">Password again</span>
                <input
                  type="password"
                  value={memberPasswordAgain}
                  onChange={(e) => setMemberPasswordAgain(e.target.value)}
                  autoComplete="new-password"
                  className={input}
                />
              </label>
              <div className="sm:col-span-3">
                <p className="text-[13px] text-[#595959]">
                  3 to 40 characters: letters, numbers, dots, underscores, or hyphens. Password at least 8 characters.
                </p>
                {teamError && (
                  <p className="mt-2 text-sm font-bold text-[#a50e0e]" role="alert">
                    {teamError}
                  </p>
                )}
                {teamNotice && <p className="mt-2 text-sm font-bold text-[#0d5a2a]">{teamNotice}</p>}
                <button type="submit" disabled={addingMember} className={btnDark + " mt-3"}>
                  {addingMember ? "Adding…" : "Add team member"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Overview */}
        <div className="mb-3">{sectionHead("overview", "Overview", "md")}</div>
        {open.overview && (
          <>
            <section className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
              {tiles.map((tile) => (
                <div key={tile.label} className={card + " border-t-4 px-[18px] py-4"} style={{ borderTopColor: tile.accent }}>
                  <div className="text-[13px] text-[#595959]">{tile.label}</div>
                  <div className="mb-0.5 mt-1 text-[32px] font-bold tracking-[-0.02em]">{tile.value}</div>
                  <div className="text-[13px] text-[#3f3f3f]">{tile.note}</div>
                </div>
              ))}
            </section>
            <div className={card + " mt-3.5 px-5 py-[18px]"}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <strong className="text-lg">Today</strong>
                <span className="text-[13px] text-[#595959]">Today, {short(today)} · select a booking to open its details</span>
              </div>
              <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {todayGroups.map((group) => (
                  <div key={group.title} className="min-w-0 rounded-[10px] bg-[#f5f5f3] px-3.5 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <strong className="text-sm">{group.title}</strong>
                      <span className="inline-grid h-6 min-w-[24px] place-items-center rounded-xl bg-[#171717] px-2 text-xs font-bold text-white">
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.length === 0 && <div className="py-1.5 text-[13px] text-[#595959]">{group.empty}</div>}
                    <div className="grid gap-2">
                      {group.items.map((booking) => {
                        const vehicle = booking.vehicleId ? fleetById[booking.vehicleId] : null;
                        return (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => pick(booking.id)}
                            className="block w-full cursor-pointer rounded-lg border border-l-4 border-[#e5e5e5] bg-white px-3 py-2.5 text-left text-[13px] leading-[1.45] text-[#171717] hover:bg-[#fafafa]"
                            style={{ borderLeftColor: group.accent }}
                          >
                            <span className="flex justify-between gap-2">
                              <strong className="text-sm">{booking.customerName}</strong>
                              <strong>{group.time(booking)}</strong>
                            </span>
                            <span className="block">{vehicle ? vehicle.plate + " " + vehicle.model : booking.model}</span>
                            <span className="block text-[#595959]">
                              {booking.phone} · {booking.location} · {ksh(booking.total)}
                            </span>
                            <span className="mt-1 inline-block">
                              <ChipView chip={chipFor(booking, today)} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Booking calendar */}
        <section className={card + " mt-[22px] p-[22px]"}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-7 gap-y-3.5">
            <div>
              {sectionHead("calendar", "Booking calendar")}
              <p className="mt-1 max-w-[760px] text-sm text-[#595959]">
                Four weeks at a time. Use Earlier and Later to see past and future bookings. Vehicles with nothing booked in
                the period shown are hidden until you choose to show them. Select a booking to see its details.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              <Stepper
                label="Prep before hire"
                value={before}
                onLess={() => setBefore((v) => Math.max(0, v - STEP))}
                onMore={() => setBefore((v) => Math.min(MAX_BUFFER, v + STEP))}
              />
              <Stepper
                label="Clean and service after hire"
                value={after}
                onLess={() => setAfter((v) => Math.max(0, v - STEP))}
                onMore={() => setAfter((v) => Math.min(MAX_BUFFER, v + STEP))}
              />
            </div>
          </div>

          {open.calendar && (
            <>
              <div className="mb-3.5 flex flex-wrap items-center gap-2">
                <button type="button" className={btnLight + " rounded-full"} onClick={() => setOffset((v) => v - 7)}>
                  ‹ Earlier
                </button>
                <button type="button" className={btnLight + " rounded-full"} disabled={offset === 0} onClick={() => setOffset(0)}>
                  Today
                </button>
                <button type="button" className={btnLight + " rounded-full"} onClick={() => setOffset((v) => v + 7)}>
                  Later ›
                </button>
                <strong className="ml-1.5 text-sm">{range(first, lastCol)}</strong>
              </div>
              <div className="mb-3.5">
                <input
                  type="text"
                  aria-label="Search vehicles, plates or customers"
                  value={calQuery}
                  onChange={(e) => setCalQuery(e.target.value)}
                  placeholder="Search vehicles, plates or customers"
                  className={search}
                />
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={type === item.id}
                    onClick={() => setType(item.id)}
                    className={pill + (type === item.id ? " bg-[#171717] text-white" : " bg-white text-[#171717]")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-pressed={!hideIdle}
                  onClick={() => setHideIdle((v) => !v)}
                  className={pill + " bg-white text-[#171717]"}
                >
                  {hideIdle ? "Show idle vehicles" : "Hide idle vehicles"}
                </button>
                <span className="text-[13px] text-[#595959]">
                  {hideIdle && idleCount > 0
                    ? plural(idleCount, "vehicle") + " with nothing booked in this period " + (idleCount === 1 ? "is" : "are") + " hidden."
                    : "Showing every vehicle in this group."}
                </span>
              </div>
              <div className="mb-3 flex flex-wrap gap-x-[18px] gap-y-2 text-[13px]">
                <Legend bg={PAID.bg} h={16} label="Hire, paid in full" />
                <Legend bg={AWAIT.bg} h={16} label="Hire, awaiting payment" />
                <Legend bg={BUFFER} h={8} label="Prep before / clean and service after" />
              </div>
              {calRows.length === 0 && (
                <p className="mb-3 text-sm text-[#595959]">
                  {calQuery.trim()
                    ? "Nothing matches your search."
                    : "No vehicles in this group have a hire in the period shown."}
                </p>
              )}
              <div className="overflow-x-auto">
                <div className="min-w-[980px] overflow-hidden rounded-lg border border-[#dadce0]">
                  <div className="grid border-b border-[#dadce0] bg-white" style={{ gridTemplateColumns: "200px minmax(0, 1fr)" }}>
                    <div className="self-end px-2.5 pb-2 text-[13px] font-bold">Vehicle</div>
                    <div className="grid" style={{ gridTemplateColumns: "repeat(" + WIN + ", minmax(0, 1fr))" }}>
                      {calDays.map((day) => (
                        <div key={day.n} className="pb-2 pt-1.5 text-center leading-tight">
                          <span className="block min-h-[15px] text-xs text-[#70757a]">{day.mon}</span>
                          <span className="block text-xs text-[#70757a]">{day.dow}</span>
                          <strong
                            className={
                              "mt-0.5 inline-grid h-7 w-7 place-items-center rounded-full text-[13px] " +
                              (day.today ? "bg-[#1a73e8] text-white" : "")
                            }
                          >
                            {day.num}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  {calRows.map(({ vehicle, mine }) => (
                    <div
                      key={vehicle.id}
                      className="grid border-b border-[#dadce0] bg-white last:border-b-0"
                      style={{ gridTemplateColumns: "200px minmax(0, 1fr)" }}
                    >
                      <div className="flex flex-col justify-center border-r border-[#dadce0] px-2.5 py-1.5 text-sm leading-tight">
                        <strong>{vehicle.model}</strong>
                        <span className="text-xs text-[#595959]">{vehicle.plate}</span>
                      </div>
                      <div
                        className="relative grid py-1.5"
                        style={{
                          gridTemplateColumns: "repeat(" + WIN + ", minmax(0, 1fr))",
                          gridTemplateRows: "30px 8px",
                          rowGap: "4px",
                          backgroundImage:
                            "linear-gradient(to right, #eef0f2 1px, transparent 1px)" +
                            (T >= first && T <= lastCol ? ", linear-gradient(rgba(26,115,232,0.08), rgba(26,115,232,0.08))" : ""),
                          backgroundSize:
                            "calc(100% / " + WIN + ") 100%" + (T >= first && T <= lastCol ? ", calc(100% / " + WIN + ") 100%" : ""),
                          backgroundPosition: "0 0" + (T >= first && T <= lastCol ? ", " + ((T - first) / (WIN - 1)) * 100 + "% 0" : ""),
                          backgroundRepeat: "repeat-x" + (T >= first && T <= lastCol ? ", no-repeat" : ""),
                        }}
                      >
                        {mine.flatMap((booking) => {
                          const start = num(booking.pickup);
                          const end = num(lastHireDay(booking.pickup, booking.returnOn));
                          const paid = booking.status === "confirmed";
                          const pal = paid ? PAID : AWAIT;
                          const parts: React.ReactNode[] = [];
                          const hire = col(start, end);
                          if (hire) {
                            parts.push(
                              <div key={booking.id + "h"} className="min-w-0 px-0.5" style={{ gridColumn: hire, gridRow: 1 }}>
                                <button
                                  type="button"
                                  onClick={() => pick(booking.id)}
                                  aria-describedby={hover?.id === booking.id ? "cal-hover" : undefined}
                                  onMouseEnter={(event) => showHover(booking.id, event.currentTarget)}
                                  onMouseLeave={() => setHover(null)}
                                  onFocus={(event) => showHover(booking.id, event.currentTarget)}
                                  onBlur={() => setHover(null)}
                                  className="block h-[30px] w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-md border-0 px-2 text-left text-[13px] font-bold leading-[30px]"
                                  style={{
                                    background: pal.bg,
                                    color: pal.fg,
                                    boxShadow: selectedId === booking.id ? "0 0 0 2px #1a73e8" : "none",
                                  }}
                                >
                                  {booking.customerName}
                                  {paid ? "" : " · unpaid"}
                                </button>
                              </div>,
                            );
                          }
                          const prep = before > 0 ? bufferBox(start - before, before) : null;
                          if (prep) {
                            parts.push(
                              <div
                                key={booking.id + "p"}
                                title={"Prep before hire for " + booking.customerName + ", " + bufferWhen(start - before, before)}
                                className="absolute top-[40px] h-2 rounded border-x-2 border-white"
                                style={{ left: prep.left, width: prep.width, background: BUFFER }}
                              />,
                            );
                          }
                          const clean = after > 0 ? bufferBox(end + 1, after) : null;
                          if (clean) {
                            parts.push(
                              <div
                                key={booking.id + "c"}
                                title={"Clean and service after " + booking.customerName + ", " + bufferWhen(end + 1, after)}
                                className="absolute top-[40px] h-2 rounded border-x-2 border-white"
                                style={{ left: clean.left, width: clean.width, background: BUFFER }}
                              />,
                            );
                          }
                          return parts;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Availability by model */}
              <div className="mt-6">
                <h3 className="text-lg font-bold">Availability by model</h3>
                <p className="mb-3 mt-1 max-w-[760px] text-sm text-[#595959]">
                  How many of each model are free on each day. Use Earlier, Later or Go to date to check any dates, for
                  example while a customer is on the phone. Held and paid hires count as booked; quotes and prep or
                  cleaning days do not. Customers do not see this on the website.
                </p>
                <div className="mb-3.5 flex flex-wrap items-center gap-2">
                  <button type="button" className={btnLight + " rounded-full"} onClick={() => setAvailOffset((v) => v - 7)}>
                    ‹ Earlier
                  </button>
                  <button
                    type="button"
                    className={btnLight + " rounded-full"}
                    disabled={availOffset === 0}
                    onClick={() => setAvailOffset(0)}
                  >
                    Today
                  </button>
                  <button type="button" className={btnLight + " rounded-full"} onClick={() => setAvailOffset((v) => v + 7)}>
                    Later ›
                  </button>
                  <strong className="ml-1.5 text-sm">{range(availFirst, availFirst + WIN - 1)}</strong>
                  <label className="ml-auto flex items-center gap-2 text-sm text-[#595959]">
                    Go to date
                    <input
                      type="date"
                      aria-label="Go to date in availability by model"
                      value={isoOf(availFirst + 2)}
                      onChange={(e) => {
                        const n = dayNumber(e.target.value);
                        if (n !== null) setAvailOffset(n - T);
                      }}
                      className="h-10 rounded-lg border border-[#c8c8c8] bg-white px-2 text-sm text-[#171717]"
                    />
                  </label>
                </div>
                <div className="mb-3 flex flex-wrap gap-x-[18px] gap-y-2 text-[13px]">
                  <Legend bg="#e6f4ea" h={16} label="All free" />
                  <Legend bg="#feefc3" h={16} label="Some free" />
                  <Legend bg="#dadce0" h={16} label="None free" />
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[980px] overflow-hidden rounded-lg border border-[#dadce0]">
                    <div className="grid border-b border-[#dadce0] bg-white" style={{ gridTemplateColumns: "200px minmax(0, 1fr)" }}>
                      <div className="self-end px-2.5 pb-2 text-[13px] font-bold">Model</div>
                      <div className="grid" style={{ gridTemplateColumns: "repeat(" + WIN + ", minmax(0, 1fr))" }}>
                        {availDays.map((day) => (
                          <div key={day.n} className="pb-2 pt-1.5 text-center leading-tight">
                            <span className="block min-h-[15px] text-xs text-[#70757a]">{day.mon}</span>
                            <span className="block text-xs text-[#70757a]">{day.dow}</span>
                            <strong
                              className={
                                "mt-0.5 inline-grid h-7 w-7 place-items-center rounded-full text-[13px] " +
                                (day.today ? "bg-[#1a73e8] text-white" : "")
                              }
                            >
                              {day.num}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    {modelAvail.map((row) => (
                      <div
                        key={row.model}
                        className="grid border-b border-[#dadce0] bg-white last:border-b-0"
                        style={{ gridTemplateColumns: "200px minmax(0, 1fr)" }}
                      >
                        <div className="flex flex-col justify-center border-r border-[#dadce0] px-2.5 py-1.5 text-sm leading-tight">
                          <strong>{row.model}</strong>
                          <span className="text-xs text-[#595959]">{plural(row.total, "vehicle")}</span>
                        </div>
                        <div className="grid gap-0.5 p-1" style={{ gridTemplateColumns: "repeat(" + WIN + ", minmax(0, 1fr))" }}>
                          {row.counts.map((free, index) => {
                            const bg = free === row.total ? "#e6f4ea" : free > 0 ? "#feefc3" : "#dadce0";
                            const fg = free === row.total ? "#0d5a2a" : free > 0 ? "#5f4400" : "#3c4043";
                            return (
                              <div
                                key={index}
                                title={short(isoOf(availDays[index].n)) + ": " + free + " of " + row.total + " free"}
                                className={
                                  "grid h-8 place-items-center rounded text-[13px] font-bold" +
                                  (availDays[index].today ? " ring-2 ring-[#1a73e8]" : "")
                                }
                                style={{ background: bg, color: fg }}
                              >
                                {free}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {quotes.length > 0 && (
                <div className="mt-4 rounded-[10px] bg-[#f5f5f3] px-3.5 py-3">
                  <strong className="text-sm">Quotes not on the calendar ({quotes.length})</strong>
                  <p className="text-[13px] text-[#595959]">
                    These requests do not hold a vehicle until you set the delivery charge and hold it.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quotes.map((booking) => (
                      <button key={booking.id} type="button" onClick={() => pick(booking.id)} className={btnLight}>
                        {booking.reference} · {booking.customerName} · {booking.model} · {short(booking.pickup)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Booking detail */}
        {selected && (
          <section id="booking-detail" className={card + " mt-[22px] scroll-mt-28 p-[22px]"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-bold uppercase tracking-[2px] text-[#595959]">Booking {selected.reference}</div>
                <h2 className="mt-1.5 text-[28px] font-bold tracking-[-0.02em]">{selected.customerName}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ChipView chip={chipFor(selected, today)} />
                <button type="button" aria-expanded={detailOpen} onClick={() => setDetailOpen((v) => !v)} className={btnLight + " rounded-full"}>
                  {detailOpen ? "Hide details ▲" : "Show details ▼"}
                </button>
                <button type="button" onClick={() => setSelectedId("")} className={btnLight + " rounded-full"}>
                  Close
                </button>
              </div>
            </div>
            {!detailOpen && (
              <p className="mt-2 text-sm text-[#595959]">
                {selected.model} · {short(selected.pickup)} to {short(selected.returnOn)} · {ksh(selected.total)}
              </p>
            )}
            {detailOpen && (
              <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(330px,100%),1fr))]">
                <DetailBox title="Customer">
                  <Row label="Name">
                    <strong>{selected.customerName}</strong>
                  </Row>
                  <Row label="Phone">
                    <a href={"tel:" + selected.phone.replace(/\s/g, "")} className="underline">
                      {selected.phone}
                    </a>
                  </Row>
                  <Row label="Email">
                    {selected.email ? (
                      <a href={"mailto:" + selected.email} className="break-all underline">
                        {selected.email}
                      </a>
                    ) : (
                      <span className="text-[#595959]">Not given</span>
                    )}
                  </Row>
                  <Row label="Booked">{formatDay(selected.createdAt.slice(0, 10))}</Row>
                </DetailBox>

                <DetailBox title="Hire">
                  <Row label="Vehicle">
                    <strong>{selected.plate ? selected.plate + " " + selected.model : selected.model + " (not assigned yet)"}</strong>
                  </Row>
                  <Row label="Pick-up">
                    {short(selected.pickup)}, {selected.pickTime}
                    <br />
                    <span className="text-[#595959]">{selected.location}</span>
                  </Row>
                  <Row label="Return">
                    {short(selected.returnOn)}, {selected.retTime}
                  </Row>
                  <Row label="Length">{plural(selected.days, "day")}</Row>
                  <Row label="Delivery">
                    {selected.deliverySummary}
                    {selected.deliveryDetail && <span className="block whitespace-pre-line text-[#595959]">{selected.deliveryDetail}</span>}
                  </Row>
                  {selected.ooh && <Row label="Out of hours">{selected.oohNote || "No note"}</Row>}
                </DetailBox>

                <DetailBox title="Payment">
                  <Row label="Hire">{ksh(selected.hireTotal)}</Row>
                  {selected.insuranceTotal > 0 && <Row label="Damage cover">{ksh(selected.insuranceTotal)}</Row>}
                  <Row label="Delivery">
                    {selected.deliveryManual || selected.deliveryFee === null
                      ? "To be set"
                      : selected.deliveryFee
                        ? ksh(selected.deliveryFee)
                        : "None"}
                  </Row>
                  <Row label={selected.status === "confirmed" ? "Paid in full" : "Due in full"}>
                    <strong>
                      {ksh(selected.total)}
                      {selected.deliveryManual ? " plus delivery" : ""}
                    </strong>
                  </Row>
                  <Row label="M-Pesa code">{selected.mpesaCode || "None sent yet"}</Row>
                  {selected.staffNote && <Row label="Note">{selected.staffNote}</Row>}

                  {(selected.status === "pending" || selected.status === "confirmed" || selected.status === "quote") && (
                    <div className="mt-3 space-y-2.5">
                      <label className="block text-sm">
                        <span className="mb-1 block text-[13px] text-[#595959]">Note for the file (optional)</span>
                        <input
                          value={notes[selected.id] || ""}
                          onChange={(e) => setNotes((cur) => ({ ...cur, [selected.id]: e.target.value }))}
                          className={input}
                        />
                      </label>
                      {selected.status === "quote" && needsDeliveryPrice(selected) && (
                        <label className="block text-sm">
                          <span className="mb-1 block text-[13px] text-[#595959]">Delivery charge (KSh). Use 0 if there is none.</span>
                          <input
                            inputMode="numeric"
                            value={fees[selected.id] || ""}
                            onChange={(e) => setFees((cur) => ({ ...cur, [selected.id]: e.target.value }))}
                            className={input}
                          />
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {selected.status === "pending" && (
                          <button
                            type="button"
                            className={btnGreen}
                            onClick={() => act(selected, "confirm", "Confirm that the full payment for " + selected.reference + " has arrived?")}
                          >
                            Confirm payment received
                          </button>
                        )}
                        {selected.status === "pending" && (
                          <button
                            type="button"
                            className={btnLight}
                            onClick={() => act(selected, "release", "Release the hold on " + (selected.plate || selected.model) + "?")}
                          >
                            Release hold
                          </button>
                        )}
                        {selected.status === "confirmed" && (
                          <button
                            type="button"
                            className={btnLight}
                            onClick={() => act(selected, "cancel", "Cancel " + selected.reference + " and free the vehicle?")}
                          >
                            Cancel booking
                          </button>
                        )}
                        {selected.status === "quote" && (
                          <button
                            type="button"
                            className={btnDark}
                            onClick={() =>
                              act(
                                selected,
                                "hold",
                                "Hold a " + selected.model + " for " + selected.reference + "? It stays unpaid until you confirm the full amount.",
                              )
                            }
                          >
                            Hold the vehicle
                          </button>
                        )}
                        {selected.status === "quote" && (
                          <button
                            type="button"
                            className={btnGreen}
                            onClick={() =>
                              act(
                                selected,
                                "settle",
                                "Confirm that the full payment for " + selected.reference + " has arrived, and hold a " + selected.model + "?",
                              )
                            }
                          >
                            Confirm payment received
                          </button>
                        )}
                        {selected.status === "quote" && (
                          <button
                            type="button"
                            className={btnLight}
                            onClick={() => act(selected, "dismiss", "Reject " + selected.reference + "? The vehicle will not be held.")}
                          >
                            Reject request
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </DetailBox>

                {selected.status !== "quote" && selected.status !== "cancelled" && (
                  <DetailBox title="Turnaround around this hire">
                    <div className="grid gap-2.5">
                      {[
                        before > 0
                          ? {
                              name: "Prep before hire",
                              when: bufferWhen(num(selected.pickup) - before, before),
                              color: BUFFER,
                            }
                          : null,
                        { name: "Pick-up", when: short(selected.pickup) + ", " + selected.pickTime, color: "#1a73e8" },
                        { name: "Return", when: short(selected.returnOn) + ", " + selected.retTime, color: "#188038" },
                        after > 0
                          ? {
                              name: "Clean and service after hire",
                              when: bufferWhen(num(lastHireDay(selected.pickup, selected.returnOn)) + 1, after),
                              color: BUFFER,
                            }
                          : null,
                      ]
                        .filter((step): step is { name: string; when: string; color: string } => Boolean(step))
                        .map((step) => (
                          <div key={step.name} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-1.5 inline-block h-2.5 w-2.5 flex-none rounded-full" style={{ background: step.color }} />
                            <span>
                              <strong>{step.name}</strong>
                              <br />
                              <span className="text-[#595959]">{step.when}</span>
                            </span>
                          </div>
                        ))}
                    </div>
                  </DetailBox>
                )}
              </div>
            )}
          </section>
        )}

        {/* Bookings and payment status */}
        <section className={card + " mt-[22px] p-[22px]"}>
          <div className="mb-3.5 flex flex-wrap items-end justify-between gap-x-7 gap-y-3">
            <div>
              {sectionHead("table", "Bookings and payment status")}
              <p className="mt-1 text-sm text-[#595959]">
                Every booking is paid in full. A held booking waits for the payment until you confirm it or release the hold.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TABLE_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={tableFilter === item.id}
                  onClick={() => setTableFilter(item.id)}
                  className={pill + (tableFilter === item.id ? " bg-[#171717] text-white" : " bg-white text-[#171717]")}
                >
                  {item.label} ({tableCounts[item.id]})
                </button>
              ))}
            </div>
          </div>
          {open.table && (
            <>
              <div className="mb-3.5">
                <input
                  type="text"
                  aria-label="Search customer, vehicle or status"
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  placeholder="Search customer, vehicle or status"
                  className={search}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#dadce0] text-[13px] text-[#595959]">
                      <th className="px-2 py-2 font-semibold">Vehicle</th>
                      <th className="px-2 py-2 font-semibold">Customer</th>
                      <th className="px-2 py-2 font-semibold">Collection</th>
                      <th className="px-2 py-2 font-semibold">Total due</th>
                      <th className="px-2 py-2 font-semibold">M-Pesa code</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                      <th className="px-2 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((booking) => (
                      <tr key={booking.id} className="border-b border-[#eef0f2] align-top">
                        <td className="px-2 py-2.5">
                          <strong>{booking.plate ? booking.plate + " " : ""}{booking.model}</strong>
                          <span className="block text-xs text-[#595959]">{booking.reference}</span>
                        </td>
                        <td className="px-2 py-2.5">
                          {booking.customerName}
                          <span className="block text-xs text-[#595959]">{booking.phone}</span>
                        </td>
                        <td className="px-2 py-2.5">
                          {short(booking.pickup)}, {booking.pickTime}
                          <span className="block text-xs text-[#595959]">{booking.location}</span>
                        </td>
                        <td className="px-2 py-2.5 font-bold">
                          {ksh(booking.total)}
                          {booking.deliveryManual ? " + delivery" : ""}
                        </td>
                        <td className="px-2 py-2.5">{booking.mpesaCode || <span className="text-[#595959]">—</span>}</td>
                        <td className="px-2 py-2.5">
                          <ChipView chip={chipFor(booking, today)} />
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            <button type="button" className={btnLight + " min-h-[34px] px-3"} onClick={() => pick(booking.id)}>
                              Details
                            </button>
                            {booking.status === "pending" && (
                              <button
                                type="button"
                                className={btnGreen + " min-h-[34px] px-3"}
                                onClick={() => act(booking, "confirm", "Confirm that the full payment for " + booking.reference + " has arrived?")}
                              >
                                Confirm paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tableRows.length === 0 && (
                <p className="mt-3 text-sm text-[#595959]">{tableQuery.trim() ? "Nothing matches your search." : "Nothing in this list."}</p>
              )}
            </>
          )}
        </section>

        {/* Payment codes */}
        <section className={card + " mt-[22px] p-[22px]"}>
          <div className="mb-3.5 flex flex-wrap items-end justify-between gap-x-7 gap-y-3">
            <div>
              {sectionHead("payments", "Payments")}
              <p className="mt-1 max-w-[760px] text-sm text-[#595959]">
                M-Pesa codes sent by customers. A code shows as To check until you find the payment on the statement and
                confirm the booking. Nothing is charged on the website.
              </p>
            </div>
            <button type="button" onClick={downloadCsv} className={btnLight}>
              Download CSV
            </button>
          </div>
          {open.payments && (
            <>
              <div className="mb-4 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                <MiniTile
                  label="Codes to check"
                  value={String(codesToCheck.length)}
                  note={ksh(codesToCheck.reduce((sum, b) => sum + b.total, 0)) + " if they all match"}
                />
                <MiniTile label="Paid in full, current and upcoming" value={ksh(paidTotal)} note={plural(paidCurrent.length, "booking")} />
                <MiniTile label="Still to collect" value={ksh(awaitingTotal)} note={plural(awaiting.length, "booking") + " held"} />
              </div>
              <div className="mb-3.5">
                <label htmlFor="paySearch" className="mb-1.5 block text-[13px] text-[#595959]">
                  Search by name, phone, M-Pesa code or booking
                </label>
                <input
                  id="paySearch"
                  type="text"
                  value={payQuery}
                  onChange={(e) => setPayQuery(e.target.value)}
                  placeholder="For example QJK3X7AB12 or +254 700"
                  className={search + " max-w-[420px]"}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#dadce0] text-[13px] text-[#595959]">
                      <th className="px-2 py-2 font-semibold">Customer</th>
                      <th className="px-2 py-2 font-semibold">Booking</th>
                      <th className="px-2 py-2 font-semibold">M-Pesa code</th>
                      <th className="px-2 py-2 font-semibold">Amount due</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                      <th className="px-2 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payRows.map((booking) => (
                      <tr key={booking.id} className="border-b border-[#eef0f2] align-top">
                        <td className="px-2 py-2.5">
                          <strong>{booking.customerName}</strong>
                          <span className="block text-xs text-[#595959]">{booking.phone}</span>
                        </td>
                        <td className="px-2 py-2.5">
                          <strong>{booking.reference}</strong>
                          <span className="block text-xs text-[#595959]">
                            {booking.model} · {short(booking.pickup)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 font-bold">{booking.mpesaCode}</td>
                        <td className="px-2 py-2.5 font-bold">{ksh(booking.total)}</td>
                        <td className="px-2 py-2.5">
                          <ChipView
                            chip={
                              booking.status === "confirmed"
                                ? { ...CHIP_PAID, label: "Confirmed" }
                                : { ...CHIP_CODE, label: "To check" }
                            }
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            <button type="button" className={btnLight + " min-h-[34px] px-3"} onClick={() => pick(booking.id)}>
                              Open
                            </button>
                            {booking.status === "pending" && (
                              <button
                                type="button"
                                className={btnGreen + " min-h-[34px] px-3"}
                                onClick={() =>
                                  act(
                                    booking,
                                    "confirm",
                                    "Confirm that M-Pesa code " + booking.mpesaCode + " for " + ksh(booking.total) + " is on the statement?",
                                  )
                                }
                              >
                                Confirm payment
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {payRows.length === 0 && (
                <p className="mt-3 text-sm text-[#595959]">
                  {payQuery.trim() ? "No payments match your search." : "No M-Pesa codes have been sent yet."}
                </p>
              )}
            </>
          )}
        </section>


        {/* Vehicle records */}
        <section className={card + " mt-[22px] p-[22px]"}>
          {sectionHead("vehicles", "Vehicle records")}
          <p className="mb-3.5 mt-1 max-w-[760px] text-sm text-[#595959]">
            Make, plate, year, odometer and rates for each vehicle, with what it is doing now. Read-only for now: the year
            and odometer come from the fleet list, and editing a record will be added once James sets up somewhere to save
            it.
          </p>
          {open.vehicles && (
            <>
              <div className="mb-3.5">
                <input
                  type="text"
                  aria-label="Search make, model, plate or year"
                  value={vehQuery}
                  onChange={(e) => setVehQuery(e.target.value)}
                  placeholder="Search make, model, plate or year"
                  className={search}
                />
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={vehType === item.id}
                    onClick={() => setVehType(item.id)}
                    className={pill + (vehType === item.id ? " bg-[#171717] text-white" : " bg-white text-[#171717]")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mb-3.5">
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    for (const c of vehCards) next[c.vehicle.id] = !allVehOpen;
                    setVehOpen((cur) => ({ ...cur, ...next }));
                  }}
                  className={pill + " bg-white text-[#171717]"}
                >
                  {allVehOpen ? "Close all records" : "Open all records"}
                </button>
              </div>
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">
                {vehCards.map(({ vehicle, now, next }) => {
                  const isOpen = Boolean(vehOpen[vehicle.id]);
                  const status: Chip = now
                    ? { label: "On hire now", bg: "#e8f0fe", fg: "#174ea6", bd: "#aecbfa" }
                    : { label: "Free today", bg: "#ceead6", fg: "#0d5a2a", bd: "#81c995" };
                  const [make, ...rest] = vehicle.model.split(" ");
                  return (
                    <div key={vehicle.id} className="self-start overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-white">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setVehOpen((cur) => ({ ...cur, [vehicle.id]: !cur[vehicle.id] }))}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 bg-white px-3.5 py-3 text-left hover:bg-[#fafafa]"
                      >
                        <span className="min-w-0">
                          <strong className="block">{vehicle.model}</strong>
                          <span className="text-[13px] text-[#595959]">Number plate {vehicle.plate}</span>
                        </span>
                        <span className="flex flex-none items-center gap-2">
                          <ChipView chip={status} />
                          <span aria-hidden="true" className="text-[#595959]">
                            {isOpen ? "▲" : "▼"}
                          </span>
                        </span>
                      </button>
                      {isOpen && (
                        <div className="grid gap-1.5 border-t border-[#e5e5e5] bg-[#f5f5f3] px-3.5 py-3">
                          <Row label="Make">{make}</Row>
                          <Row label="Model">{rest.join(" ")}</Row>
                          <Row label="Number plate">
                            <strong>{vehicle.plate}</strong>
                          </Row>
                          <Row label="Type">
                            {vehicle.category === "saloon" ? "Saloon" : vehicle.category === "suv" ? "SUV" : "4x4"}
                            {vehicle.seats ? " · " + vehicle.seats + " seats" : ""}
                          </Row>
                          <Row label="Fuel">{vehicle.fuel || "Not entered"}</Row>
                          <Row label="Year">
                            {vehicle.year ? vehicle.year + " (" + plural(thisYear - vehicle.year, "year") + " old)" : "Not entered"}
                          </Row>
                          <Row label="Odometer">{vehicle.km ? vehicle.km.toLocaleString("en-US") + " km" : "Not entered"}</Row>
                          <Row label="Daily rate">{vehicle.rate ? ksh(vehicle.rate) : "—"}</Row>
                          <Row label="Damage cover">{vehicle.addon ? ksh(vehicle.addon) + " a day" : "—"}</Row>
                          <Row label="Now">
                            {now ? (
                              <button type="button" className="text-left underline" onClick={() => pick(now.id)}>
                                {now.customerName}, back {short(now.returnOn)}
                              </button>
                            ) : (
                              "Not on hire"
                            )}
                          </Row>
                          <Row label="Next hire">
                            {next ? (
                              <button type="button" className="text-left underline" onClick={() => pick(next.id)}>
                                {short(next.pickup)}, {next.customerName}
                              </button>
                            ) : (
                              "Nothing booked"
                            )}
                          </Row>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {vehCards.length === 0 && (
                <p className="mt-3 text-sm text-[#595959]">{vehQuery.trim() ? "Nothing matches your search." : "No vehicles listed."}</p>
              )}
            </>
          )}
        </section>

        <section className="mt-[22px] grid gap-[22px] [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
          {/* Paid vs awaiting */}
          <div className={card + " p-[22px]"}>
            {sectionHead("compare", "Awaiting payment vs paid in full")}
            <p className="mb-3.5 mt-1 text-sm text-[#595959]">Current and upcoming hires, by whether the full amount has arrived.</p>
            {open.compare && (
              <>
                <div className="h-3.5 overflow-hidden rounded-full bg-[#feefc3]">
                  <div className="h-full bg-[#81c995]" style={{ width: collectedPct + "%" }} />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-[13px]">
                  <span>
                    Paid {ksh(paidTotal)} ({collectedPct}%)
                  </span>
                  <span>Still to collect {ksh(awaitingTotal)}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[10px] border-l-4 border-[#f9d46b] bg-[#f5f5f3] px-3.5 py-3">
                    <div className="text-[13px] font-bold">Awaiting payment</div>
                    <div className="text-[22px] font-bold">{plural(awaiting.length, "booking")}</div>
                    <div className="text-[13px] text-[#3f3f3f]">
                      Due in full <strong>{ksh(awaitingTotal)}</strong>
                      <br />
                      {chase.length ? plural(chase.length, "booking") + " already at pick-up" : "None at pick-up yet"}
                    </div>
                  </div>
                  <div className="rounded-[10px] border-l-4 border-[#81c995] bg-[#f5f5f3] px-3.5 py-3">
                    <div className="text-[13px] font-bold">Paid in full</div>
                    <div className="text-[22px] font-bold">{plural(paidCurrent.length, "booking")}</div>
                    <div className="text-[13px] text-[#3f3f3f]">
                      Collected <strong>{ksh(paidTotal)}</strong>
                      <br />
                      Nothing due
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Cleaning schedule */}
          <div className={card + " p-[22px]"}>
            {sectionHead("schedule", "Cleaning and workshop schedule")}
            <p className="mb-3.5 mt-1 text-sm text-[#595959]">
              Next two weeks, in date order. Change the turnaround days on the calendar to see how it shifts.
            </p>
            {open.schedule && (
              <>
                <div className="mb-3">
                  <input
                    type="text"
                    aria-label="Search vehicle or task"
                    value={scheduleQuery}
                    onChange={(e) => setScheduleQuery(e.target.value)}
                    placeholder="Search vehicle or task"
                    className={search}
                  />
                </div>
                <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                  {schedule.map((item, index) => (
                    <div key={index} className="flex items-start gap-2.5 rounded-lg bg-[#f5f5f3] px-3 py-2.5 text-sm">
                      <span className="mt-1.5 inline-block h-2.5 w-2.5 flex-none rounded-full" style={{ background: BUFFER }} />
                      <span>
                        <strong>{item.name}</strong> · {item.kind}
                        <br />
                        <span className="text-[13px] text-[#595959]">
                          {bufferWhen(item.s, item.len)} · {item.detail}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                {schedule.length === 0 && (
                  <p className="text-sm text-[#595959]">
                    {scheduleQuery.trim() ? "Nothing matches your search." : "No prep or cleaning due in the next two weeks."}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      {hover && <HoverCard hover={hover} booking={bookings.find((b) => b.id === hover.id) || null} fleetById={fleetById} today={today} />}
    </div>
  );
}

function HoverCard({
  hover,
  booking,
  fleetById,
  today,
}: {
  hover: { left: number; top: number; bottom: number };
  booking: StaffBooking | null;
  fleetById: Record<string, DeskVehicle>;
  today: string;
}) {
  if (!booking) return null;
  const vehicle = booking.vehicleId ? fleetById[booking.vehicleId] : null;
  const width = 300;
  const left = Math.max(8, Math.min(hover.left, window.innerWidth - width - 8));
  const below = hover.bottom + 190 < window.innerHeight;
  const collect = booking.deliverySummary && !booking.deliverySummary.startsWith("Collect at");
  return (
    <div
      id="cal-hover"
      role="tooltip"
      className="pointer-events-none fixed z-[60] rounded-[10px] border border-[#dadce0] bg-white px-3.5 py-3 text-[13px] leading-[1.55] text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      style={{ left, width, ...(below ? { top: hover.bottom + 6 } : { bottom: window.innerHeight - hover.top + 6 }) }}
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="text-sm">{booking.customerName}</strong>
        <ChipView chip={chipFor(booking, today)} />
      </div>
      <div className="text-[#595959]">
        {vehicle ? vehicle.plate + " " + vehicle.model : booking.model} · {booking.reference}
      </div>
      <div className="mt-1.5">
        <strong>Collection:</strong> {short(booking.pickup)}, {booking.pickTime}
      </div>
      <div>
        <strong>Drop-off:</strong> {short(booking.returnOn)}, {booking.retTime}
      </div>
      <div>
        <strong>Location:</strong> {booking.location}
      </div>
      {collect && <div className="text-[#595959]">{booking.deliverySummary}</div>}
      <div className="mt-1">
        <strong>{booking.status === "confirmed" ? "Paid in full" : "Due in full"}:</strong> {ksh(booking.total)}
        {booking.deliveryManual ? " plus delivery" : ""}
      </div>
    </div>
  );
}

function DeskHeader({ today, children }: { today: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-7 gap-y-3 bg-[#f5f5f3] px-[5.5%] py-3.5">
      <div className="flex items-center gap-3.5">
        <div className="flex flex-col leading-tight">
          <strong className="text-xl font-semibold tracking-[-0.01em]">Chequered Flag</strong>
          <span className="mt-[3px] text-xs tracking-[3px] text-[#595959]">FLEET DASHBOARD · STAFF VIEW</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
        <span className="font-semibold">Today, {short(today)}</span>
        {children}
      </div>
    </header>
  );
}

function Stepper({ label, value, onLess, onMore }: { label: string; value: number; onLess: () => void; onMore: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{label}</span>
      <button
        type="button"
        aria-label={"Quarter day less: " + label}
        onClick={onLess}
        className="h-9 w-9 cursor-pointer rounded-full border border-[#dadce0] bg-white text-lg"
      >
        −
      </button>
      <strong className="min-w-[96px] text-center">{spanText(value)}</strong>
      <button
        type="button"
        aria-label={"Quarter day more: " + label}
        onClick={onMore}
        className="h-9 w-9 cursor-pointer rounded-full border border-[#dadce0] bg-white text-lg"
      >
        +
      </button>
    </div>
  );
}

function Legend({ bg, h, label }: { bg: string; h: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block w-[22px] rounded" style={{ height: h, background: bg }} />
      {label}
    </span>
  );
}

function MiniTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[10px] bg-[#f5f5f3] px-4 py-3">
      <div className="text-[13px] text-[#595959]">{label}</div>
      <div className="mt-0.5 text-[22px] font-bold tracking-[-0.02em]">{value}</div>
      <div className="text-[13px] text-[#3f3f3f]">{note}</div>
    </div>
  );
}

function DetailBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[10px] bg-[#f5f5f3] px-4 py-3.5">
      <div className="mb-2 text-[13px] font-bold uppercase tracking-[1.5px] text-[#595959]">{title}</div>
      <div className="grid gap-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-sm">
      <span className="text-[#595959]">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
