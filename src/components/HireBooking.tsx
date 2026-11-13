"use client";

import { useEffect, useMemo, useState } from "react";
import { CONTACT } from "../lib/contact";
import {
  addDays,
  assessBooking,
  assessmentError,
  dateProblem,
  dayNumber,
  DELIVERY_LABELS,
  formatDay,
  HOURS,
  hoursReason,
  ksh,
  outOfHours,
  PICKUP_LOCATIONS,
  PLACES,
  PRICING,
  quoteDelivery,
  todayNairobi,
  type AvailabilityResponse,
  type BookingInput,
  type DeliveryMode,
  type PublicBookingResult,
  type PublicModelCard,
} from "../lib/hire";

// Layout and wording follow Homer's vehicle hire design (V1.5).
// Payment rules follow the booking system: the full amount is due, nothing is charged on this page,
// and staff confirm once they have checked the M-Pesa or bank payment.

const STORED = "cfHireRequest";

// Photos from Homer's design, one per model. They are illustrative until real photos replace them.
const PHOTOS: Record<string, string> = {
  "toyota-axio": "/images/vehicle-hire/models/toyota-axio.webp",
  "toyota-fielder": "/images/vehicle-hire/models/toyota-fielder.webp",
  "toyota-premio": "/images/vehicle-hire/models/toyota-premio.webp",
  "toyota-nze": "/images/vehicle-hire/models/toyota-nze.webp",
  "nissan-bluebird": "/images/vehicle-hire/models/nissan-bluebird.webp",
  "nissan-x-trail": "/images/vehicle-hire/models/nissan-x-trail.webp",
  "toyota-prado": "/images/vehicle-hire/models/toyota-prado.webp",
  "toyota-prado-3-door": "/images/vehicle-hire/models/toyota-prado-3-door.webp",
  "toyota-land-cruiser": "/images/vehicle-hire/models/toyota-land-cruiser.webp",
};

const field =
  "h-[46px] w-full min-w-0 border border-[#c8c8c8] bg-white px-3 text-[15px] text-[#171717] rounded-none";
const fieldBox = "h-[46px] min-w-0 border border-[#c8c8c8] bg-white text-[15px] text-[#171717] rounded-none";
const roundField =
  "h-[46px] w-full min-w-0 rounded-lg border border-[#c8c8c8] bg-white px-3 text-[15px] text-[#171717]";
const area =
  "w-full rounded-lg border border-[#c8c8c8] bg-white px-3 py-2.5 font-[inherit] text-[15px] text-[#171717]";
