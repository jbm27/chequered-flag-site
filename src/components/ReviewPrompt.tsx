"use client";

import { useEffect, useState } from "react";
import { todayNairobi } from "../lib/hire";

// Review prompts on the hire page. The booking reference and its review link key are kept in this browser
// when a customer books, so we can ask how it went when they come back after the return date.
// Customers can say "Not now" (asked again in 3 days) or "Don't ask again" (recorded as skipped).

const LIST = "cf_review_prompts";
type Saved = { ref: string; t: string; returnOn: string; model: string };

function read(): Saved[] {
  try {
    const list = JSON.parse(localStorage.getItem(LIST) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function rememberForReview(entry: Saved) {
  try {
    const list = read().filter((item) => item.ref !== entry.ref);
    list.push(entry);
    localStorage.setItem(LIST, JSON.stringify(list.slice(-10)));
  } catch {
    /* prompts are a convenience only */
  }
}

export function reviewUrl(ref: string, t: string) {
  return "/review?ref=" + encodeURIComponent(ref) + "&t=" + encodeURIComponent(t);
}

export async function skipReview(ref: string, t: string) {
  try {
    localStorage.setItem("cf_review_" + ref, "skipped");
  } catch {
    /* ignore */
  }
  try {
    await fetch("/api/hire/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, t, action: "skip" }),
    });
  } catch {
    /* the prompt is hidden either way */
  }
}

function state(ref: string) {
  try {
    return localStorage.getItem("cf_review_" + ref) || "";
  } catch {
    return "";
  }
}

// Shown at the top of the booking area after a customer's hire has ended.
export default function ReviewPrompt() {
  const [due, setDue] = useState<Saved | null>(null);

  useEffect(() => {
    const today = todayNairobi();
    const found = read()
      .filter((item) => item.returnOn && item.returnOn <= today)
      .filter((item) => {
        const s = state(item.ref);
        if (s === "skipped" || s === "done") return false;
        if (s.startsWith("later:") && s.slice(6) > today) return false;
        return true;
      })
      .sort((a, b) => b.returnOn.localeCompare(a.returnOn))[0];
    setDue(found || null);
  }, []);

  if (!due) return null;

  function later() {
    if (!due) return;
    const until = new Date(Date.parse(todayNairobi() + "T00:00:00Z") + 3 * 864e5).toISOString().slice(0, 10);
    try {
      localStorage.setItem("cf_review_" + due.ref, "later:" + until);
    } catch {
      /* ignore */
    }
    setDue(null);
  }

  return (
    <div role="region" aria-label="Review your hire" className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[#d9d1b8] bg-[#fffaf0] px-5 py-4">
      <div className="min-w-0">
        <strong className="block text-[16px]">How was your {due.model} hire?</strong>
        <span className="text-sm text-[#3f3f3f]">A short review helps us and other customers. It takes a minute.</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={reviewUrl(due.ref, due.t)}
          className="inline-flex min-h-[42px] items-center rounded-lg bg-[#171717] px-4 text-[13px] font-bold uppercase tracking-[1px] text-white"
        >
          Leave a review
        </a>
        <button type="button" onClick={later} className="inline-flex min-h-[42px] items-center rounded-lg border border-[#171717] bg-white px-4 text-[13px] font-bold">
          Not now
        </button>
        <button
          type="button"
          onClick={() => {
            skipReview(due.ref, due.t);
            setDue(null);
          }}
          className="text-[13px] font-semibold underline"
        >
          Don&apos;t ask again
        </button>
      </div>
    </div>
  );
}
