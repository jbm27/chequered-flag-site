"use client";

import { useEffect, useRef, useState } from "react";
import { ksh } from "../lib/hire";

// "Pay with M-Pesa" on the booking confirmation: sends the M-Pesa PIN prompt to the customer's phone for the
// booking's balance, then checks every 4 seconds (for up to 2 minutes) until it is paid, failed or cancelled.
// Paid bookings are confirmed by the server. If the customer closes the page, the desk picks the payment up later.
// Hidden when M-Pesa payments aren't set up, so the till and bank details below stay the way to pay.

type Info = { ready: boolean; status: string; mpesaStatus: string; receipt: string; amount: number; testAmount: number | null; phone: string };
type Stage = "idle" | "sending" | "waiting" | "paid" | "failed" | "cancelled" | "timeout";

const POLL_MS = 4000;
const GIVE_UP_MS = 120_000;

const btnDark =
  "inline-flex min-h-[46px] items-center justify-center rounded-lg bg-[#171717] px-5 text-[15px] font-bold text-white disabled:opacity-50";
const btnLight =
  "inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#171717] bg-white px-4 text-sm font-bold";

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/hire/bookings/mpesa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export default function MpesaPay({ reference, email, onPaid }: { reference: string; email: string; onPaid?: (receipt: string) => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [sentTo, setSentTo] = useState("");
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    let live = true;
    post({ action: "info", reference, email }).then(({ ok, data }) => {
      if (!live || !ok) return;
      setInfo(data as Info);
      if (data.mpesaStatus === "paid") {
        setReceipt(data.receipt || "");
        setStage("paid");
      }
      if (!data.phone) setNeedPhone(true);
    });
    return () => {
      live = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [reference, email]);

  if (!info || (!info.ready && stage !== "paid")) return null;

  async function check() {
    const { ok, data } = await post({ action: "check", reference, email });
    if (ok && data.mpesaStatus === "paid") {
      setReceipt(data.receipt || "");
      setStage("paid");
      onPaid?.(data.receipt || "");
      return;
    }
    if (ok && (data.mpesaStatus === "failed" || data.mpesaStatus === "cancelled")) {
      setStage(data.mpesaStatus);
      return;
    }
    if (Date.now() - startedAt.current > GIVE_UP_MS) {
      setStage("timeout");
      return;
    }
    timer.current = window.setTimeout(check, POLL_MS);
  }

  async function pay() {
    setError("");
    setStage("sending");
    const { ok, data } = await post({ action: "start", reference, email, phone });
    if (!ok) {
      if (data.needPhone) setNeedPhone(true);
      setError(data.error || "The payment request could not be sent. Please try again, or pay by till or bank.");
      setStage("idle");
      return;
    }
    setSentTo(data.phone || "");
    startedAt.current = Date.now();
    setStage("waiting");
    timer.current = window.setTimeout(check, POLL_MS);
  }

  const amount = info.amount;

  if (stage === "paid") {
    return (
      <div role="status" className="mx-auto mb-[18px] max-w-[520px] rounded-lg border-2 border-[#1e7a46] bg-[#eef8f1] p-4 text-left">
        <strong className="block text-[17px] text-[#0d5a2a]">Paid by M-Pesa ✓</strong>
        <p className="mt-1 text-sm text-[#2f3f34]">
          {receipt ? (
            <>
              M-Pesa receipt <strong>{receipt}</strong>.{" "}
            </>
          ) : null}
          Your booking {reference} is confirmed. There&apos;s nothing more to pay.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-[18px] max-w-[520px] rounded-lg border-2 border-[#171717] bg-white p-4 text-left">
      <strong className="block text-[17px]">Pay {ksh(amount)} now with M-Pesa</strong>
      {stage === "waiting" || stage === "timeout" ? (
        <div role="status" aria-live="polite">
          <p className="mt-1 text-sm text-[#3f3f3f]">
            We&apos;ve sent a payment request to <strong>{sentTo}</strong>. Check your phone and enter your M-Pesa PIN.
          </p>
          {stage === "waiting" ? (
            <p className="mt-2 text-sm font-bold">Waiting for M-Pesa…</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#3f3f3f]">
                We haven&apos;t heard back from M-Pesa yet. If you&apos;ve paid, we&apos;ll confirm your booking as soon as the
                payment comes through, so there&apos;s no need to pay again.
              </p>
              <button
                type="button"
                onClick={() => {
                  startedAt.current = Date.now() - GIVE_UP_MS + 20_000;
                  setStage("waiting");
                  check();
                }}
                className={btnLight + " mt-2.5"}
              >
                Check again
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-[#3f3f3f]">
            {stage === "failed" || stage === "cancelled" ? (
              <strong className="block text-[#9b1c1c]">
                {stage === "cancelled" ? "The payment was cancelled on the phone." : "The payment didn't go through."} Nothing
                was taken. You can try again.
              </strong>
            ) : null}
            {info.phone && !needPhone ? (
              <>
                We&apos;ll send a payment request to <strong>{info.phone}</strong>. Enter your M-Pesa PIN on your phone to pay.
              </>
            ) : (
              "Enter the M-Pesa number to send the payment request to, then enter your M-Pesa PIN on that phone."
            )}
          </p>
          {(needPhone || !info.phone) && (
            <div className="mt-2.5">
              <label htmlFor="mpesaPhone" className="mb-1 block text-[13px] text-[#595959]">
                M-Pesa number
              </label>
              <input
                id="mpesaPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0712 345 678"
                className="h-11 w-full rounded-lg border border-[#c8c8c8] px-3 text-[15px]"
              />
            </div>
          )}
          <button type="button" onClick={pay} disabled={stage === "sending"} className={btnDark + " mt-3 w-full sm:w-auto"}>
            {stage === "sending" ? "Sending the request…" : "Pay " + ksh(amount) + " with M-Pesa"}
          </button>
          {info.testAmount !== null && (
            <p className="mt-1.5 text-xs font-bold text-[#7a3e00]">Test site: M-Pesa asks for KSh {info.testAmount} instead.</p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-[13px] font-bold text-[#9b1c1c]">
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-[#595959]">Paid by M-Pesa here, your booking is confirmed straight away.</p>
        </>
      )}
    </div>
  );
}
