"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDay, ksh, type StaffBooking } from "../lib/hire";

const FILTERS = [
  { id: "pending", label: "Awaiting payment" },
  { id: "quote", label: "Quotes" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Closed" },
] as const;

export default function HireDesk() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [signedIn, setSignedIn] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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

  async function loadBookings() {
    const response = await fetch("/api/hire/staff/bookings");
    const body = await response.json();
    if (response.status === 401) {
      setSignedIn("");
      return;
    }
    if (!response.ok) {
      setMessage(body.error || "Bookings could not be loaded.");
      return;
    }
    setBookings(body.bookings || []);
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (signedIn) loadBookings();
  }, [signedIn]);

  const counts = useMemo(() => {
    const tally = { pending: 0, quote: 0, confirmed: 0, cancelled: 0 };
    for (const booking of bookings) tally[booking.status] += 1;
    return tally;
  }, [bookings]);
  const shown = bookings.filter((booking) => booking.status === filter);

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
  }

  async function act(booking: StaffBooking, action: string, prompt: string) {
    if (!window.confirm(prompt)) return;
    setMessage("");
    const response = await fetch("/api/hire/staff/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, action, note: notes[booking.id] || "" }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "The booking could not be updated.");
      return;
    }
    await loadBookings();
  }

  if (loading) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-neutral-600">Checking sign-in…</p>;
  }

  if (!signedIn) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Hire desk</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700">
          Staff sign-in for vehicle bookings. A request holds the vehicle until you confirm that the full payment has arrived, or you release it.
        </p>
        {ready === false && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {authError || "Add HIRE_STAFF_USERNAME and HIRE_STAFF_PASSWORD in Vercel, then redeploy, before signing in."}
          </p>
        )}
        <form onSubmit={signIn} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="h-11 w-full rounded-md border border-neutral-300 px-3" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="h-11 w-full rounded-md border border-neutral-300 px-3" />
          </label>
          {authError && ready !== false && (
            <p className="text-sm text-red-700" role="alert">
              {authError}
            </p>
          )}
          <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white">
            Sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Hire desk</h1>
          <p className="mt-2 text-sm text-neutral-600">Signed in as {signedIn}. Confirm a booking only after the full amount is on the statement.</p>
        </div>
        <button type="button" onClick={signOut} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
          Sign out
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={
              "rounded-full px-3 py-1.5 text-sm " +
              (filter === item.id ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-800")
            }
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>
      {message && <p className="mt-4 text-sm text-red-700">{message}</p>}

      <div className="mt-6 space-y-4">
        {shown.length === 0 && <p className="rounded-xl border border-neutral-200 p-5 text-sm text-neutral-600">Nothing in this list.</p>}
        {shown.map((booking) => (
          <article key={booking.id} className="rounded-xl border border-neutral-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {booking.reference} · {booking.model}
                  {booking.plate ? " · " + booking.plate : ""}
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  {booking.customerName} · {booking.phone} · {booking.email}
                </p>
              </div>
              <p className="text-lg font-semibold">{booking.deliveryManual ? ksh(booking.total) + " plus delivery" : ksh(booking.total) + " in full"}</p>
            </div>
            <p className="mt-3 text-sm text-neutral-800">
              {formatDay(booking.pickup)}, {booking.pickTime} to {formatDay(booking.returnOn)}, {booking.retTime} · {booking.days} day
              {booking.days === 1 ? "" : "s"} · {booking.location}
            </p>
            <p className="mt-1 text-sm text-neutral-700">{booking.deliverySummary}</p>
            {booking.deliveryDetail && <p className="mt-1 whitespace-pre-line text-sm text-neutral-600">{booking.deliveryDetail}</p>}
            {booking.ooh && <p className="mt-1 text-sm text-amber-900">Out of hours: {booking.oohNote || "No note"}</p>}
            <p className="mt-2 text-sm text-neutral-600">
              Hire {ksh(booking.hireTotal)}
              {booking.insuranceTotal ? " · cover " + ksh(booking.insuranceTotal) : ""}
              {booking.deliveryFee ? " · delivery " + ksh(booking.deliveryFee) : ""}
              {booking.mpesaCode ? " · M-Pesa " + booking.mpesaCode : " · no M-Pesa code yet"}
            </p>
            {booking.staffNote && <p className="mt-1 text-sm text-neutral-600">Note: {booking.staffNote}</p>}
            {(booking.status === "pending" || booking.status === "confirmed" || booking.status === "quote") && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1 text-sm">
                  <span className="mb-1 block text-neutral-500">Note for the file (optional)</span>
                  <input
                    value={notes[booking.id] || ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [booking.id]: event.target.value }))}
                    className="h-10 w-full rounded-md border border-neutral-300 px-3"
                  />
                </label>
                {booking.status === "pending" && (
                  <button
                    type="button"
                    className="h-10 rounded-md bg-green-700 px-3 text-sm font-medium text-white"
                    onClick={() => act(booking, "confirm", "Confirm that the full payment for " + booking.reference + " has arrived?")}
                  >
                    Confirm payment received
                  </button>
                )}
                {booking.status === "pending" && (
                  <button
                    type="button"
                    className="h-10 rounded-md border border-neutral-300 px-3 text-sm"
                    onClick={() => act(booking, "release", "Release the hold on " + (booking.plate || booking.model) + "?")}
                  >
                    Release hold
                  </button>
                )}
                {booking.status === "confirmed" && (
                  <button
                    type="button"
                    className="h-10 rounded-md border border-neutral-300 px-3 text-sm"
                    onClick={() => act(booking, "cancel", "Cancel " + booking.reference + " and free the vehicle?")}
                  >
                    Cancel booking
                  </button>
                )}
                {booking.status === "quote" && (
                  <button
                    type="button"
                    className="h-10 rounded-md border border-neutral-300 px-3 text-sm"
                    onClick={() => act(booking, "dismiss", "Close quote request " + booking.reference + "?")}
                  >
                    Close request
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
