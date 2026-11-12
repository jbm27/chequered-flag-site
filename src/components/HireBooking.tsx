"use client";

import { useEffect, useMemo, useState } from "react";
import { CONTACT } from "../lib/contact";
import {
  addDays,
  assessBooking,
  assessmentError,
  dayNumber,
  formatDay,
  formatDayShort,
  HOURS,
  ksh,
  outOfHours,
  PICKUP_LOCATIONS,
  quoteDelivery,
  todayNairobi,
  type AvailabilityResponse,
  type PublicBookingResult,
  type PublicModelCard,
} from "../lib/hire";

const STORED = "cfHireRequest";

function weekday(iso: string) {
  const n = dayNumber(iso);
  return n === null ? 0 : new Date(n * 86400000).getUTCDay();
}

function defaultWindow() {
  const today = todayNairobi();
  let pickup = addDays(today, 1);
  if (weekday(pickup) === 0) pickup = addDays(pickup, 1);
  const returnOn = weekday(addDays(pickup, 2)) === 0 ? addDays(pickup, 1) : addDays(pickup, 2);
  return { pickup, returnOn };
}

const fieldClass = "h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900";

function plural(days: number) {
  return days + " day" + (days === 1 ? "" : "s");
}

function readStored(): PublicBookingResult | null {
  try {
    const raw = sessionStorage.getItem(STORED);
    return raw ? (JSON.parse(raw) as PublicBookingResult) : null;
  } catch {
    return null;
  }
}

