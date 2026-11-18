"use client";

import { useEffect, useRef, useState } from "react";
import { ksh } from "../lib/hire";
import type { NewBookingNotice } from "../lib/db";

// The new-bookings bell beside the booking calendar. A red count shows how many bookings were made since this
// staff member last opened it (bookings they added themselves aren't counted). Opening it clears the count;
// the bookings that were new stay marked "New" until it is closed. Checks for new bookings every minute.

const POLL_MS = 60_000;

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

const day = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(value + "T00:00:00Z"));

function ago(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.round(hours / 24);
  return days + (days === 1 ? " day ago" : " days ago");
}

const STATUS: Record<string, string> = { pending: "Held", confirmed: "Paid", quote: "Delivery quote", cancelled: "Closed" };

export default function DeskBell({ onOpenBooking, onNewBookings }: { onOpenBooking: (id: string) => void; onNewBookings: () => void }) {
  const [notices, setNotices] = useState<NewBookingNotice[]>([]);
  const [unseen, setUnseen] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const lastUnseen = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const response = await fetch("/api/hire/staff/notifications", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "New bookings could not be checked.");
      setNotices(body.notices || []);
      setUnseen(body.unseen || 0);
      setError("");
      setNow(Date.now());
      // Something new arrived since the last check: refresh the desk so the booking is on the calendar.
      if ((body.unseen || 0) > lastUnseen.current) onNewBookings();
      lastUnseen.current = body.unseen || 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : "New bookings could not be checked.");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function toggle() {
    if (open) return close();
    setOpen(true);
    setNow(Date.now());
    if (unseen > 0) {
      setUnseen(0);
      lastUnseen.current = 0;
      try {
        await fetch("/api/hire/staff/notifications", { method: "POST" });
      } catch {
        /* the count comes back on the next check if this didn't save */
      }
    }
  }

  function close() {
    setOpen(false);
    // The "New" marks were shown while it was open; now they are read.
    setNotices((list) => list.map((notice) => ({ ...notice, unseen: false })));
  }

  return (
    <div ref={box} className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unseen ? "New bookings: " + unseen + " not seen yet" : "New bookings"}
        className="relative inline-grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-[#dadce0] bg-white text-[#171717] hover:bg-[#f5f5f3]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unseen > 0 && (
          <span className="absolute -right-1 -top-1 inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-white bg-[#d93025] px-1 text-[11px] font-bold leading-none text-white">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="New bookings"
          className="absolute left-0 top-[52px] z-40 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white text-left shadow-[0_10px_30px_rgba(0,0,0,0.15)] sm:left-auto sm:right-0"
        >
          <div className="flex items-center justify-between border-b border-[#eee] px-4 py-3">
            <strong className="text-[15px]">New bookings</strong>
            <button type="button" onClick={close} className="text-[13px] font-semibold underline">
              Close
            </button>
          </div>
          {error && <p className="px-4 py-3 text-sm text-[#a50e0e]">{error}</p>}
          {!error && notices.length === 0 && <p className="px-4 py-5 text-sm text-[#595959]">No bookings yet.</p>}
          <ul className="m-0 max-h-[420px] list-none overflow-y-auto p-0">
            {notices.map((notice) => (
              <li key={notice.id} className="border-b border-[#f0f0f0] last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onOpenBooking(notice.id);
                  }}
                  className={
                    "block w-full cursor-pointer border-0 px-4 py-3 text-left text-[13px] leading-[1.45] hover:bg-[#f7f7f5] " +
                    (notice.unseen ? "bg-[#eef4fd]" : "bg-white")
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-[#171717]">
                      {notice.unseen && (
                        <span className="mr-1.5 inline-block rounded-md bg-[#1a73e8] px-1.5 py-px text-[11px] font-bold text-white">New</span>
                      )}
                      {notice.reference} · {notice.customerName}
                    </strong>
                    <span className="flex-none text-xs text-[#595959]">{ago(notice.createdAt, now)}</span>
                  </span>
                  <span className="block text-[#3f3f3f]">
                    {notice.model} · {day(notice.pickup)} to {day(notice.returnOn)} · {ksh(notice.total)}
                  </span>
                  <span className="block text-xs text-[#595959]">
                    Added {when(notice.createdAt)} · {notice.source === "desk" ? "on the desk by " + (notice.addedBy || "staff") : "on the website"} ·{" "}
                    {STATUS[notice.status] || notice.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
