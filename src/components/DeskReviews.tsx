"use client";

import { useEffect, useState } from "react";
import { CONTACT } from "../lib/contact";

// Desk: customer reviews (bottom section), and the "Ask for a review" button on a booking card.

type Review = {
  bookingId: string;
  reference: string;
  customerName: string;
  phone: string;
  model: string;
  pickup: string;
  returnOn: string;
  status: "pending" | "approved" | "hidden" | "requested" | "skipped";
  rating: number | null;
  comment: string;
  displayName: string;
  submittedAt: string;
  decidedBy: string;
};

const TABS = [
  { id: "pending", label: "Waiting for approval" },
  { id: "approved", label: "Shown on the website" },
  { id: "hidden", label: "Hidden" },
  { id: "all", label: "All" },
] as const;

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={n + " out of 5 stars"} className="whitespace-nowrap text-[18px] leading-none">
      <span className="text-[#e8a300]">{"★".repeat(n)}</span>
      <span className="text-[#d6d6d1]">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function when(iso: string) {
  return iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })
    : "";
}

export default function DeskReviews({ onOpenBooking, onCount }: { onOpenBooking: (id: string) => void; onCount?: (n: number) => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pending");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/hire/staff/reviews", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Reviews could not be loaded.");
      setReviews(body.reviews || []);
      setCounts(body.counts || {});
      onCount?.((body.reviews || []).filter((r: Review) => r.status === "pending").length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reviews could not be loaded.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(review: Review, action: "approve" | "hide") {
    setBusy(review.bookingId);
    setError("");
    try {
      const response = await fetch("/api/hire/staff/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.bookingId, action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The review could not be updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The review could not be updated.");
    } finally {
      setBusy("");
    }
  }

  const rated = reviews.filter((r) => r.rating);
  const average = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0;
  const shown = reviews.filter((r) => tab === "all" || r.status === tab);
  const n = (id: string) => (id === "all" ? reviews.length : reviews.filter((r) => r.status === id).length);

  return (
    <div>
      <div className="mb-3.5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <div className="rounded-[10px] bg-[#f5f5f3] px-4 py-3">
          <div className="text-[13px] text-[#595959]">Average rating</div>
          <div className="mt-0.5 flex items-center gap-2 text-[22px] font-bold">
            {rated.length ? average.toFixed(1) : "–"} {rated.length > 0 && <Stars n={Math.round(average)} />}
          </div>
          <div className="text-xs text-[#595959]">From {rated.length} review{rated.length === 1 ? "" : "s"}</div>
        </div>
        <div className="rounded-[10px] bg-[#f5f5f3] px-4 py-3">
          <div className="text-[13px] text-[#595959]">Waiting for approval</div>
          <div className="mt-0.5 text-[22px] font-bold">{n("pending")}</div>
          <div className="text-xs text-[#595959]">Approve to show on the hire page</div>
        </div>
        <div className="rounded-[10px] bg-[#f5f5f3] px-4 py-3">
          <div className="text-[13px] text-[#595959]">Asked, not answered</div>
          <div className="mt-0.5 text-[22px] font-bold">{counts.requested || 0}</div>
          <div className="text-xs text-[#595959]">{counts.skipped || 0} chose to skip</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
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
            {item.label} ({n(item.id)})
          </button>
        ))}
      </div>
      {error && <p className="mb-2 text-sm font-bold text-[#a50e0e]">{error}</p>}
      {shown.length === 0 ? (
        <p className="rounded-lg bg-[#f5f5f3] px-4 py-3 text-sm text-[#595959]">
          {tab === "pending" ? "No reviews waiting. New reviews appear here for you to approve." : "No reviews here yet."}
        </p>
      ) : (
        <ul className="grid min-w-0 grid-cols-1 gap-2.5">
          {shown.map((review) => (
            <li key={review.bookingId} className="min-w-0 rounded-[10px] border border-[#e5e5e5] bg-white px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars n={review.rating || 0} />
                    <strong>{review.displayName || review.customerName}</strong>
                    <span
                      className={
                        "rounded-[10px] border px-2 py-0.5 text-xs font-bold " +
                        (review.status === "approved"
                          ? "border-[#81c995] bg-[#ceead6] text-[#0d5a2a]"
                          : review.status === "hidden"
                            ? "border-[#dadce0] bg-[#e8eaed] text-[#3c4043]"
                            : "border-[#f9d46b] bg-[#feefc3] text-[#5f4400]")
                      }
                    >
                      {review.status === "approved" ? "Shown on website" : review.status === "hidden" ? "Hidden" : "Waiting for approval"}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[15px] text-[#171717]">
                    {review.comment || <span className="text-[#595959]">No comment, rating only.</span>}
                  </p>
                  <p className="mt-1.5 text-xs text-[#595959]">
                    {review.customerName} · {review.model} · {when(review.submittedAt)} ·{" "}
                    <button type="button" onClick={() => onOpenBooking(review.bookingId)} className="underline">
                      {review.reference}
                    </button>
                    {review.decidedBy ? " · " + (review.status === "approved" ? "approved" : "hidden") + " by " + review.decidedBy : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.status !== "approved" && (
                    <button
                      type="button"
                      disabled={busy === review.bookingId}
                      onClick={() => decide(review, "approve")}
                      className="inline-flex min-h-[36px] items-center rounded-lg bg-[#188038] px-3 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {review.status !== "hidden" && (
                    <button
                      type="button"
                      disabled={busy === review.bookingId}
                      onClick={() => decide(review, "hide")}
                      className="inline-flex min-h-[36px] items-center rounded-lg border border-[#dadce0] bg-white px-3 text-[13px] font-bold disabled:opacity-50"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-[#595959]">
        Approved reviews show on the hire page with the customer&apos;s chosen name. Google reviews can only be posted by the
        customer on their own Google account; everyone who reviews here is offered the Google link once it is set up.
      </p>
    </div>
  );
}

// On a booking card: make the customer's review link and send it on WhatsApp (staff send it themselves).
export function AskForReview({ bookingId, name, phone, model }: { bookingId: string; name: string; phone: string; model: string }) {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function get() {
    setError("");
    try {
      const response = await fetch("/api/hire/staff/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, action: "link" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The review link could not be made.");
      setLink(window.location.origin + body.path);
      setStatus(body.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The review link could not be made.");
    }
  }

  const first = name.trim().split(/\s+/)[0] || "";
  const message =
    "Hi " + first + ", thank you for hiring the " + model + " from The Chequered Flag. We'd love to hear how it went. " +
    "It takes a minute: " + link;
  const wa = "https://wa.me/" + phone.replace(/\D/g, "").replace(/^0/, "254") + "?text=" + encodeURIComponent(message);

  if (!link) {
    return (
      <div>
        <button type="button" onClick={get} className="inline-flex min-h-[36px] items-center rounded-lg border border-[#dadce0] bg-white px-3 text-[13px] font-bold">
          Ask for a review
        </button>
        {error && <span className="ml-2 text-xs font-bold text-[#a50e0e]">{error}</span>}
      </div>
    );
  }
  return (
    <div className="grid gap-1.5 text-[13px]">
      {status === "pending" || status === "approved" || status === "hidden" ? (
        <span className="font-bold text-[#0d5a2a]">This customer has already left a review.</span>
      ) : status === "skipped" ? (
        <span className="font-bold text-[#5f4400]">This customer chose to skip the review. Only ask again if they offer.</span>
      ) : null}
      <span className="break-all text-[#595959]">{link}</span>
      <span className="flex flex-wrap gap-2">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center rounded-lg bg-[#188038] px-3 font-bold text-white">
          Send on WhatsApp
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className="inline-flex min-h-[36px] items-center rounded-lg border border-[#dadce0] bg-white px-3 font-bold"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </span>
      <span className="text-xs text-[#595959]">Sent from your own WhatsApp. The website does not message customers ({CONTACT.phoneDisplay}).</span>
    </div>
  );
}
