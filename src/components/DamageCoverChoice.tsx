"use client";

import { ksh } from "../lib/hire";

// "Choose your damage cover" in step 2 of the hire checkout (Homer's mock-up): two cards, the collision damage
// waiver (recommended) or no waiver. The customer must pick one before they can hold the vehicle.
// The wording follows the hire agreement (clause 7): the waiver covers accident or collision damage, but not
// fines, damage to tyres, suspension or transmission from bad driving, or undercarriage damage (always paid in full).

function Tick() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 flex-none text-[#1e7a46]">
      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Warn() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 flex-none text-[#a50e0e]">
      <path d="M10 2.5l8 14.5H2L10 2.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 8v4M10 14.4v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function DamageCoverChoice({
  addon,
  limit,
  days,
  choice,
  onChoose,
}: {
  addon: number; // waiver price a day
  limit: number | null; // damage liability limit for this vehicle, for the whole hire
  days: number;
  choice: boolean | null; // true: waiver, false: no waiver, null: not chosen yet
  onChoose: (insure: boolean) => void;
}) {
  const limitText = limit ? ksh(limit) : "the damage liability limit";
  const card = (on: boolean) =>
    "relative block cursor-pointer rounded-xl border-2 p-4 pt-5 transition-colors " +
    (on ? "border-[#171717] bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]" : "border-[#e5e5e5] bg-[#f5f5f3] hover:border-[#9a9a9a]");

  return (
    <fieldset id="damageCover" className="mb-5 scroll-mt-24">
      <legend className="text-lg font-bold tracking-[-0.01em]">Choose your damage cover</legend>
      <p className="mb-3.5 mt-0.5 text-[13px] text-[#595959]">Pick one option to continue.</p>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className={card(choice === true)}>
          <span className="absolute -top-2.5 left-3.5 rounded-md bg-[#1e7a46] px-2 py-0.5 text-xs font-bold text-white">Recommended</span>
          <span className="flex items-center gap-2.5">
            <input
              type="radio"
              name="damageCover"
              id="coverWaiver"
              checked={choice === true}
              onChange={() => onChoose(true)}
              className="h-5 w-5 flex-none accent-[#171717]"
            />
            <strong className="text-base">Collision damage waiver</strong>
          </span>
          <span className="mt-2 block">
            <strong className="text-2xl tracking-[-0.01em]">{ksh(addon)}</strong> <span className="text-sm text-[#595959]">a day</span>
          </span>
          {days > 0 && <span className="block text-[13px] text-[#595959]">{ksh(addon * days) + " for " + days + (days === 1 ? " day" : " days")}</span>}
          <ul className="mt-2.5 grid gap-1.5 text-sm">
            <li className="flex gap-2">
              <Tick />
              <span>
                Accident or collision damage: <strong>you pay nothing</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <Tick />
              <span>Covers the whole hire, from collection to return</span>
            </li>
          </ul>
          {limit ? (
            <span className="mt-3 block rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px]">
              {ksh(addon)} a day vs up to <strong>{ksh(limit)}</strong> in repairs
            </span>
          ) : null}
          <span className="mt-2.5 block text-xs leading-snug text-[#595959]">
            Not covered: fines, damage to tyres, suspension or transmission from bad driving, and undercarriage damage,
            which is always paid in full.
          </span>
        </label>

        <label className={card(choice === false)}>
          <span className="flex items-center gap-2.5">
            <input
              type="radio"
              name="damageCover"
              id="coverNone"
              checked={choice === false}
              onChange={() => onChoose(false)}
              className="h-5 w-5 flex-none accent-[#171717]"
            />
            <strong className="text-base">No waiver</strong>
          </span>
          <span className="mt-2 block">
            <strong className="text-2xl tracking-[-0.01em]">{ksh(0)}</strong>
          </span>
          <span className="mt-2.5 flex gap-2 text-sm">
            <Warn />
            <span>
              If the vehicle is damaged, you pay the repair costs <strong>up to {limitText}</strong> for the hire.
            </span>
          </span>
          <span className="mt-2.5 block text-xs leading-snug text-[#595959]">Undercarriage damage is always paid in full.</span>
        </label>
      </div>
    </fieldset>
  );
}
