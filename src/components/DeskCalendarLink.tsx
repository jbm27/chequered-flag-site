"use client";

import { useEffect, useRef, useState } from "react";

// "Google Calendar" beside the booking calendar: the signed-in staff member's private calendar link, so all hire
// bookings show in Google Calendar (or Apple Calendar or Outlook). Google checks the link a few times a day.
// Only some logins have it (lib/access.ts); the server checks that too.

export default function DeskCalendarLink() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  async function load(reset = false) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/hire/staff/calendar-link", { method: reset ? "POST" : "GET", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The calendar link could not be made.");
      setUrl(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The calendar link could not be made.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!url) load();
    const outside = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const area = document.createElement("textarea");
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  }

  // Google Calendar's "add calendar" page, with this link filled in.
  const googleAdd = url ? "https://calendar.google.com/calendar/render?cid=" + encodeURIComponent(url.replace(/^https?:/, "webcal:")) : "";

  return (
    <div ref={box} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-[#dadce0] bg-white px-3.5 text-[13px] font-bold text-[#171717] hover:bg-[#f5f5f3]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Google Calendar
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Calendar link"
          className="absolute left-0 top-[52px] z-40 w-[400px] max-w-[calc(100vw-32px)] rounded-xl border border-[#e5e5e5] bg-white p-4 text-left text-sm shadow-[0_10px_30px_rgba(0,0,0,0.15)] sm:left-auto sm:right-0"
        >
          <div className="flex items-center justify-between">
            <strong className="text-[15px]">See bookings in Google Calendar</strong>
            <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-semibold underline">
              Close
            </button>
          </div>
          <p className="mt-1.5 text-[13px] text-[#595959]">
            Your private link shows every held, paid and quoted booking. Google updates it a few times a day, so a new
            booking can take a few hours to appear. Changes made in Google don&apos;t come back to the desk.
          </p>
          {error && (
            <p role="alert" className="mt-2 font-bold text-[#a50e0e]">
              {error}
            </p>
          )}
          {busy && !url && <p className="mt-2 text-[#595959]">Making your link…</p>}
          {url && (
            <>
              <a
                href={googleAdd}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg bg-[#171717] px-4 text-[13px] font-bold text-white no-underline hover:bg-[#2b2b2b]"
              >
                Add to Google Calendar
              </a>
              <label htmlFor="calLink" className="mb-1 mt-3 block text-[13px] text-[#595959]">
                Or copy the link into Google Calendar (Other calendars → + → From URL), Apple Calendar or Outlook
              </label>
              <div className="flex gap-2">
                <input id="calLink" readOnly value={url} onFocus={(e) => e.target.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-[#c8c8c8] bg-[#fafaf8] px-2 text-xs text-[#171717]" />
                <button type="button" onClick={copy} className="inline-flex h-10 flex-none items-center rounded-lg border border-[#dadce0] bg-white px-3 text-[13px] font-bold">
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
              </div>
              <p className="mt-3 text-xs text-[#595959]">
                Keep this link private: anyone with it can see customer names and phone numbers.{" "}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Make a new link? The old link stops working, so you'll need to add the new one to Google Calendar again.")) load(true);
                  }}
                  className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-[#a50e0e] underline"
                >
                  Make a new link
                </button>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
