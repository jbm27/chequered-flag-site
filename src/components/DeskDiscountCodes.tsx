"use client";

import { useEffect, useState } from "react";
import { ksh } from "../lib/hire";
import type { DiscountCode } from "../lib/db";

// "Discount codes" on the desk: staff make a code to give a customer (a percentage or KSh off the hire charge),
// optionally limited to a number of uses or an expiry date. The customer types it in at checkout on the hire
// page. Turning a code off stops it working at once. Bookings that used a code show it in their Discount row.

const input = "h-10 w-full min-w-0 rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";

function day(value: string) {
  return value ? new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00Z")) : "";
}

export default function DeskDiscountCodes() {
  const [codes, setCodes] = useState<DiscountCode[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresOn, setExpiresOn] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/hire/staff/discount-codes", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The discount codes could not be loaded.");
      setCodes(body.codes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The discount codes could not be loaded.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function post(payload: Record<string, unknown>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/hire/staff/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The code could not be saved.");
      await load();
      return body.code as DiscountCode;
    } catch (err) {
      setError(err instanceof Error ? err.message : "The code could not be saved.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const saved = await post({ code, kind, value, note, maxUses, expiresOn });
    if (saved) {
      setNotice("Code " + saved.code + " is ready. Give it to the customer to type in at checkout.");
      setCode("");
      setValue("");
      setNote("");
      setMaxUses("1");
      setExpiresOn("");
    }
  }

  return (
    <div>
      <div className="rounded-[10px] border border-[#e5e5e5] bg-[#fafaf8] p-4">
        <strong className="block text-[15px]">Make a discount code</strong>
        <p className="mt-0.5 text-[13px] text-[#595959]">
          The customer types the code in at checkout on the hire page. It comes off the hire charge (not the damage waiver
          or delivery).
        </p>
        <div role="group" aria-label="Discount as" className="mt-2.5 flex gap-1.5">
          {(
            [
              { id: "percent", label: "Percentage" },
              { id: "amount", label: "KSh amount" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={kind === item.id}
              onClick={() => setKind(item.id)}
              className={
                "min-h-[34px] rounded-full border px-3 text-[13px] font-semibold " +
                (kind === item.id ? "border-[#171717] bg-[#171717] text-white" : "border-[#c8c8c8] bg-white text-[#171717]")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-2.5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          <div>
            <label htmlFor="dcCode" className="mb-1 block text-[13px] text-[#595959]">
              Code
            </label>
            <input id="dcCode" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. JAMES10" className={input + " uppercase"} />
          </div>
          <div>
            <label htmlFor="dcValue" className="mb-1 block text-[13px] text-[#595959]">
              {kind === "percent" ? "Percent off" : "KSh off"}
            </label>
            <input id="dcValue" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "percent" ? "e.g. 10" : "e.g. 2000"} className={input} />
          </div>
          <div>
            <label htmlFor="dcUses" className="mb-1 block text-[13px] text-[#595959]">
              Times it can be used (blank = no limit)
            </label>
            <input id="dcUses" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="dcExpiry" className="mb-1 block text-[13px] text-[#595959]">
              Last day it works (optional)
            </label>
            <input id="dcExpiry" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="dcNote" className="mb-1 block text-[13px] text-[#595959]">
              Note (who it's for, optional)
            </label>
            <input id="dcNote" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Returning customer" className={input} />
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm font-bold text-[#a50e0e]">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-2 text-sm font-bold text-[#0d5a2a]">
            {notice}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={create}
          className="mt-3 inline-flex min-h-[38px] items-center rounded-lg bg-[#171717] px-4 text-[13px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Make code"}
        </button>
      </div>

      <div className="mt-4">
        {!codes && !error && <p className="text-sm text-[#595959]">Loading codes…</p>}
        {codes && codes.length === 0 && <p className="text-sm text-[#595959]">No discount codes yet.</p>}
        {codes && codes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5] text-[13px] text-[#595959]">
                  <th className="py-2 pr-3 font-semibold">Code</th>
                  <th className="py-2 pr-3 font-semibold">Discount</th>
                  <th className="py-2 pr-3 font-semibold">Used</th>
                  <th className="py-2 pr-3 font-semibold">Last day</th>
                  <th className="py-2 pr-3 font-semibold">Note</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = Boolean(c.expiresOn) && c.expiresOn < new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
                  const usedUp = c.maxUses !== null && c.uses >= c.maxUses;
                  const status = !c.active ? "Turned off" : expired ? "Expired" : usedUp ? "Used up" : "Working";
                  return (
                    <tr key={c.code} className="border-b border-[#f0f0f0] align-top">
                      <td className="py-2 pr-3 font-bold tracking-[1px]">{c.code}</td>
                      <td className="py-2 pr-3">{c.kind === "percent" ? c.value + "% off" : ksh(c.value) + " off"}</td>
                      <td className="py-2 pr-3">
                        {c.uses}
                        {c.maxUses !== null ? " of " + c.maxUses : ""}
                      </td>
                      <td className="py-2 pr-3">{c.expiresOn ? day(c.expiresOn) : "No expiry"}</td>
                      <td className="py-2 pr-3 text-[#595959]">
                        {c.note}
                        <span className="block text-xs">by {c.createdBy}</span>
                      </td>
                      <td className="py-2">
                        <span className={"font-bold " + (status === "Working" ? "text-[#0d5a2a]" : "text-[#595959]")}>{status}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => post({ code: c.code, active: !c.active })}
                          className="ml-2 text-[13px] font-semibold underline"
                        >
                          {c.active ? "Turn off" : "Turn on"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
