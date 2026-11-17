"use client";

import { useMemo, useState } from "react";
import { ksh, type StaffBooking } from "../lib/hire";
import { matchPayment, mpesaCodeHint, normaliseCode, parsePayment } from "../lib/payments";

// "Match a payment" on the hire desk: paste the M-Pesa message or a statement line, see the likely bookings,
// and record the payment on the right one. Recording a payment that clears the balance confirms the booking.

const input = "h-10 w-full rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";

export default function DeskMatchPayment({
  bookings,
  onRecorded,
  onOpen,
}: {
  bookings: StaffBooking[];
  onRecorded: (message: string) => void;
  onOpen: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const parsed = useMemo(() => parsePayment(text), [text]);
  const usedCode = normaliseCode(code || parsed.code);
  const usedAmount = Number((amount || (parsed.amount !== null ? String(parsed.amount) : "")).replace(/[,\s]/g, ""));
  const matches = useMemo(
    () => (text.trim() ? matchPayment({ ...parsed, code: usedCode, amount: Number.isFinite(usedAmount) && usedAmount > 0 ? usedAmount : null }, bookings) : []),
    [text, parsed, usedCode, usedAmount, bookings],
  );
  const hint = usedCode && !parsed.reference ? mpesaCodeHint(usedCode) : "";

  function reset() {
    setText("");
    setCode("");
    setAmount("");
    setError("");
  }

  async function record(booking: StaffBooking) {
    setError("");
    if (!(usedAmount > 0)) return setError("Enter the amount received.");
    setBusy(booking.id);
    try {
      const response = await fetch("/api/hire/staff/bookings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, amount: usedAmount, code: usedCode }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The payment could not be recorded.");
      reset();
      onRecorded(
        "Recorded " + ksh(usedAmount) + " on " + booking.reference + ". " +
          (body.status === "confirmed" && body.balance <= 0 ? "Paid in full: the booking is confirmed." : "Still to pay: " + ksh(body.balance) + "."),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "The payment could not be recorded.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mb-4 rounded-[10px] border border-[#e5e5e5] bg-[#fafaf8] p-4">
      <strong className="block text-[15px]">Match a payment</strong>
      <p className="mt-0.5 text-[13px] text-[#595959]">
        Paste the M-Pesa message or a line from the bank statement. The desk reads the code, amount, phone, name and booking
        reference, and shows the bookings it could be for.
      </p>
      <label htmlFor="payText" className="sr-only">
        M-Pesa message or statement line
      </label>
      <textarea
        id="payText"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. QJK3X7AB12 Confirmed. Ksh5,000.00 received from JOHN DOE 0722123456 on 16/11/26 at 10:15 AM"
        className="mt-2 w-full rounded-lg border border-[#c8c8c8] bg-white px-3 py-2 text-sm"
      />
      {text.trim() && (
        <>
          <div className="mt-2.5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            <div>
              <label htmlFor="payCode" className="mb-1 block text-[13px] text-[#595959]">
                M-Pesa code or bank reference
              </label>
              <input id="payCode" value={code || parsed.code} onChange={(e) => setCode(e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="payAmount" className="mb-1 block text-[13px] text-[#595959]">
                Amount received (KSh)
              </label>
              <input
                id="payAmount"
                inputMode="numeric"
                value={amount || (parsed.amount !== null ? String(parsed.amount) : "")}
                onChange={(e) => setAmount(e.target.value)}
                className={input}
              />
            </div>
            <div className="text-[13px] text-[#595959]">
              <div className="mb-1">Also read</div>
              <div className="text-[#171717]">
                {[parsed.name, parsed.phoneKey ? "0" + parsed.phoneKey : "", parsed.reference].filter(Boolean).join(" · ") || "Nothing else"}
              </div>
            </div>
          </div>
          {hint && <p className="mt-1.5 text-[13px] font-bold text-[#7a3e00]">{hint}</p>}

          <div className="mt-3 grid gap-2">
            {matches.length === 0 && (
              <p className="text-sm text-[#595959]">No booking matches yet. Check the amount and code, or search the list below.</p>
            )}
            {matches.map(({ booking, reasons, balance, score }) => (
              <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-2.5">
                <div className="min-w-0 text-sm">
                  <strong>{booking.reference}</strong> · {booking.customerName} · {booking.phone}
                  <span className="block text-[13px] text-[#595959]">
                    {booking.model} · total {ksh(booking.total)} · {balance > 0 ? "balance " + ksh(balance) : "paid in full"}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {reasons.map((reason) => (
                      <span
                        key={reason}
                        className={
                          "rounded-[10px] border px-2 py-0.5 text-xs font-bold " +
                          (score >= 60 ? "border-[#81c995] bg-[#ceead6] text-[#0d5a2a]" : "border-[#dadce0] bg-[#f1f3f4] text-[#3c4043]")
                        }
                      >
                        {reason}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(booking.id)}
                    className="inline-flex min-h-[36px] items-center rounded-lg border border-[#dadce0] bg-white px-3 text-[13px] font-bold"
                  >
                    Open
                  </button>
                  {balance > 0 && (
                    <button
                      type="button"
                      disabled={Boolean(busy) || !(usedAmount > 0) || usedAmount > balance}
                      onClick={() => record(booking)}
                      title={usedAmount > balance ? "More than the balance due" : ""}
                      className="inline-flex min-h-[36px] items-center rounded-lg bg-[#188038] px-3 text-[13px] font-bold text-white disabled:opacity-40"
                    >
                      {busy === booking.id
                        ? "Recording…"
                        : usedAmount >= balance
                          ? "Record " + ksh(usedAmount) + " and confirm"
                          : "Record " + (usedAmount > 0 ? ksh(usedAmount) : "payment") + " (part)"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm font-bold text-[#a50e0e]">
              {error}
            </p>
          )}
          <button type="button" onClick={reset} className="mt-2 text-[13px] font-semibold underline">
            Clear
          </button>
        </>
      )}
    </div>
  );
}
