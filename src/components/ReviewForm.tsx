"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CONTACT, GOOGLE_REVIEW_URL } from "../lib/contact";

// The customer's review page: star rating, comment and the name to show, or skip.
// Reached from their private review link (/review?ref=CF-…&t=…).

type Info = {
  reference: string;
  model: string;
  pickup: string;
  returnOn: string;
  suggestedName: string;
  status: "requested" | "skipped" | "pending" | "approved" | "hidden";
  started: boolean;
  rating: number | null;
  comment: string;
  displayName: string;
};

const btnDark =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-lg border-0 bg-[#171717] px-[22px] text-[13px] font-bold uppercase tracking-[1px] text-white hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-50";
const btnLight =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-lg border border-[#171717] bg-white px-5 text-[13px] font-bold text-[#171717] hover:bg-[#f5f5f3]";

function day(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const labels = ["Poor", "Fair", "Good", "Very good", "Excellent"];
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] text-[#595959]">Your rating</legend>
      <div className="flex flex-wrap items-center gap-1" role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" title={labels[n - 1]}>
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <span
              aria-hidden="true"
              className={
                "block px-0.5 text-[36px] leading-none transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#171717] " +
                (n <= value ? "text-[#e8a300]" : "text-[#d6d6d1]")
              }
            >
              ★
            </span>
            <span className="sr-only">
              {n} star{n === 1 ? "" : "s"}, {labels[n - 1]}
            </span>
          </label>
        ))}
        <span className="ml-2 text-sm font-semibold text-[#3f3f3f]">{value ? labels[value - 1] : ""}</span>
      </div>
    </fieldset>
  );
}

export default function ReviewForm() {
  const params = useSearchParams();
  const ref = params.get("ref") || "";
  const token = params.get("t") || "";
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "sent" | "skipped">("");

  useEffect(() => {
    if (!ref || !token) {
      setError("This review link is incomplete. Please use the link we sent you, or contact us.");
      return;
    }
    fetch("/api/hire/review?ref=" + encodeURIComponent(ref) + "&t=" + encodeURIComponent(token), { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "This review link is not valid.");
        setInfo(body as Info);
        setName((body as Info).displayName || (body as Info).suggestedName);
        if ((body as Info).rating) setRating((body as Info).rating!);
        if ((body as Info).comment) setComment((body as Info).comment);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "This review link is not valid."));
  }, [ref, token]);

  async function send(action: "submit" | "skip") {
    setError("");
    if (action === "submit" && !rating) return setError("Choose a star rating from 1 to 5.");
    setBusy(true);
    try {
      const response = await fetch("/api/hire/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, t: token, action, rating, comment, displayName: name }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The review could not be sent.");
      setDone(action === "skip" ? "skipped" : "sent");
      try {
        localStorage.setItem("cf_review_" + ref, action === "skip" ? "skipped" : "done");
      } catch {
        /* the review is saved either way */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The review could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const heading = <h1 className="text-[clamp(28px,5vw,40px)] font-bold leading-tight tracking-[-0.02em]">How was your hire?</h1>;

  if (done === "skipped") {
    return (
      <div className="grid gap-3">
        {heading}
        <p className="text-[15px] text-[#3f3f3f]">No problem. We won&apos;t ask again for this booking. Thank you for hiring with us.</p>
      </div>
    );
  }
  if (done === "sent" || (info && (info.status === "approved" || info.status === "hidden"))) {
    return (
      <div className="grid gap-4">
        {heading}
        <p className="text-[15px] text-[#3f3f3f]">
          Thank you for your review. It helps us and other customers. We read every review, and may show it on our website.
        </p>
        {GOOGLE_REVIEW_URL && (
          <div className="rounded-xl border border-[#e5e5e5] bg-[#f5f5f3] p-4">
            <strong className="block">Would you also post it on Google?</strong>
            <p className="mt-1 text-sm text-[#595959]">It takes a minute and helps other people find us. You can copy what you wrote above.</p>
            <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className={btnDark + " mt-3"}>
              Post on Google
            </a>
          </div>
        )}
      </div>
    );
  }
  if (error && !info) {
    return (
      <div className="grid gap-3">
        {heading}
        <p role="alert" className="text-[15px] text-[#9b1c1c]">
          {error}
        </p>
        <p className="text-sm text-[#595959]">
          You can also call or WhatsApp us on {CONTACT.phoneDisplay}.
        </p>
      </div>
    );
  }
  if (!info) return <p className="text-sm text-[#595959]">Loading…</p>;

  return (
    <div className="grid gap-5">
      <div>
        {heading}
        <p className="mt-2 text-[15px] text-[#3f3f3f]">
          {info.model} · {day(info.pickup)} to {day(info.returnOn)} · booking {info.reference}
        </p>
      </div>
      {!info.started ? (
        <p className="rounded-lg bg-[#f5f5f3] px-4 py-3 text-sm text-[#3f3f3f]">
          You can leave a review once your hire has started on {day(info.pickup)}. Keep this link and come back after your trip.
        </p>
      ) : (
        <>
          <StarRating value={rating} onChange={setRating} />
          <div>
            <label htmlFor="reviewText" className="mb-1.5 block text-[13px] text-[#595959]">
              Tell us about your hire (optional)
            </label>
            <textarea
              id="reviewText"
              rows={5}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="The vehicle, the handover, anything we could do better"
              className="w-full rounded-lg border border-[#c8c8c8] bg-white px-3 py-2.5 text-[15px]"
            />
          </div>
          <div className="max-w-[320px]">
            <label htmlFor="reviewName" className="mb-1.5 block text-[13px] text-[#595959]">
              Name to show with your review
            </label>
            <input
              id="reviewName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="h-[46px] w-full rounded-lg border border-[#c8c8c8] bg-white px-3 text-[15px]"
            />
          </div>
          <p className="text-[13px] text-[#595959]">
            We may show your rating, comment and this name on our website. We never show your phone number, email or booking
            details.
          </p>
          {info.status === "pending" && (
            <p className="text-[13px] font-bold text-[#3f3f3f]">You have already sent a review. Sending again updates it.</p>
          )}
          {error && (
            <p role="alert" className="text-sm font-bold text-[#9b1c1c]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => send("submit")} className={btnDark}>
              {busy ? "Sending…" : "Send review"}
            </button>
            {info.status !== "pending" && (
              <button type="button" disabled={busy} onClick={() => send("skip")} className={btnLight}>
                Skip, I&apos;d rather not
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