export default function HireBooking() {
  const today = todayNairobi();
  const initialDates = useState(defaultWindow)[0];
  const [location, setLocation] = useState<(typeof PICKUP_LOCATIONS)[number]>(PICKUP_LOCATIONS[0]);
  const [pickup, setPickup] = useState(initialDates.pickup);
  const [returnOn, setReturnOn] = useState(initialDates.returnOn);
  const [pickTime, setPickTime] = useState("09:00");
  const [retTime, setRetTime] = useState("09:00");
  const [type, setType] = useState("all");
  const [delivery, setDelivery] = useState<"none" | "deliver" | "both">("none");
  const [address, setAddress] = useState("");
  const [oohNote, setOohNote] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [insure, setInsure] = useState(false);
  const [mpesaCode, setMpesaCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [calFrom, setCalFrom] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PublicBookingResult | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [laterCode, setLaterCode] = useState("");
  const [codeMessage, setCodeMessage] = useState("");

  useEffect(() => {
    setResult(readStored());
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => {
      document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [selectedId]);

  useEffect(() => {
    const params = new URLSearchParams({ pickup, return: returnOn });
    if (calFrom) params.set("from", calFrom);
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/hire/availability?" + params.toString(), { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Availability could not be loaded.");
        setAvailability(body);
        setLoadError("");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setAvailability(null);
        setLoadError(error.message || "Availability could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [pickup, returnOn, calFrom, refreshToken]);

  const hours = outOfHours(pickup, returnOn, pickTime, retTime);
  const deliveryQuote = quoteDelivery({
    delivery,
    place: null,
    address,
    location,
    ooh: hours,
    directions: "",
    note: "",
  });
  const models = useMemo(() => {
    const list = availability?.models || [];
    return type === "all" ? list : list.filter((model) => model.group === type);
  }, [availability, type]);
  const selected = models.find((model) => model.id === selectedId) || null;
  const hireTotal = selected && availability ? availability.days * selected.rate : 0;
  const insuranceTotal = selected && insure ? availability!.days * selected.addon : 0;
  const pricedDelivery = deliveryQuote.manual ? 0 : deliveryQuote.fee || 0;
  const total = hireTotal + insuranceTotal + pricedDelivery;

  function remember(booking: PublicBookingResult) {
    setResult(booking);
    try {
      sessionStorage.setItem(STORED, JSON.stringify(booking));
    } catch {
      /* the confirmation still stays on the page */
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setFormError("");
    const checked = assessBooking(
      { id: selected.id, name: selected.name, rate: selected.rate, addon: selected.addon },
      {
        modelId: selected.id,
        pickup,
        returnOn,
        pickTime,
        retTime,
        location,
        delivery,
        placeId: "",
        address,
        directions: "",
        note: "",
        insure,
        name,
        email,
        phone,
        oohNote,
        mpesaCode,
        terms,
      },
    );
    const problem = assessmentError(checked);
    if (problem || !checked.ok) {
      setFormError(problem || "Check the booking details.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/hire/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selected.id,
          pickup,
          returnOn,
          pickTime,
          retTime,
          location,
          delivery,
          placeId: "",
          address,
          directions: "",
          note: "",
          insure,
          name,
          email,
          phone,
          oohNote,
          mpesaCode,
          terms,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The booking could not be saved.");
      remember(body);
      setSelectedId("");
      setTerms(false);
      setMpesaCode("");
      setRefreshToken((value) => value + 1);
      document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The booking could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!result) return;
    setCodeMessage("");
    const response = await fetch("/api/hire/bookings/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: result.reference, email: result.email, mpesaCode: laterCode }),
    });
    const body = await response.json();
    if (!response.ok) {
      setCodeMessage(body.error || "The code could not be saved.");
      return;
    }
    setCodeMessage("Payment code saved. We will check it against the statement.");
    setLaterCode("");
  }

  function pickDay(day: string) {
    const sameDay = returnOn === pickup;
    const span = sameDay ? 0 : Math.max(1, availability?.days || 1);
    setPickup(day);
    setReturnOn(sameDay ? day : addDays(day, span));
  }

  const wa = "https://wa.me/" + CONTACT.whatsappE164.replace(/\D/g, "");

  return (
    <section id="book" className="scroll-mt-24 border-b border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Find your vehicle</h2>
        <p className="mt-3 max-w-3xl text-neutral-700">
          Choose your dates and we will show what is free. The full hire amount is due when you book. We confirm the
          booking after we have checked the payment. Nothing is taken on this page.
        </p>

        {result && (
          <div className="mt-8 rounded-xl border border-neutral-300 bg-white p-6">
            <h3 className="text-xl font-semibold">{result.manual ? "Request sent" : "Vehicle held"}</h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-700">{result.message}</p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Reference</dt>
                <dd className="text-lg font-semibold">{result.reference}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">{result.manual ? "Hire so far" : "Amount due in full"}</dt>
                <dd className="text-lg font-semibold">{ksh(result.total)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Vehicle</dt>
                <dd>{result.model}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Dates</dt>
                <dd>
                  {formatDay(result.pickup)}, {result.pickTime} to {formatDay(result.returnOn)}, {result.retTime}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-neutral-600">{result.summary}</p>
            {!result.manual && (
              <form onSubmit={sendCode} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1 text-sm">
                  <span className="mb-1 block text-neutral-600">M-Pesa code, once you have paid</span>
                  <input value={laterCode} onChange={(event) => setLaterCode(event.target.value)} className={fieldClass} />
                </label>
                <button type="submit" className="h-11 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white">
                  Send code
                </button>
              </form>
            )}
            {codeMessage && <p className="mt-3 text-sm text-neutral-700">{codeMessage}</p>}
            <button
              type="button"
              className="mt-4 text-sm text-neutral-600 underline"
              onClick={() => {
                setResult(null);
                sessionStorage.removeItem(STORED);
              }}
            >
              Make another booking
            </button>
          </div>
        )}

        <form className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => event.preventDefault()}>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Pick-up location</span>
            <select value={location} onChange={(event) => setLocation(event.target.value as (typeof PICKUP_LOCATIONS)[number])} className={fieldClass}>
              {PICKUP_LOCATIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Pick-up date</span>
            <input
              type="date"
              min={today}
              value={pickup}
              onChange={(event) => {
                const value = event.target.value;
                setCalFrom(null);
                setPickup(value);
                if (returnOn < value) setReturnOn(value);
              }}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Return date</span>
            <input
              type="date"
              min={pickup || today}
              value={returnOn}
              onChange={(event) => {
                setCalFrom(null);
                setReturnOn(event.target.value);
              }}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Pick-up time</span>
            <select value={pickTime} onChange={(event) => setPickTime(event.target.value)} className={fieldClass}>
              {HOURS.map((hour) => (
                <option key={hour}>{hour}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Return time</span>
            <select value={retTime} onChange={(event) => setRetTime(event.target.value)} className={fieldClass}>
              {HOURS.map((hour) => (
                <option key={hour}>{hour}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Vehicle type</span>
            <select value={type} onChange={(event) => setType(event.target.value)} className={fieldClass}>
              <option value="all">All vehicles</option>
              <option value="4x4">4x4 / SUV</option>
              <option value="saloon">Saloon</option>
            </select>
          </label>
          <label className="block text-sm md:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-neutral-600">Delivery</span>
            <select
              value={delivery}
              onChange={(event) => setDelivery(event.target.value as "none" | "deliver" | "both")}
              className={fieldClass}
            >
              <option value="none">No, I will collect it</option>
              <option value="deliver">Deliver to me</option>
              <option value="both">Deliver and collect</option>
            </select>
            <span className="mt-2 block text-xs leading-relaxed text-neutral-500">
              Open Monday to Friday 08:00–17:00 and Saturday 08:00–13:00. Collection from Karen, JKIA, or Wilson is
              included. Delivery inside Nairobi is free during those hours. Otherwise it is {ksh(1000)} per trip plus{" "}
              {ksh(50)} per km after the first 5 km, and quoted by hand beyond 150 km.
            </span>
          </label>
        </form>

        {hours.any && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">{hours.title}</p>
            <p className="mt-1">Tell us what you need and we will arrange it. Delivery inside Nairobi is charged outside opening hours.</p>
            <label className="mt-3 block">
              <span className="mb-1 block text-neutral-700">Out-of-hours details</span>
              <textarea value={oohNote} onChange={(event) => setOohNote(event.target.value)} rows={2} className="w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
          </div>
        )}

        {delivery !== "none" && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Town or suburb</span>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="For example, Kilimani"
                className={fieldClass}
              />
            </label>
            <p className="mt-3 text-sm text-neutral-700">
              {address.trim().length >= 3
                ? deliveryQuote.message
                : "Enter the town or suburb. We will price the delivery and tell you the full amount before you pay."}
            </p>
          </div>
        )}

        {!loadError && (
          <p className="mt-6 text-sm text-neutral-600">
            {availability ? availability.rangeLabel + " · " + location : "Choose your dates to see availability and the full amount."}
          </p>
        )}
        {loadError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {loadError} You can still call {CONTACT.phoneDisplay} or{" "}
            <a className="underline" href={wa}>
              WhatsApp
            </a>{" "}
            us.
          </p>
        )}
        {loading && <p className="mt-3 text-sm text-neutral-500">Checking the fleet…</p>}

        <div id="vehicles" className="mt-8 grid gap-4 md:grid-cols-2">
          {models.map((model) => (
            <VehicleCard key={model.id} model={model} days={availability?.days || 0} onBook={() => setSelectedId(model.id)} onNext={(day) => pickDay(day)} />
          ))}
          {!loading && !loadError && models.length === 0 && (
            <p className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">No vehicles of this type are listed.</p>
          )}
        </div>

        {availability && models.length > 0 && (
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Availability</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40"
                  disabled={availability.calendar[0] <= availability.today}
                  onClick={() => setCalFrom(addDays(availability.calendar[0], -14))}
                >
                  Earlier
                </button>
                <button
                  type="button"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  onClick={() => setCalFrom(addDays(availability.calendar[0], 14))}
                >
                  Later
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-neutral-600">A green day has at least one vehicle free. Select a day to start the hire then.</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <table className="min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white px-3 py-2 font-medium">Vehicle</th>
                    {availability.calendar.map((day) => (
                      <th key={day} className="px-1 py-2 text-center font-medium text-neutral-500">
                        {formatDayShort(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id} className="border-t border-neutral-100">
                      <th className="sticky left-0 bg-white px-3 py-2 text-left font-medium text-neutral-800">{model.name}</th>
                      {availability.calendar.map((day, index) => {
                        const free = model.dayFree[index] || 0;
                        const inHire = day >= pickup && day < (returnOn > pickup ? returnOn : addDays(pickup, 1));
                        return (
                          <td key={day} className="px-1 py-1 text-center">
                            <button
                              type="button"
                              title={free + " of " + model.count + " free"}
                              onClick={() => pickDay(day)}
                              className={
                                "h-8 w-8 rounded-md " +
                                (free > 0 ? "bg-green-100 text-green-900" : "bg-neutral-100 text-neutral-400") +
                                (inHire ? " ring-2 ring-neutral-900" : "")
                              }
                            >
                              {free > 0 ? free : "–"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selected && availability && (
          <form id="checkout" onSubmit={submit} className="mt-10 scroll-mt-24 rounded-xl border border-neutral-300 bg-white p-6">
            <h3 className="text-xl font-semibold">Book the {selected.name}</h3>
            <p className="mt-2 text-sm text-neutral-600">
              {plural(availability.days)} · {formatDay(pickup)}, {pickTime} to {formatDay(returnOn)}, {retTime}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Full name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={fieldClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={fieldClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Mobile</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className={fieldClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">M-Pesa code (optional)</span>
                <input value={mpesaCode} onChange={(event) => setMpesaCode(event.target.value)} className={fieldClass} />
              </label>
            </div>
            {selected.addon > 0 && (
              <label className="mt-4 flex items-start gap-3 text-sm">
                <input type="checkbox" checked={insure} onChange={(event) => setInsure(event.target.checked)} className="mt-1" />
                <span>Add optional damage cover, {ksh(selected.addon)} per day.</span>
              </label>
            )}
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Hire, {plural(availability.days)} at {ksh(selected.rate)} / day</dt>
                <dd>{ksh(hireTotal)}</dd>
              </div>
              {insuranceTotal > 0 && (
                <div className="flex justify-between gap-4">
                  <dt>Damage cover</dt>
                  <dd>{ksh(insuranceTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt>Delivery</dt>
                <dd>{deliveryQuote.manual ? "Quoted before you pay" : pricedDelivery ? ksh(pricedDelivery) : "Included"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2 text-base font-semibold">
                <dt>{deliveryQuote.manual ? "Hire so far" : "Due in full"}</dt>
                <dd>{ksh(total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-neutral-600">{deliveryQuote.summary}</p>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} className="mt-1" />
              <span>I am at least 25 and I will bring a valid driving licence and ID to collection.</span>
            </label>
            <p className="mt-3 text-sm text-neutral-600">We check the licence at handover. There is nothing to upload now.</p>
            {formError && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {formError}
              </p>
            )}
            {!selected.available && <p className="mt-3 text-sm text-red-700">That vehicle is no longer free for these dates.</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting || !selected.available}
                className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Sending…" : deliveryQuote.manual ? "Send booking request" : "Submit booking — " + ksh(total) + " due in full"}
              </button>
              <button type="button" onClick={() => setSelectedId("")} className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function VehicleCard({
  model,
  days,
  onBook,
  onNext,
}: {
  model: PublicModelCard;
  days: number;
  onBook: () => void;
  onNext: (day: string) => void;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">{model.tag}</p>
      <h3 className="mt-2 text-lg font-semibold">{model.name}</h3>
      <p className="mt-2 text-sm text-neutral-600">
        {model.seatsText} · {model.gear} · {model.fuel}
      </p>
      <p className="mt-1 text-sm text-neutral-600">
        {model.count === 1 ? "1 vehicle" : model.count + " vehicles"} · {model.mileage}
      </p>
      <p className="mt-1 text-sm text-neutral-600">Optional cover {ksh(model.addon)} / day</p>
      <p className={"mt-3 text-sm font-medium " + (model.available ? "text-green-800" : "text-red-700")}>
        {model.free} of {model.count} free for your dates
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">{ksh(model.rate)} / day</div>
          <div className="text-lg font-semibold">{days ? ksh(model.hireTotal) + " hire" : "Choose dates"}</div>
        </div>
        {model.available ? (
          <button type="button" onClick={onBook} className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white">
            Book
          </button>
        ) : model.nextFree ? (
          <button type="button" onClick={() => onNext(model.nextFree!)} className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm">
            Next free {formatDayShort(model.nextFree)}
          </button>
        ) : null}
      </div>
    </article>
  );
}