const label = "mb-1.5 block text-[13px] text-[#595959]";
const btnDark =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-lg border-0 bg-[#171717] px-[22px] text-[13px] font-bold uppercase tracking-[1px] text-white hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-50";
const btnLight =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-lg border border-[#171717] bg-white px-5 text-[13px] font-bold text-[#171717] hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:opacity-40";
const eyebrow = "text-[13px] font-bold uppercase tracking-[3px] text-[#595959]";
const h2 = "mt-1.5 text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]";
const sectionWrap = "mx-auto w-[89%] max-w-[1180px]";

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

function scrollToId(id: string) {
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

export default function HireBooking({ modelCount = 9 }: { modelCount?: number }) {
  const today = todayNairobi();
  const initialDates = useState(defaultWindow)[0];
  const [location, setLocation] = useState<(typeof PICKUP_LOCATIONS)[number]>(PICKUP_LOCATIONS[0]);
  const [pickup, setPickup] = useState(initialDates.pickup);
  const [returnOn, setReturnOn] = useState(initialDates.returnOn);
  const [pickTime, setPickTime] = useState("09:00");
  const [retTime, setRetTime] = useState("09:00");
  const [type, setType] = useState("all");
  const [delivery, setDelivery] = useState<DeliveryMode>("none");
  const [address, setAddress] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const directions = "";
  const [note, setNote] = useState("");
  const [oohNote, setOohNote] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [insure, setInsure] = useState(false);
  const [mpesaCode, setMpesaCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PublicBookingResult | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [laterCode, setLaterCode] = useState("");
  const [codeMessage, setCodeMessage] = useState("");

  const dateError = dateProblem(pickup, returnOn);

  useEffect(() => {
    setResult(readStored());
  }, []);

  useEffect(() => {
    if (dateError) {
      setAvailability(null);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({ pickup, return: returnOn });
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
  }, [pickup, returnOn, refreshToken, dateError]);

  const hours = outOfHours(pickup, returnOn, pickTime, retTime);
  // Every delivery stays a quote, as on the live page: staff set the delivery charge and the vehicle is
  // not held until then. The place list only helps the customer type the address.
  const deliveryQuote = quoteDelivery({ delivery, place: null, address, location, ooh: hours, directions, note });
  const models = useMemo(() => {
    const list = availability?.models || [];
    return type === "all" ? list : list.filter((model) => model.group === type);
  }, [availability, type]);
  const selected = (availability?.models || []).find((model) => model.id === selectedId) || null;
  const days = availability?.days || 0;
  const hireTotal = selected ? days * selected.rate : 0;
  const insuranceTotal = selected && insure ? days * selected.addon : 0;
  const pricedDelivery = deliveryQuote.manual ? 0 : deliveryQuote.fee || 0;
  const total = hireTotal + insuranceTotal + pricedDelivery;

  const suggestions = useMemo(() => {
    const query = address.trim().toLowerCase();
    if (query.length < 2 || placeId) return [];
    return PLACES.filter((item) => (item.name + " " + item.area).toLowerCase().includes(query)).slice(0, 6);
  }, [address, placeId]);

  function bookingInput(acceptTerms: boolean): Partial<BookingInput> {
    return {
      modelId: selectedId,
      pickup,
      returnOn,
      pickTime,
      retTime,
      location,
      delivery,
      placeId: "",
      address: delivery === "none" ? "" : address,
      directions: delivery === "none" ? "" : directions,
      note: delivery === "none" ? "" : note,
      insure,
      name,
      email,
      phone,
      oohNote,
      mpesaCode: deliveryQuote.manual ? "" : mpesaCode,
      terms: acceptTerms,
    };
  }

  function check(acceptTerms: boolean) {
    if (!selected) return "Choose a vehicle.";
    const checked = assessBooking(
      { id: selected.id, name: selected.name, rate: selected.rate, addon: selected.addon },
      bookingInput(acceptTerms),
    );
    return assessmentError(checked) || (checked.ok ? "" : "Check the booking details.");
  }

  function remember(booking: PublicBookingResult) {
    setResult(booking);
    try {
      sessionStorage.setItem(STORED, JSON.stringify(booking));
    } catch {
      /* the confirmation still stays on the page */
    }
  }

  function chooseVehicle(id: string) {
    setSelectedId(id);
    setStep(1);
    setFormError("");
    scrollToId("checkout");
  }

  function goStep2() {
    const problem = check(true);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError("");
    setStep(2);
    scrollToId("checkout");
  }

  async function submit() {
    if (!selected) return;
    const problem = check(terms);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/hire/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingInput(terms)),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The booking could not be saved.");
      remember(body);
      setSelectedId("");
      setStep(1);
      setTerms(false);
      setMpesaCode("");
      setRefreshToken((value) => value + 1);
      scrollToId("checkout");
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

  function bookAnother() {
    setResult(null);
    setCodeMessage("");
    try {
      sessionStorage.removeItem(STORED);
    } catch {
      /* nothing stored */
    }
    scrollToId("vehicles");
  }

  const wa = "https://wa.me/" + CONTACT.whatsappE164.replace(/\D/g, "");
  const tel = "tel:" + CONTACT.phoneE164.replace(/\s/g, "");
  const summaryLine = availability
    ? plural(availability.days) + " · " + formatDay(pickup) + " to " + formatDay(returnOn) + " · " + location
    : "Choose your dates to see availability and totals";
  const deliveryHelp =
    delivery === "both"
      ? "Tell us where to deliver the vehicle and where to collect it at the end."
      : "Tell us where to deliver the vehicle. You return it to " + location + ".";
  const showCheckout = Boolean(selected || result);
  const manual = deliveryQuote.manual;

  return (
    <>
      <div className={sectionWrap}>
        {/* Find your vehicle */}
        <div
          id="book"
          className="scroll-mt-28 border border-[#d9d1b8] bg-white px-5 py-[22px] text-[#171717] shadow-[0_6px_18px_rgba(60,50,20,0.08)] sm:px-6"
        >
          <h2 className="mb-4 text-[22px] font-bold tracking-[-0.02em]">Find your vehicle</h2>
          <div className="grid items-end gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
            <div>
              <label htmlFor="loc" className={label}>
                Pick-up location
              </label>
              <select
                id="loc"
                value={location}
                onChange={(event) => setLocation(event.target.value as (typeof PICKUP_LOCATIONS)[number])}
                className={field}
              >
                {PICKUP_LOCATIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pdate" className={label}>
                Pick-up date and time
              </label>
              <div className="flex gap-1.5">
                <input
                  id="pdate"
                  type="date"
                  min={today}
                  value={pickup}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPickup(value);
                    if (returnOn < value) setReturnOn(value);
                  }}
                  className={fieldBox + " flex-[1_1_130px] px-2"}
                />
                <select
                  aria-label="Pick-up time"
                  value={pickTime}
                  onChange={(event) => setPickTime(event.target.value)}
                  className={fieldBox + " w-[84px] flex-none px-1"}
                >
                  {HOURS.map((hour) => (
                    <option key={hour}>{hour}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="rdate" className={label}>
                Return date and time
              </label>
              <div className="flex gap-1.5">
                <input
                  id="rdate"
                  type="date"
                  min={pickup || today}
                  value={returnOn}
                  onChange={(event) => {
                    setReturnOn(event.target.value);
                  }}
                  className={fieldBox + " flex-[1_1_130px] px-2"}
                />
                <select
                  aria-label="Return time"
                  value={retTime}
                  onChange={(event) => setRetTime(event.target.value)}
                  className={fieldBox + " w-[84px] flex-none px-1"}
                >
                  {HOURS.map((hour) => (
                    <option key={hour}>{hour}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="vtype" className={label}>
                Vehicle type
              </label>
              <select id="vtype" value={type} onChange={(event) => setType(event.target.value)} className={field}>
                <option value="all">All vehicles</option>
                <option value="4x4">4x4 / SUV</option>
                <option value="saloon">Saloon</option>
              </select>
            </div>
            <div>
              <label htmlFor="deliv" className={label}>
                Delivery
              </label>
              <select
                id="deliv"
                value={delivery}
                onChange={(event) => setDelivery(event.target.value as DeliveryMode)}
                className={field}
              >
                <option value="none">No, I will collect it</option>
                <option value="deliver">Deliver to me</option>
                <option value="both">Deliver and collect</option>
              </select>
            </div>
            <button type="button" onClick={() => scrollToId("vehicles")} className={btnDark + " h-[46px] px-5"}>
              Show available vehicles
            </button>
          </div>

          {delivery !== "none" && (
            <div className="mt-[18px] border-t border-[#e5e5e5] pt-4">
              <div className="text-base font-bold">Where should we deliver?</div>
              <p className="mb-3 mt-0.5 text-[13px] text-[#595959]">
                {deliveryHelp} Search for a place, or type the address.
              </p>
              <div className="relative">
                <label htmlFor="daddr" className={label}>
                  Delivery address
                </label>
                <input
                  id="daddr"
                  type="text"
                  autoComplete="off"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setPlaceId("");
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Start typing, e.g. Village Market or Naivasha"
                  className={roundField}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    role="listbox"
                    aria-label="Suggested places"
                    className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[#c8c8c8] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                  >
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setPlaceId(item.id);
                          setAddress(item.name + ", " + item.area);
                          setShowSuggestions(false);
                        }}
                        className="block w-full cursor-pointer border-0 border-b border-[#f0f0f0] bg-white px-3.5 py-2.5 text-left text-sm text-[#171717] hover:bg-[#f7f7f5]"
                      >
                        <strong>{item.name}</strong> <span className="text-[#595959]">· {item.area}</span>
                      </button>
                    ))}
                    <div className="bg-[#f7f7f5] px-3.5 py-1.5 text-[11px] text-[#595959]">
                      Not in the list? Type the full address.
                    </div>
                  </div>
                )}
              </div>

              {manual && address.trim().length >= 3 && (
                <div className="mt-3.5">
                  <p className="rounded-lg bg-[#fef7e0] px-3 py-2.5 text-sm text-[#5f4b00]">{deliveryQuote.message}</p>
                  <label htmlFor="lnote" className="mb-1.5 mt-3 block text-sm font-bold">
                    Delivery details
                  </label>
                  <textarea
                    id="lnote"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Exact place, and when you need the vehicle there"
                    className={area}
                  />
                </div>
              )}

              <p className="mt-2.5 text-xs text-[#595959]">
                Collection from Karen, JKIA or Wilson Airport is included. Delivery inside Nairobi is free during opening
                hours. Otherwise it is {ksh(PRICING.base)} per trip plus {ksh(PRICING.perKm)} per km after the first{" "}
                {PRICING.freeKm} km, measured by road from our workshop in Karen.
              </p>
            </div>
          )}

          {hours.any && (
            <div role="status" className="mt-4 rounded-lg border border-[#f3d57a] bg-[#fef7e0] px-3.5 py-3 text-[#5f4b00]">
              {hours.pick && (
                <strong className="block text-sm">
                  ⚠ Your pick-up on {formatDay(pickup)} at {pickTime} is outside our opening hours:{" "}
                  {hoursReason(pickup, pickTime)}.
                </strong>
              )}
              {hours.ret && (
                <strong className="block text-sm">
                  ⚠ Your return on {formatDay(returnOn)} at {retTime} is outside our opening hours:{" "}
                  {hoursReason(returnOn, retTime)}.
                </strong>
              )}
              <p className="mb-2.5 mt-1 text-sm">
                We are open Monday to Friday 08:00–17:00 and Saturday 08:00–13:00. Tell us what you need below and we will
                arrange it with you.
                {delivery !== "none" && " Delivery inside Nairobi is charged by distance outside opening hours."}
              </p>
              <label htmlFor="oohNote" className="mb-1.5 block text-[13px] font-bold text-[#3f3f3f]">
                Out-of-hours details
              </label>
              <textarea
                id="oohNote"
                rows={2}
                value={oohNote}
                onChange={(event) => setOohNote(event.target.value)}
                placeholder="For example: landing at JKIA at 21:30 on flight KQ101"
                className={area}
              />
            </div>
          )}

          {dateError && (
            <p role="alert" className="mt-3.5 text-sm font-bold text-[#9b1c1c]">
              {dateError}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={tel}
            className="inline-flex min-h-[48px] items-center rounded-lg bg-[#171717] px-[26px] text-base font-semibold text-white no-underline hover:bg-[#2b2b2b] hover:text-white"
          >
            Call
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center rounded-lg border border-[#e0e0e0] bg-white px-[26px] text-base font-medium text-[#171717] no-underline"
          >
            WhatsApp
          </a>
        </div>
      </div>

      {/* Available vehicles */}
      <section id="vehicles" className={sectionWrap + " mt-14 scroll-mt-28"}>
        <div data-reveal className="mb-[22px] flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <div className={eyebrow}>Choose your drive</div>
            <h2 className={h2}>Available vehicles</h2>
            <div className="mt-1 text-[13px] text-[#595959]">Daily rates include VAT.</div>
          </div>
          <p className="text-sm text-[#595959]">
            {summaryLine}
          </p>
        </div>

        {loadError && (
          <p role="alert" className="mb-4 rounded-xl border border-[#e5e5e5] bg-white p-5 text-sm text-[#9b1c1c]">
            {loadError} You can still call {CONTACT.phoneDisplay} or{" "}
            <a className="underline" href={wa} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>{" "}
            us.
          </p>
        )}
        <p className="sr-only" role="status">
          {loading ? "Checking the fleet…" : ""}
        </p>
        {!loading && !loadError && !dateError && models.length === 0 && (
          <p className="rounded-xl border border-[#e5e5e5] bg-white p-5">
            No vehicles of this type are listed. Choose “All vehicles” to see the full fleet.
          </p>
        )}
        {dateError && (
          <p className="rounded-xl border border-[#e5e5e5] bg-white p-5">
            Choose valid dates in Find your vehicle to see what is free and the total for each vehicle.
          </p>
        )}

        <div
          data-reveal-stagger
          aria-busy={loading}
          className={
            "grid gap-3.5 transition-opacity duration-200 [grid-template-columns:repeat(auto-fill,minmax(215px,1fr))]" +
            (loading && availability ? " opacity-60" : "")
          }
        >
          {/* Placeholders the same size as the real cards, so the page does not jump when they arrive */}
          {loading &&
            !availability &&
            !dateError &&
            Array.from({ length: modelCount }, (_, index) => (
              <div
                key={"ph" + index}
                aria-hidden="true"
                className="h-[427px] animate-pulse overflow-hidden rounded-xl border border-[#e5e5e5] bg-white"
              >
                <div className="h-[118px] bg-[#ececea]" />
                <div className="space-y-3 px-3.5 pt-4">
                  <div className="h-3 w-1/2 rounded bg-[#ececea]" />
                  <div className="h-5 w-3/4 rounded bg-[#ececea]" />
                  <div className="h-3 w-2/3 rounded bg-[#ececea]" />
                  <div className="h-5 w-1/2 rounded bg-[#ececea]" />
                  <div className="h-12 rounded bg-[#f3f3f1]" />
                </div>
              </div>
            ))}
          {models.map((model) => (
            <VehicleCard
              key={model.id}
              model={model}
              days={days}
              onBook={() => chooseVehicle(model.id)}
              onNext={(day) => pickDay(day)}
            />
          ))}
        </div>
        <p className="mt-3.5 text-[13px] leading-relaxed text-[#595959]">
          Our workshop cleans and checks every vehicle between hires. You choose a model; we assign the exact vehicle
          when you collect.
        </p>
      </section>

      {/* Checkout */}
      {showCheckout && (
        <section id="checkout" className={sectionWrap + " mt-12 scroll-mt-28"}>
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 sm:p-[26px]">
            <div className="mb-5 flex gap-1.5">
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className={"h-1 flex-1 " + (result || (selected && step >= n) ? "bg-[#171717]" : "bg-[#e5e5e5]")}
                />
              ))}
            </div>

            {result && !selected && (
              <div className="px-2 pb-2 pt-[18px] text-center">
                <div
                  aria-hidden="true"
                  className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-full bg-[#171717] text-[28px] text-[#d5bb7a]"
                >
                  ✓
                </div>
                <h2 className="mb-2 text-[30px] font-bold tracking-[-0.02em]">
                  {result.manual ? "Booking request sent" : "Vehicle held"}
                </h2>
                <p className="mx-auto mb-[18px] max-w-[520px] text-[#595959]">{result.message}</p>
                <div className="mx-auto mb-[18px] max-w-[520px] bg-[#f5f5f3] p-4 text-left text-[15px] leading-[1.8]">
                  <div>
                    Reference <strong className="text-lg">{result.reference}</strong>
                  </div>
                  <strong>{result.model}</strong>
                  <br />
                  {formatDay(result.pickup)}, {result.pickTime} to {formatDay(result.returnOn)}, {result.retTime}
                  <br />
                  {result.summary}
                  <br />
                  {result.manual ? "Hire so far: " : "Due in full: "}
                  <strong>{ksh(result.total)}</strong>
                  {result.manual && (
                    <>
                      <br />
                      The delivery charge is agreed with you before you pay.
                    </>
                  )}
                </div>
                {!result.manual && (
                  <form
                    onSubmit={sendCode}
                    className="mx-auto mb-[18px] flex max-w-[520px] flex-col gap-3 text-left sm:flex-row sm:items-end"
                  >
                    <div className="min-w-0 flex-1">
                      <label htmlFor="laterCode" className={label}>
                        M-Pesa code, once you have paid
                      </label>
                      <input
                        id="laterCode"
                        value={laterCode}
                        onChange={(event) => setLaterCode(event.target.value)}
                        className={roundField}
                      />
                    </div>
                    <button type="submit" className={btnLight}>
                      Send code
                    </button>
                  </form>
                )}
                {codeMessage && <p className="mb-4 text-sm text-[#3f3f3f]">{codeMessage}</p>}
                <button type="button" onClick={bookAnother} className={btnDark}>
                  Book another vehicle
                </button>
              </div>
            )}

            {selected && availability && (
              <div className="flex flex-wrap gap-7">
                <div className="min-w-0 flex-[999_1_420px]">
                  {step === 1 && (
                    <div>
                      <div className="text-[13px] font-bold uppercase tracking-[2px] text-[#595959]">Step 1 of 2</div>
                      <h2 className="mb-4 mt-1.5 text-[28px] font-bold tracking-[-0.02em]">Your details</h2>
                      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                        <div>
                          <label htmlFor="fname" className={label}>
                            Full name
                          </label>
                          <input
                            id="fname"
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoComplete="name"
                            placeholder="Your full name"
                            className={field}
                          />
                        </div>
                        <div>
                          <label htmlFor="femail" className={label}>
                            Email address
                          </label>
                          <input
                            id="femail"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            placeholder="you@example.com"
                            className={field}
                          />
                        </div>
                        <div>
                          <label htmlFor="fphone" className={label}>
                            Mobile number
                          </label>
                          <input
                            id="fphone"
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            autoComplete="tel"
                            placeholder="+254"
                            className={field}
                          />
                        </div>
                      </div>
                      <p className="mt-3 text-[13px] text-[#595959]">
                        Please bring your driving licence and ID to collection. We check them at handover, so there is
                        nothing to upload now.
                      </p>
                      {formError && (
                        <p role="alert" className="mt-3 text-sm font-bold text-[#9b1c1c]">
                          {formError}
                        </p>
                      )}
                      <div className="mt-[18px] flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId("");
                            setFormError("");
                            scrollToId("vehicles");
                          }}
                          className={btnLight}
                        >
                          Change vehicle
                        </button>
                        <button type="button" onClick={goStep2} className={btnDark}>
                          Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <div className="text-[13px] font-bold uppercase tracking-[2px] text-[#595959]">Step 2 of 2</div>
                      <h2 className="mb-4 mt-1.5 text-[28px] font-bold tracking-[-0.02em]">
                        {manual ? "Send your request" : "Confirm and pay"}
                      </h2>
                      {selected.addon > 0 && (
                        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#e5e5e5] bg-[#f5f5f3] px-4 py-3.5">
                          <input
                            id="insBox"
                            type="checkbox"
                            checked={insure}
                            onChange={(event) => setInsure(event.target.checked)}
                            className="mt-px h-[22px] w-[22px] flex-none"
                          />
                          <label htmlFor="insBox" className="text-sm leading-normal">
                            <strong>Add damage cover for {ksh(selected.addon)} a day</strong>
                            <br />
                            <span className="text-[#595959]">
                              Covers damage to the vehicle, repaired by our own workshop. Without it, you pay for any
                              damage.
                            </span>
                          </label>
                        </div>
                      )}

                      {manual ? (
                        <div className="rounded-xl border border-[#e5e5e5] bg-[#f5f5f3] p-4 text-sm leading-relaxed text-[#3f3f3f]">
                          <strong className="mb-1 block text-[15px] text-[#171717]">How a delivery quote works</strong>
                          We will price the delivery and contact you by email, text or WhatsApp with the full amount
                          before you pay. The vehicle is not held until the delivery charge is agreed.
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[#e5e5e5] bg-[#f5f5f3] p-4">
                          <div className="mb-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                            <div>
                              <div className="text-[13px] text-[#595959]">Amount due in full</div>
                              <div className="mt-0.5 text-2xl font-bold tracking-[-0.01em]">{ksh(total)}</div>
                            </div>
                            <div>
                              <div className="text-[13px] text-[#595959]">Pay by</div>
                              <div className="mt-0.5 text-2xl font-bold tracking-[-0.01em]">M-Pesa or bank</div>
                            </div>
                          </div>
                          <ol className="mb-2.5 list-decimal pl-5 text-sm leading-[1.7] text-[#3f3f3f]">
                            <li>Submit the booking. We hold the vehicle and give you a booking reference.</li>
                            <li>Pay the full amount by M-Pesa or bank transfer, and quote the booking reference.</li>
                            <li>We check the payment and confirm your booking.</li>
                          </ol>
                          <p className="text-[13px] text-[#595959]">Nothing is taken on this page.</p>
                          <label htmlFor="mpesa" className={label + " mt-3"}>
                            M-Pesa code (optional, if you have already paid)
                          </label>
                          <input
                            id="mpesa"
                            value={mpesaCode}
                            onChange={(event) => setMpesaCode(event.target.value)}
                            className={roundField}
                          />
                        </div>
                      )}

                      <div className="mt-3.5 flex items-start gap-2.5">
                        <input
                          id="termsBox"
                          type="checkbox"
                          checked={terms}
                          onChange={(event) => setTerms(event.target.checked)}
                          className="mt-px h-[22px] w-[22px] flex-none"
                        />
                        <label htmlFor="termsBox" className="text-sm leading-normal">
                          I am at least 25 and I will bring a valid driving licence and ID to collection.
                        </label>
                      </div>
                      {formError && (
                        <p role="alert" className="mt-3 text-sm font-bold text-[#9b1c1c]">
                          {formError}
                        </p>
                      )}
                      {!selected.available && (
                        <p className="mt-3 text-sm font-bold text-[#9b1c1c]">
                          That vehicle is no longer free for these dates.
                        </p>
                      )}
                      <div className="mt-[18px] flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStep(1);
                            setFormError("");
                          }}
                          className={btnLight}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={submit}
                          disabled={submitting || !selected.available}
                          className={btnDark}
                        >
                          {submitting
                            ? "Sending…"
                            : manual
                              ? "Send booking request"
                              : "Hold vehicle · " + ksh(total) + " due"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <aside className="min-w-0 flex-[1_1_280px] self-start bg-[#f5f5f3] p-5">
                  <div className="text-[13px] font-bold uppercase tracking-[2px] text-[#595959]">Your hire</div>
                  <h3 className="mb-2.5 mt-1.5 text-[22px] font-bold tracking-[-0.02em]">{selected.name}</h3>
                  <div className="text-sm leading-[1.8]">
                    <div>
                      {formatDay(pickup)}, {pickTime}
                    </div>
                    <div>
                      to {formatDay(returnOn)}, {retTime}
                    </div>
                    <div>{location}</div>
                    {delivery !== "none" && (
                      <div>
                        <strong>Delivery:</strong> {DELIVERY_LABELS[delivery]}
                      </div>
                    )}
                  </div>
                  <div className="my-3.5 border-t border-[#e5e5e5] pt-3 text-sm leading-[1.9]">
                    <div className="flex justify-between gap-2">
                      <span>
                        {plural(days)} at {ksh(selected.rate)}
                      </span>
                      <span>{ksh(hireTotal)}</span>
                    </div>
                    {delivery !== "none" && (
                      <div className="flex justify-between gap-2">
                        <span>Delivery</span>
                        <span>{manual ? "Quoted before you pay" : pricedDelivery ? ksh(pricedDelivery) : "Free"}</span>
                      </div>
                    )}
                    {insuranceTotal > 0 && (
                      <div className="flex justify-between gap-2">
                        <span>Damage cover, {plural(days)}</span>
                        <span>{ksh(insuranceTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 font-bold">
                      <span>{manual ? "Hire so far" : "Due in full"}</span>
                      <span>{ksh(total)}</span>
                    </div>
                    <div className="text-[13px] text-[#595959]">Nothing is taken on this page.</div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      )}
    </>
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
  const photo = PHOTOS[model.id];
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
      {photo ? (
        <div className="relative">
          <img
            src={photo}
            alt={model.name + ", illustrative photo"}
            loading="lazy"
            decoding="async"
            className="block h-[118px] w-full object-cover object-[center_60%]"
          />
          <span className="absolute bottom-2 left-2 rounded bg-[rgba(23,23,23,0.78)] px-[7px] py-0.5 text-[11px] font-semibold text-white">
            Illustrative photo
          </span>
        </div>
      ) : (
        <div className="grid h-[118px] place-items-center bg-[#ececea] p-2.5 text-center text-[13px] text-[#595959]">
          Photo of {model.name} to be added
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
        <div className="text-xs font-bold uppercase tracking-[1.5px] text-[#595959]">{model.tag}</div>
        <h3 className="text-lg font-bold tracking-[-0.02em]">{model.name}</h3>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 border-b border-[#e5e5e5] pb-2 text-[13px] text-[#595959]">
          <span>{model.seatsText}</span>
          <span>{model.gear}</span>
          <span>{model.fuel}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <strong className="whitespace-nowrap text-lg">{ksh(model.rate)}</strong>
          <span className="whitespace-nowrap text-[13px] text-[#595959]">per day</span>
        </div>
        <div className="text-[13px] text-[#595959]">{model.mileage}</div>

        {days > 0 && (
          <div className="rounded-md bg-[#f5f5f3] px-2.5 py-1.5 text-[13px] leading-normal">
            <div className="flex justify-between gap-2">
              <span>{plural(days)}</span>
              <strong>{ksh(model.hireTotal)}</strong>
            </div>
            <div className="flex justify-between gap-2 text-[13px] text-[#595959]">
              <span>Paid in full when you book</span>
            </div>
          </div>
        )}

        {model.available ? (
          <div className="mt-auto flex flex-col gap-2">
            <div className="text-[13px] font-bold text-[#1d6b3a]">
              Available for your dates
            </div>
            <button type="button" onClick={onBook} className={btnDark + " min-h-[44px] w-full"}>
              Book this vehicle
            </button>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-2">
            <div className="text-[13px] font-bold text-[#9b1c1c]">Not available for your dates</div>
            {model.nextFree && (
              <button type="button" onClick={() => onNext(model.nextFree!)} className={btnLight + " min-h-[44px] w-full"}>
                Next free: {formatDay(model.nextFree)}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
