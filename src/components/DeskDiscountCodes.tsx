"use client";

import { useEffect, useState } from "react";
import { ksh } from "../lib/hire";
import type { DiscountCode } from "../lib/db";

// "Discount codes" on the desk, for Homer and James only (lib/access.ts; the server checks too).
// Write a code, choose % or KSh off the hire charge, and share it with the customer, who types it in at checkout.
// Every code works once: as soon as a booking uses it, it can't be used again and it drops off the list below.

const input = "h-10 min-w-0 rounded-lg border border-[#c8c8c8] bg-white px-3 text-sm text-[#171717]";

export default function DeskDiscountCodes() {
  const [codes, setCodes] = useState<DiscountCode[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");

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
    const saved = await post({ code, kind, value });
    if (saved) {
      setNotice("Code " + saved.code + " is ready to share. It works once.");
      setCode("");
      setValue("");
    }
  }

  return (
    <div>
      <form
        className="flex flex-wrap items-end gap-2.5 rounded-[10px] border border-[#e5e5e5] bg-[#fafaf8] p-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <div className="min-w-[160px] flex-[2_1_180px]">
          <label htmlFor="dcCode" className="mb-1 block text-[13px] text-[#595959]">
            Code
          </label>
          <input id="dcCode" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. JAMES10" className={input + " w-full uppercase"} />
        </div>
        <div role="group" aria-label="Discount as" className="flex gap-1">
          {(
            [
              { id: "percent", label: "%" },
              { id: "amount", label: "KSh" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={kind === item.id}
              onClick={() => setKind(item.id)}
              className={
                "h-10 min-w-[48px] rounded-lg border px-3 text-[13px] font-bold " +
                (kind === item.id ? "border-[#171717] bg-[#171717] text-white" : "border-[#c8c8c8] bg-white text-[#171717]")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="w-[130px]">
          <label htmlFor="dcValue" className="mb-1 block text-[13px] text-[#595959]">
            {kind === "percent" ? "Percent off" : "KSh off"}
          </label>
          <input id="dcValue" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "percent" ? "10" : "2000"} className={input + " w-full"} />
        </div>
        <button type="submit" disabled={busy} className="h-10 rounded-lg bg-[#171717] px-4 text-[13px] font-bold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Create code"}
        </button>
      </form>
      <p className="mt-1.5 text-[13px] text-[#595959]">
        Comes off the hire charge (not the damage waiver or delivery). Each code works once, then it disappears from the list.
      </p>
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

      <div className="mt-3.5">
        <strong className="block text-sm">Active codes</strong>
        {!codes && !error && <p className="mt-1 text-sm text-[#595959]">Loading codes…</p>}
        {codes && codes.length === 0 && <p className="mt-1 text-sm text-[#595959]">No active codes. Used codes drop off this list.</p>}
        {codes && codes.length > 0 && (
          <ul className="mt-1.5 grid list-none gap-1.5 p-0">
            {codes.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm">
                <span>
                  <strong className="tracking-[1px]">{c.code}</strong>
                  <span className="text-[#595959]">
                    {" · "}
                    {c.kind === "percent" ? c.value + "% off" : ksh(c.value) + " off"} · made by {c.createdBy}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Remove " + c.code + "? It will stop working.")) post({ code: c.code, active: false });
                  }}
                  className="text-[13px] font-semibold text-[#a50e0e] underline disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
