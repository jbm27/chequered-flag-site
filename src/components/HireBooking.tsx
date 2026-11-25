"use client";

import { useEffect, useMemo, useState } from "react";
import { COMPANY, CONTACT } from "../lib/contact";
import { type LatLng } from "./PinMap";
import PinPicker from "./PinPicker";
import PaymentDetails from "./PaymentDetails";
import DamageCoverChoice from "./DamageCoverChoice";
import ReviewPrompt, { rememberForReview, reviewUrl, skipReview } from "./ReviewPrompt";
import { mpesaCodeHint } from "../lib/payments";
import { LicencePicker, SignatureBox } from "./CheckoutDocuments";
import { buildBookingPdf, downloadPdf, loadPdfLogo, type BookingPdfData } from "../lib/bookingPdf";
import Marked, { ReviewKey } from "./Marked";
import { SHOW_REVIEW_CHANGES } from "../lib/review";
import {
  AGREEMENT_MARKED,
  AGREEMENT_TEXT,
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  MAX_DRIVERS,
  CANCELLATION_SUMMARY_MARKED,
  agreementLine,
  bookingSchedule,
  bookingScheduleMarked,
  damageLimitFor,
  mileageFor,
  type DocImage,
} from "../lib/documents";
import {
  addDays,
  assessBooking,
  assessmentError,
  dateProblem,
  dayNumber,
  DELIVERY,
  DELIVERY_LABELS,
  deliveryCharge,
  formatDay,
  HOURS,
  hoursReason,
  ksh,
  outOfHours,
  PICKUP_LOCATIONS,
  quoteDelivery,
  straightKm,
  todayNairobi,
  YARD,
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

// One photo per model (from Homer's design; the Land Cruiser is Homer's own photo, with the plate blanked).
const PHOTOS: Record<string, string> = {
  "saloon-car": "/images/vehicle-hire/models/toyota-axio.webp", // every saloon is one card; the Axio photo for now
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
  // Customers either collect from the workshop in Karen or choose delivery to a pin on the map.
  const location = PICKUP_LOCATIONS[0];
  const [pickup, setPickup] = useState(initialDates.pickup);
  const [returnOn, setReturnOn] = useState(initialDates.returnOn);
  const [pickTime, setPickTime] = useState("09:00");
  const [retTime, setRetTime] = useState("09:00");
  const [type, setType] = useState("all");
  const [delivery, setDelivery] = useState<DeliveryMode>("none");
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<LatLng | null>(null);
  // Collection from a different place (only for "Deliver and collect", when the toggle is on).
  const [collectElsewhere, setCollectElsewhere] = useState(false);
  const [collectPin, setCollectPin] = useState<LatLng | null>(null);
  const [collectAddress, setCollectAddress] = useState("");
  const directions = "";
  const [note, setNote] = useState("");
  const [oohNote, setOohNote] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Damage cover: true (collision damage waiver), false (no waiver), null (not chosen yet; required to book).
  const [insure, setInsure] = useState<boolean | null>(null);
  useEffect(() => {
    setInsure(null);
  }, [selectedId]);
  const [mpesaCode, setMpesaCode] = useState("");
  // Discount code at checkout
  const [codeInput, setCodeInput] = useState("");
  const [codeApplied, setCodeApplied] = useState<{ code: string; amount: number; label: string } | null>(null);
  const [codeError, setCodeError] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [terms, setTerms] = useState(false);
  // Security update: licence photos for every driver, extra drivers, and the signed hire agreement.
  const [mainLicence, setMainLicence] = useState<DocImage | null>(null);
  const [extraDrivers, setExtraDrivers] = useState<{ name: string; phone: string; licence: DocImage | null }[]>([]);
  const [sigMode, setSigMode] = useState<"drawn" | "typed">("drawn");
  const [sigImage, setSigImage] = useState<DocImage | null>(null);
  const [sigName, setSigName] = useState("");
  const [pdfData, setPdfData] = useState<BookingPdfData | null>(null);
  // Returning customers: a licence kept on file (email and mobile number both match) can be reused.
  const [onFileSince, setOnFileSince] = useState("");
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [useOnFile, setUseOnFile] = useState(true);
  const [keepOnFile, setKeepOnFile] = useState(false);
  const usingOnFile = Boolean(onFileSince) && useOnFile;

  useEffect(() => {
    const cleanEmail = email.trim();
    const digits = phone.replace(/\D/g, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || digits.length < 9) {
      setOnFileSince("");
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      fetch("/api/hire/licence-on-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, phone }),
      })
        .then((response) => response.json())
        .then((body: { onFile?: boolean; since?: string }) => {
          if (!live) return;
          setOnFileSince(body.onFile && body.since ? body.since : "");
          if (body.onFile) setUseOnFile(true);
        })
        .catch(() => live && setOnFileSince(""));
    }, 600);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [email, phone]);
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
  // Delivery is priced from the pin: free within DELIVERY.freeKm (15 km) in a straight line of the workshop, then per km over that
  // by vehicle type. The server works the price out again from the same pin, so this is only a preview.
  const models = useMemo(() => {
    const list = availability?.models || [];
    return type === "all" ? list : list.filter((model) => model.group === type);
  }, [availability, type]);
  const selected = (availability?.models || []).find((model) => model.id === selectedId) || null;
  const pinPlace =
    delivery !== "none" && pin ? { id: "pin", name: address || "Pinned location", area: "", lat: pin.lat, lng: pin.lng } : null;
  const collecting = delivery === "both" && collectElsewhere;
  const collectPlace =
    collecting && collectPin
      ? { id: "collect-pin", name: collectAddress || "Collection pin", area: "", lat: collectPin.lat, lng: collectPin.lng }
      : null;
  const deliveryQuote = quoteDelivery({
    delivery,
    place: pinPlace,
    collectPlace,
    address,
    location,
    ooh: hours,
    directions,
    note,
    category: selected?.category,
  });
  const days = availability?.days || 0;
  const hireTotal = selected ? days * selected.rate : 0;
  const insuranceTotal = selected && insure === true ? days * selected.addon : 0;
  const coverMissing = Boolean(selected && selected.addon > 0 && insure === null);
  const pricedDelivery = deliveryQuote.manual ? 0 : deliveryQuote.fee || 0;
  // A discount code (issued by staff) comes off the hire charge only; the server checks it again when booking.
  const codeOff = codeApplied ? Math.min(codeApplied.amount, hireTotal) : 0;
  const total = hireTotal + insuranceTotal + pricedDelivery - codeOff;

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
      pinLat: delivery !== "none" && pin ? pin.lat : "",
      pinLng: delivery !== "none" && pin ? pin.lng : "",
      collectLat: collectPlace ? collectPlace.lat : "",
      collectLng: collectPlace ? collectPlace.lng : "",
      collectAddress: collectPlace ? collectAddress : "",
      address: delivery === "none" ? "" : address,
      directions: delivery === "none" ? "" : directions,
      note: delivery === "none" ? "" : note,
      insure: insure === true,
      name,
      email,
      phone,
      oohNote,
      mpesaCode: deliveryQuote.manual ? "" : mpesaCode,
      terms: acceptTerms,
      discountCode: codeApplied ? codeApplied.code : "",
    };
  }

  // The code's discount depends on the vehicle and dates, so it is checked again when they change.
  useEffect(() => {
    setCodeApplied(null);
    setCodeError("");
  }, [selectedId, pickup, returnOn]);

  async function applyCode() {
    const code = codeInput.trim();
    setCodeError("");
    if (!code) return setCodeError("Enter your discount code.");
    setCodeBusy(true);
    try {
      const response = await fetch("/api/hire/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, modelId: selectedId, pickup, returnOn }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "That discount code couldn't be checked.");
      setCodeApplied(body);
    } catch (error) {
      setCodeApplied(null);
      setCodeError(error instanceof Error ? error.message : "That discount code couldn't be checked.");
    } finally {
      setCodeBusy(false);
    }
  }

  const selectedLimit = selected ? damageLimitFor(selected.name, selected.category) : null;

  // The Booking Schedule shown at the top of the agreement, filled in from what the customer has entered.
  function scheduleValues() {
    const when = (day: string, time: string) => (day ? formatDay(day) + ", " + time + " EAT" : "");
    const collectWhere = delivery === "none" ? location : "Delivered to " + (address || "your pin");
    const returnWhere =
      delivery === "none" ? location : delivery === "both" ? "Collected from " + (collectPlace ? collectAddress : address || "your pin") : location;
    return {
      reference: "",
      hirer: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      verification: usingOnFile
        ? "Licence photo on file from an earlier booking; ⟦licence and a valid ID or passport to be presented at handover⟧⟪checked at handover⟫"
        : "Licence photo uploaded for each driver; ⟦licence and a valid ID or passport to be presented at handover⟧⟪checked at handover⟫",
      drivers: [name.trim(), ...extraDrivers.map((driver) => driver.name.trim())],
      vehicle: selected ? selected.name : "",
      collect: collectWhere + ", " + when(pickup, pickTime),
      ret: returnWhere + ", " + when(returnOn, retTime),
      price:
        "Hire " + ksh(hireTotal) +
        (insuranceTotal ? " + collision damage waiver " + ksh(insuranceTotal) : "") +
        (deliveryQuote.manual ? " + delivery (to be quoted)" : pricedDelivery ? " + delivery " + ksh(pricedDelivery) : "") +
        (codeOff ? " − discount " + ksh(codeOff) + " (code " + (codeApplied?.code || "") + ")" : "") +
        " = " + ksh(total) + " (VAT included)",
      damageLimit: selectedLimit,
      category: selected?.category,
      waiver: insuranceTotal ? ksh(insuranceTotal) + " for " + plural(days) : "",
      mileage: mileageFor(selected?.category),
    };
  }

  function check(acceptTerms: boolean) {
    if (!selected) return "Choose a vehicle.";
    if (delivery !== "none" && !pin) return "For delivery, search for your address or tap the map to drop a pin.";
    if (collecting && !collectPin) {
      return "Drop a pin for where we collect the vehicle, or untick 'Collect the vehicle from a different place'.";
    }
    const checked = assessBooking(
      { id: selected.id, name: selected.name, rate: selected.rate, addon: selected.addon, category: selected.category },
      bookingInput(acceptTerms),
    );
    return assessmentError(checked) || (checked.ok ? "" : "Check the booking details.");
  }

  function remember(booking: PublicBookingResult) {
    setResult(booking);
    if (booking.reviewToken) {
      rememberForReview({ ref: booking.reference, t: booking.reviewToken, returnOn: booking.returnOn, model: booking.model });
    }
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

  function driversProblem() {
    if (!usingOnFile && !mainLicence) return "Add a photo of the front of your driving licence.";
    for (let index = 0; index < extraDrivers.length; index += 1) {
      const driver = extraDrivers[index];
      const n = index + 2;
      if (driver.name.trim().length < 2) return "Enter the full name of driver " + n + ".";
      const digits = driver.phone.replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 15) return "Enter a mobile number for driver " + n + ".";
      if (!driver.licence) return "Add a photo of the front of driver " + n + "'s licence.";
    }
    return "";
  }

  function signatureProblem() {
    if (sigMode === "drawn" && !sigImage) return "Draw your signature in the box, or choose to type your name.";
    if (sigMode === "typed" && sigName.trim().length < 2) return "Type your full name to sign the hire agreement.";
    return "";
  }

  function documentsPayload() {
    return {
      drivers: [
        usingOnFile ? { name, phone, useOnFile: true } : { name, phone, licence: mainLicence },
        ...extraDrivers.map((driver) => ({ name: driver.name, phone: driver.phone, licence: driver.licence })),
      ],
      signature:
        sigMode === "drawn" ? { kind: "drawn", name, image: sigImage } : { kind: "typed", name: sigName.trim() },
      agreementVersion: AGREEMENT_VERSION,
      keepOnFile: !usingOnFile && keepOnFile,
    };
  }

  function goStep2() {
    const problem = check(true) || driversProblem();
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
    const problem =
      (coverMissing ? "Choose your damage cover: the collision damage waiver or no waiver." : "") ||
      check(true) ||
      driversProblem() ||
      signatureProblem() ||
      (terms ? "" : "Tick the box to confirm you have read and signed the hire agreement.");
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
        body: JSON.stringify({ ...bookingInput(terms), documents: documentsPayload() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The booking could not be saved.");
      setPdfData(pdfFor(body as PublicBookingResult));
      remember(body);
      setMainLicence(null);
      setExtraDrivers([]);
      setSigImage(null);
      setSigName("");
      setSelectedId("");
      setStep(1);
      setTerms(false);
      setMpesaCode("");
      setCodeInput("");
      setCodeApplied(null);
      setRefreshToken((value) => value + 1);
      scrollToId("checkout");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The booking could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  // The customer's PDF copy is made here in the browser from what they have just entered,
  // so their licence photos are never served back over the internet.
  function pdfFor(booking: PublicBookingResult): BookingPdfData {
    const now = new Date();
    const stamp = now.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
    const locationLines =
      delivery === "none"
        ? ["Collect from our workshop: " + CONTACT.locationShort + ".", "Return the vehicle to the same place."]
        : [
            booking.summary,
            pin ? "Pin: " + pin.lat.toFixed(5) + ", " + pin.lng.toFixed(5) + " · about " + straightKm(pin.lat, pin.lng) + " km in a straight line from our workshop" : "",
            note.trim() ? "Delivery instructions: " + note.trim() : "",
          ].filter(Boolean);
    const perDay = (amount: number) => ksh(booking.days ? amount / booking.days : 0);
    const costs: BookingPdfData["costs"] = [
      { label: "Vehicle hire: " + booking.model, qty: plural(booking.days), unit: perDay(booking.hireTotal), amount: ksh(booking.hireTotal) },
    ];
    if (booking.insuranceTotal) {
      costs.push({ label: "Collision damage waiver", qty: plural(booking.days), unit: perDay(booking.insuranceTotal), amount: ksh(booking.insuranceTotal) });
    }
    if (delivery !== "none") {
      costs.push({
        label: delivery === "both" ? "Delivery and collection" : "Delivery",
        qty: "1",
        sub: !booking.manual ? deliveryQuote.breakdown : "",
        amount: booking.manual ? "Quoted before you pay" : booking.deliveryFee ? ksh(booking.deliveryFee) : "Free",
      });
    }
    if (booking.discount) {
      costs.push({ label: "Discount", sub: codeApplied ? "Code " + codeApplied.code : "", qty: "1", amount: "- " + ksh(booking.discount) });
    }
    return {
      reference: booking.reference,
      status: booking.manual ? "Request received – delivery to be priced by us" : "Vehicle held – awaiting full payment",
      created: stamp,
      vehicle: booking.model,
      pickupText: formatDay(booking.pickup) + ", " + booking.pickTime,
      returnText: formatDay(booking.returnOn) + ", " + booking.retTime,
      daysText: plural(booking.days),
      location: locationLines,
      costs,
      totalLabel: booking.manual ? "Hire so far" : "Due in full",
      paid: booking.manual ? undefined : ksh(0),
      balance: booking.manual ? undefined : ksh(booking.total),
      total: ksh(booking.total),
      customer: { name: name.trim(), phone: phone.trim(), email: email.trim() },
      drivers: [
        usingOnFile
          ? {
              name: name.trim(),
              phone: phone.trim(),
              licenceNote: "Licence on file from " + onFileSince + ". Bring it to collection, where we check it.",
            }
          : { name: name.trim(), phone: phone.trim(), licence: mainLicence! },
        ...extraDrivers.map((driver) => ({ name: driver.name.trim(), phone: driver.phone.trim(), licence: driver.licence! })),
      ],
      signature: sigMode === "drawn" ? { kind: "drawn", name: name.trim(), image: sigImage! } : { kind: "typed", name: sigName.trim() },
      signedAt: stamp,
      agreementTitle: AGREEMENT_TITLE,
      agreementVersion: AGREEMENT_VERSION,
      agreementText: AGREEMENT_TEXT,
      schedule: bookingSchedule({ ...scheduleValues(), reference: booking.reference }),
      footer: COMPANY.name + " Ltd · " + COMPANY.postal + " · Tel " + CONTACT.phoneDisplay + " · " + CONTACT.email,
    };
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
    setPdfData(null);
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
    ? plural(availability.days) +
      " · " +
      formatDay(pickup) +
      " to " +
      formatDay(returnOn) +
      " · " +
      (delivery === "none" ? "Collect in Karen" : "Delivered to you")
    : "Choose your dates to see availability and totals";
  const deliveryHelp =
    delivery === "both"
      ? "Tell us where to deliver the vehicle and where to collect it at the end."
      : "Tell us where to deliver the vehicle. You return it to our workshop in Karen.";
  const showCheckout = Boolean(selected || result);
  const manual = deliveryQuote.manual;

  return (
    <>
      <div className={sectionWrap}>
        <ReviewPrompt />
        {/* Find your vehicle */}
        <div
          id="book"
          className="scroll-mt-28 border border-[#d9d1b8] bg-white px-5 py-[22px] text-[#171717] shadow-[0_6px_18px_rgba(60,50,20,0.08)] sm:px-6"
        >
          <h2 className="mb-4 text-[22px] font-bold tracking-[-0.02em]">Find your vehicle</h2>
          <div className="grid items-end gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr))]">
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
                <option value="none">No, I will collect it in Karen</option>
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
                {deliveryHelp} Search for your address, or tap the map to drop a pin where you want the vehicle.
              </p>
              <PinPicker
                idPrefix="d"
                searchLabel="Search for the delivery address"
                placeholder="Address, area or landmark, e.g. Village Market, Gigiri"
                pin={pin}
                onChange={(point, name) => {
                  setPin(point);
                  setAddress(name);
                }}
              />

              {delivery === "both" && (
                <div className="mt-3.5">
                  <label className="flex items-start gap-2.5 text-sm">
                    <input
                      id="collectElsewhere"
                      type="checkbox"
                      checked={collectElsewhere}
                      onChange={(event) => setCollectElsewhere(event.target.checked)}
                      className="mt-0.5 h-5 w-5 flex-none"
                    />
                    <span>
                      <strong>Collect the vehicle from a different place</strong>
                      <span className="block text-[13px] text-[#595959]">
                        For example, delivered in Watamu and collected in Nanyuki. Leave this off if we collect it from the
                        delivery address.
                      </span>
                    </span>
                  </label>
                  {collectElsewhere && (
                    <div className="mt-3 rounded-[10px] border border-[#e5e5e5] p-3.5">
                      <div className="text-base font-bold">Where should we collect it from?</div>
                      <p className="mb-3 mt-0.5 text-[13px] text-[#595959]">
                        Search for the collection address, or tap the map to drop a second pin.
                      </p>
                      <PinPicker
                        idPrefix="c"
                        searchLabel="Search for the collection address"
                        placeholder="Collection address, area or landmark"
                        pin={collectPin}
                        onChange={(point, name) => {
                          setCollectPin(point);
                          setCollectAddress(name);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {pin && (
                <div className="mt-3 rounded-[10px] border border-[#e5e5e5] bg-[#f5f5f3] px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
                    <div className="min-w-0">
                      <strong className="break-words">{collecting ? "Delivery: " : ""}{address}</strong>
                      <div className="text-[13px] text-[#595959]">
                        About {straightKm(pin.lat, pin.lng)} km in a straight line from our workshop in Karen
                      </div>
                      {collecting && collectPin && (
                        <>
                          <strong className="mt-2 block break-words">Collection: {collectAddress}</strong>
                          <div className="text-[13px] text-[#595959]">
                            About {straightKm(collectPin.lat, collectPin.lng)} km in a straight line from our workshop in Karen
                          </div>
                        </>
                      )}
                      {collecting && !collectPin && (
                        <div className="mt-2 text-[13px] font-bold text-[#5f4b00]">Drop the collection pin to see the full price.</div>
                      )}
                    </div>
                    {selected && (
                      <div className="text-right">
                        <div className="text-xl font-bold">{deliveryQuote.fee ? ksh(deliveryQuote.fee) : "Free"}</div>
                        <div className="max-w-[320px] text-[13px] text-[#595959]">{deliveryQuote.breakdown}</div>
                      </div>
                    )}
                  </div>
                  {!selected && (
                    <p className="mt-2 text-sm text-[#3f3f3f]">
                      {(() => {
                        const km = straightKm(pin.lat, pin.lng);
                        const backKm = collecting && collectPin ? straightKm(collectPin.lat, collectPin.lng) : km;
                        const trips = delivery === "both" ? 2 : 1;
                        const price = (cat: "saloon" | "suv" | "4x4") =>
                          trips === 2
                            ? deliveryCharge(km, cat, 1).fee + deliveryCharge(backKm, cat, 1).fee
                            : deliveryCharge(km, cat, 1).fee;
                        if (price("4x4") === 0) return "Delivery is free for every vehicle.";
                        return (
                          "Delivery charge: saloon " + ksh(price("saloon")) + " · SUV " + ksh(price("suv")) + " · Prado or 4x4 " +
                          ksh(price("4x4")) +
                          (trips === 2 ? " (delivery and collection)" : "") +
                          ". It is added to the full amount when you book."
                        );
                      })()}
                    </p>
                  )}
                </div>
              )}

              <label htmlFor="lnote" className="mb-1.5 mt-3.5 block text-[13px] text-[#595959]">
                Delivery instructions (optional)
              </label>
              <textarea
                id="lnote"
                rows={2}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Gate B, ask for me at reception, or call when you arrive"
                className={area}
              />

              <p className="mt-2.5 text-xs text-[#595959]">
                Delivery is free within {DELIVERY.freeKm} km of our workshop in Karen, measured in a straight line to your
                pin. Beyond that, each km over {DELIVERY.freeKm} costs {ksh(DELIVERY.perKm.saloon)} for a saloon,{" "}
                {ksh(DELIVERY.perKm.suv)} for an SUV and {ksh(DELIVERY.perKm["4x4"])} for a Prado or 4x4
                {delivery === "both" ? ", for each trip" : ""}.
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
                  <div className="mx-auto mb-[18px] max-w-[620px] text-left">
                    <div className="mb-2 text-center text-sm font-bold">
                      How to pay {ksh(result.total)}
                    </div>
                    <PaymentDetails reference={result.reference} />
                  </div>
                )}
                {pdfData && pdfData.reference === result.reference ? (
                  <div className="mx-auto mb-[18px] max-w-[520px] rounded-lg border-2 border-[#171717] bg-white p-4 text-left">
                    <strong className="block">Your booking PDF</strong>
                    <p className="mt-1 text-[13px] text-[#595959]">
                      Your details, signed agreement, licence photos, dates and costs. Please download and keep it as your
                      confirmation.
                    </p>
                    <button
                      type="button"
                      onClick={async () =>
                        downloadPdf(
                          buildBookingPdf({ ...pdfData, logo: await loadPdfLogo() }),
                          "Chequered-Flag-" + pdfData.reference + ".pdf",
                        )
                      }
                      className={btnDark + " mt-3"}
                    >
                      Download booking PDF
                    </button>
                  </div>
                ) : (
                  <p className="mx-auto mb-[18px] max-w-[520px] text-[13px] text-[#595959]">
                    Your booking PDF is kept on our booking desk. Contact us if you need a copy.
                  </p>
                )}
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
                        placeholder="e.g. QJK3X7AB12"
                        className={roundField}
                      />
                      {mpesaCodeHint(laterCode) && <p className="mt-1 text-[13px] font-bold text-[#7a3e00]">{mpesaCodeHint(laterCode)}</p>}
                    </div>
                    <button type="submit" className={btnLight}>
                      Send code
                    </button>
                  </form>
                )}
                {codeMessage && <p className="mb-4 text-sm text-[#3f3f3f]">{codeMessage}</p>}
                {result.reviewToken && !reviewDismissed && (
                  <div className="mx-auto mb-[18px] max-w-[520px] rounded-lg border border-[#e5e5e5] bg-[#fafaf8] p-4 text-left">
                    <strong className="block">Tell us how it went</strong>
                    <p className="mt-1 text-[13px] text-[#595959]">
                      After your hire we&apos;d love a short review. Keep this link, or come back to this page after your return
                      date and we&apos;ll remind you.
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <a href={reviewUrl(result.reference, result.reviewToken)} className="text-sm font-bold underline">
                        Your review link
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          skipReview(result.reference, result.reviewToken!);
                          setReviewDismissed(true);
                        }}
                        className="text-[13px] font-semibold text-[#595959] underline"
                      >
                        No thanks
                      </button>
                    </div>
                  </div>
                )}
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
                      <div className="mt-4">
                        {usingOnFile ? (
                          <div className="rounded-lg border border-[#81c995] bg-[#eef8f1] p-3.5 text-sm">
                            <strong className="block text-[#0d5a2a]">Welcome back. We have your driving licence on file.</strong>
                            <span className="mt-0.5 block text-[#3f3f3f]">
                              Saved in {onFileSince}, so you don&apos;t need to upload it again. Please bring it to collection,
                              where we check it.
                            </span>
                            <button
                              type="button"
                              onClick={() => setUseOnFile(false)}
                              className="mt-2 text-[13px] font-semibold underline"
                            >
                              Upload a new photo instead
                            </button>
                          </div>
                        ) : (
                          <>
                            <LicencePicker
                              id="licMain"
                              label="Your driving licence (front)"
                              value={mainLicence}
                              onChange={(image) => {
                                setMainLicence(image);
                                if (image && /licence/i.test(formError)) setFormError("");
                              }}
                            />
                            {onFileSince && (
                              <button
                                type="button"
                                onClick={() => setUseOnFile(true)}
                                className="mt-1.5 text-[13px] font-semibold underline"
                              >
                                Use the licence we have on file instead
                              </button>
                            )}
                            <label className="mt-2.5 flex items-start gap-2.5 text-[13px] text-[#3f3f3f]">
                              <input
                                id="keepOnFile"
                                type="checkbox"
                                checked={keepOnFile}
                                onChange={(event) => setKeepOnFile(event.target.checked)}
                                className="mt-0.5 h-[18px] w-[18px] flex-none"
                              />
                              <span>
                                Keep my licence on file for 12 months, so I don&apos;t need to upload it next time I book with
                                this email and mobile number. You can ask us to remove it at any time.
                              </span>
                            </label>
                          </>
                        )}
                      </div>

                      <div className="mt-5">
                        <div className="text-[15px] font-bold">Other drivers</div>
                        <p className="mt-0.5 text-[13px] text-[#595959]">
                          Only drivers named here may drive the vehicle. Add anyone else who might drive it during the hire.
                        </p>
                        {extraDrivers.map((driver, index) => (
                          <div key={index} className="mt-3 rounded-lg border border-[#e5e5e5] bg-white p-3.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <strong className="text-sm">Driver {index + 2}</strong>
                              <button
                                type="button"
                                onClick={() => setExtraDrivers((list) => list.filter((_, i) => i !== index))}
                                className="text-[13px] font-semibold underline"
                              >
                                Remove driver
                              </button>
                            </div>
                            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                              <div>
                                <label htmlFor={"dName" + index} className={label}>
                                  Full name
                                </label>
                                <input
                                  id={"dName" + index}
                                  value={driver.name}
                                  onChange={(event) =>
                                    setExtraDrivers((list) => list.map((d, i) => (i === index ? { ...d, name: event.target.value } : d)))
                                  }
                                  autoComplete="off"
                                  className={field}
                                />
                              </div>
                              <div>
                                <label htmlFor={"dPhone" + index} className={label}>
                                  Mobile number
                                </label>
                                <input
                                  id={"dPhone" + index}
                                  type="tel"
                                  value={driver.phone}
                                  onChange={(event) =>
                                    setExtraDrivers((list) => list.map((d, i) => (i === index ? { ...d, phone: event.target.value } : d)))
                                  }
                                  autoComplete="off"
                                  placeholder="+254"
                                  className={field}
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <LicencePicker
                                id={"dLic" + index}
                                label={"Driver " + (index + 2) + "'s driving licence (front)"}
                                value={driver.licence}
                                onChange={(image) => {
                                  setExtraDrivers((list) => list.map((d, i) => (i === index ? { ...d, licence: image } : d)));
                                  if (image && /licence/i.test(formError)) setFormError("");
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        {extraDrivers.length < MAX_DRIVERS - 1 && (
                          <button
                            type="button"
                            onClick={() => setExtraDrivers((list) => [...list, { name: "", phone: "", licence: null }])}
                            className={btnLight + " mt-3"}
                          >
                            + Add driver
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-[13px] text-[#595959]">
                        Every driver must be at least 25. Please also bring the licences and ID to collection.
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
                        <DamageCoverChoice
                          addon={selected.addon}
                          limit={selectedLimit}
                          days={days}
                          choice={insure}
                          onChoose={(value) => {
                            setInsure(value);
                            if (/damage cover/i.test(formError)) setFormError("");
                          }}
                        />
                      )}

                      {manual ? (
                        <div className="rounded-xl border border-[#e5e5e5] bg-[#f5f5f3] p-4 text-sm leading-relaxed text-[#3f3f3f]">
                          <strong className="mb-1 block text-[15px] text-[#171717]">How a delivery quote works</strong>
                          We will price the delivery and contact you by email, text or WhatsApp with the full amount
                          before you pay. The vehicle is not held until the delivery charge is agreed.
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[#e5e5e5] bg-[#f5f5f3] p-4">
                          <dl className="mb-3 grid gap-1 border-b border-[#dcdcd8] pb-3 text-sm">
                            <div className="flex justify-between gap-3">
                              <dt className="text-[#3f3f3f]">Rental ({days === 1 ? "1 day" : days + " days"})</dt>
                              <dd>{ksh(hireTotal)}</dd>
                            </div>
                            {selected.addon > 0 && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-[#3f3f3f]">Damage cover</dt>
                                <dd className={insure === null ? "text-[#595959]" : ""}>
                                  {insure === null ? "Not chosen yet" : insure ? ksh(insuranceTotal) : "No waiver"}
                                </dd>
                              </div>
                            )}
                            {pricedDelivery > 0 && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-[#3f3f3f]">Delivery and collection</dt>
                                <dd>{ksh(pricedDelivery)}</dd>
                              </div>
                            )}
                            {codeOff > 0 && codeApplied && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-[#3f3f3f]">Discount ({codeApplied.code})</dt>
                                <dd>−{ksh(codeOff)}</dd>
                              </div>
                            )}
                          </dl>
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
                          <div className="mb-3">
                            <PaymentDetails />
                          </div>
                          <dl className="mb-3 grid gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-3 text-[13px]">
                            <div>
                              <dt className="inline font-bold">Damage liability limit: </dt>
                              <dd className="inline">
                                {selectedLimit ? (
                                  <Marked text={ksh(selectedLimit) + "⟦ + VAT⟧ per hire, the most you pay for damage to the vehicle (clause 7)."} />
                                ) : (
                                  "Not set"
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-bold">Cancellation: </dt>
                              <dd className="inline">
                                <Marked text={CANCELLATION_SUMMARY_MARKED} />
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-bold">Mileage: </dt>
                              <dd className="inline">{selected ? mileageFor(selected.category) : ""}</dd>
                            </div>
                          </dl>
                          <p className="text-[13px] text-[#595959]">Nothing is taken on this page.</p>
                          <label htmlFor="mpesa" className={label + " mt-3"}>
                            M-Pesa code (optional, if you have already paid)
                          </label>
                          <input
                            id="mpesa"
                            value={mpesaCode}
                            onChange={(event) => setMpesaCode(event.target.value)}
                            placeholder="e.g. QJK3X7AB12"
                            className={roundField}
                          />
                          {mpesaCodeHint(mpesaCode) && (
                            <p className="mt-1 text-[13px] font-bold text-[#7a3e00]">{mpesaCodeHint(mpesaCode)}</p>
                          )}
                        </div>
                      )}

                      <div className="mt-5">
                        <div className="text-[15px] font-bold">{AGREEMENT_TITLE}</div>
                        <p className="mt-0.5 text-[13px] text-[#595959]">Scroll inside the box to read it all.</p>
                        <div
                          tabIndex={0}
                          role="region"
                          aria-label={AGREEMENT_TITLE}
                          className="mt-2 h-[300px] overflow-y-auto overscroll-contain rounded-lg border border-[#c8c8c8] bg-white text-sm leading-relaxed text-[#3f3f3f] focus:outline focus:outline-2 focus:outline-[#171717]"
                        >
                          {/* Letterhead look: a faint chequered strip down the left and the logo top right, as in the PDF */}
                          <div className="relative min-h-full py-3 pl-9 pr-4">
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 left-0 w-[18px]"
                            style={{ background: "repeating-conic-gradient(#ececea 0 25%, transparent 0 50%) 0 0 / 18px 18px" }}
                          />
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <p className="pt-1 text-base font-bold text-[#171717]">{AGREEMENT_TITLE}</p>
                            <img
                              src="/images/brand/chequered-flag-ltd.jpg"
                              alt="The Chequered Flag Ltd"
                              width={96}
                              height={44}
                              className="h-auto w-[96px] flex-none"
                            />
                          </div>
                          <ReviewKey />
                          {(SHOW_REVIEW_CHANGES ? AGREEMENT_MARKED : AGREEMENT_TEXT).map((paragraph, index) => {
                            const line = agreementLine(paragraph);
                            if (line.kind === "heading") {
                              return (
                                <p key={index} className="mb-1.5 mt-4 font-bold text-[#171717]">
                                  <Marked text={line.text} />
                                </p>
                              );
                            }
                            if (line.kind === "schedule") {
                              return (
                                <dl key={index} className="mb-3 grid gap-px overflow-hidden rounded-md border border-[#e5e5e5] bg-[#e5e5e5] text-[13px]">
                                  {bookingScheduleMarked(scheduleValues()).map(([label, value]) => (
                                    <div key={label} className="grid gap-x-3 bg-white px-3 py-1.5 sm:grid-cols-[190px_minmax(0,1fr)]">
                                      <dt className="text-[#595959]">
                                        <Marked text={label} />
                                      </dt>
                                      <dd className="text-[#171717]">
                                        <Marked text={value} />
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              );
                            }
                            return (
                              <p key={index} className={line.level === 2 ? "mb-1 pl-8" : line.level === 1 ? "mb-2 pl-4" : "mb-2"}>
                                <Marked text={line.text} />
                              </p>
                            );
                          })}
                          <p className="mt-3 text-xs text-[#595959]">Version {AGREEMENT_VERSION}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1 text-[15px] font-bold">Sign the agreement</div>
                        <SignatureBox
                          mode={sigMode}
                          onMode={setSigMode}
                          typedName={sigName}
                          onTypedName={setSigName}
                          onDrawn={(image) => {
                            setSigImage(image);
                            if (image && /signature|sign the hire/i.test(formError)) setFormError("");
                          }}
                        />
                      </div>

                      <div className="mt-3.5 flex items-start gap-2.5">
                        <input
                          id="termsBox"
                          type="checkbox"
                          checked={terms}
                          onChange={(event) => setTerms(event.target.checked)}
                          className="mt-px h-[22px] w-[22px] flex-none"
                        />
                        <label htmlFor="termsBox" className="text-sm leading-normal">
                          I agree to the Rental Terms. I have read and signed the hire agreement, and every driver named on
                          this booking is at least 25 with a valid driving licence.
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
                          disabled={submitting || !selected.available || coverMissing}
                          className={btnDark + " disabled:cursor-not-allowed disabled:bg-[#d6d6d2] disabled:text-[#595959]"}
                        >
                          {submitting
                            ? "Sending…"
                            : manual
                              ? "Send booking request"
                              : "Hold vehicle · " + ksh(total) + " due"}
                        </button>
                        {/* Why the button is grey: the customer hasn't chosen waiver or no waiver yet. */}
                        {coverMissing && (
                          <button
                            type="button"
                            onClick={() => {
                              const cards = document.getElementById("damageCover");
                              cards?.scrollIntoView({ behavior: "smooth", block: "center" });
                              (document.getElementById("coverWaiver") as HTMLInputElement | null)?.focus({ preventScroll: true });
                            }}
                            className="flex min-h-[46px] max-w-[340px] items-center gap-2 rounded-lg border border-[#e6c97a] bg-[#fff8e1] px-3 py-2 text-left text-[13px] font-semibold leading-snug text-[#5f4b00]"
                          >
                            <span aria-hidden="true" className="text-base">↑</span>
                            <span>
                              Tick <strong>Collision damage waiver</strong> or <strong>No waiver</strong> above to continue.
                            </span>
                          </button>
                        )}
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
                    {delivery === "none" ? (
                      <div>Collect from our workshop in Karen</div>
                    ) : (
                      <div>
                        <strong>Delivery:</strong> {DELIVERY_LABELS[delivery]}
                        {address ? " · " + address : ""}
                        {collectPlace && (
                          <span className="block">
                            <strong>Collection:</strong> {collectAddress}
                          </span>
                        )}
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
                        <span>Collision damage waiver, {plural(days)}</span>
                        <span>{ksh(insuranceTotal)}</span>
                      </div>
                    )}
                    {codeOff > 0 && codeApplied && (
                      <div className="text-[#0d5a2a]">
                        <div className="flex justify-between gap-2">
                          <span>Discount ({codeApplied.code})</span>
                          <span className="whitespace-nowrap">− {ksh(codeOff)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCodeApplied(null);
                            setCodeInput("");
                          }}
                          className="-mt-1 block text-[12px] font-semibold text-[#595959] underline"
                        >
                          Remove code
                        </button>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 font-bold">
                      <span>{manual ? "Hire so far" : "Due in full"}</span>
                      <span>{ksh(total)}</span>
                    </div>
                    <div className="text-[13px] text-[#595959]">Nothing is taken on this page.</div>
                    {!codeApplied && (
                      <form
                        className="mt-2.5 border-t border-[#e5e5e5] pt-2.5"
                        onSubmit={(event) => {
                          event.preventDefault();
                          applyCode();
                        }}
                      >
                        <label htmlFor="discountCode" className="mb-1 block text-[13px] text-[#595959]">
                          Have a discount code?
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="discountCode"
                            value={codeInput}
                            onChange={(e) => {
                              setCodeInput(e.target.value.toUpperCase());
                              setCodeError("");
                            }}
                            autoComplete="off"
                            placeholder="Enter code"
                            className="h-10 min-w-0 flex-1 rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm uppercase text-[#171717]"
                          />
                          <button
                            type="submit"
                            disabled={codeBusy}
                            className="h-10 flex-none rounded-lg bg-[#171717] px-4 text-[13px] font-bold uppercase tracking-[1px] text-white disabled:opacity-50"
                          >
                            {codeBusy ? "Checking…" : "Apply"}
                          </button>
                        </div>
                        {codeError && (
                          <p role="alert" className="mt-1.5 text-[13px] font-bold text-[#a50e0e]">
                            {codeError}
                          </p>
                        )}
                      </form>
                    )}
                    {codeApplied && <div className="text-[13px] text-[#0d5a2a]">Code {codeApplied.code}: {codeApplied.label}</div>}
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
            alt={model.name}
            loading="lazy"
            decoding="async"
            className="block h-[118px] w-full object-cover object-[center_60%]"
          />
        </div>
      ) : (
        <div className="grid h-[118px] place-items-center bg-[#ececea] p-2.5 text-center text-[13px] text-[#595959]">
          Photo of {model.name} to be added
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
        <div className="text-xs font-bold uppercase tracking-[1.5px] text-[#595959]">{model.tag}</div>
        <h3 className="text-lg font-bold tracking-[-0.02em]">{model.name}</h3>
        {model.similar && <div className="-mt-1 text-[13px] text-[#595959]">{model.similar}</div>}
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

        {/* No total for the chosen dates here (Homer, Nov 2026): customers found it confusing next to the daily
            price, and many hires are one day. The total shows at checkout. */}

        {damageLimitFor(model.name, model.category) === null ? (
          // No damage liability limit in the hire agreement yet, so this vehicle is booked by phone.
          <div className="mt-auto flex flex-col gap-2">
            <div className="text-[13px] font-bold text-[#3f3f3f]">Book by phone</div>
            <a href={"tel:" + CONTACT.phoneE164.replace(/\s/g, "")} className={btnLight + " min-h-[44px] w-full"}>
              Call {CONTACT.phoneDisplay}
            </a>
          </div>
        ) : model.available ? (
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
