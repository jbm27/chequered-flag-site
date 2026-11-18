"use client";

import { useEffect, useState } from "react";
import { PROVIDERS, deviceOf, openInProvider, openMailApp, type Device, type Mail, type Provider } from "../lib/emailLinks";

// "Which email do you use?" on the workshop enquiry form. On a phone each choice opens that provider's app
// (or its website if the app isn't installed); on a laptop it opens the provider's website. "Email app" uses the
// device's own mail app, and if none opens, points the customer to the websites instead.

const choice =
  "flex min-h-[52px] w-full cursor-pointer flex-col items-start justify-center rounded-lg border border-[#c8c8c8] bg-white px-3.5 py-2 text-left hover:border-[#171717] hover:bg-[#fafaf8]";

export default function EmailChooser({ mail, onOpened, onCancel }: { mail: Mail; onOpened: () => void; onCancel?: () => void }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [noApp, setNoApp] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDevice(deviceOf(navigator.userAgent, navigator.maxTouchPoints || 0));
  }, []);

  const phone = device !== "desktop";

  function pick(provider: Provider) {
    setNoApp(false);
    openInProvider(provider, mail, device);
    onOpened();
  }

  function ownApp() {
    setNoApp(false);
    setWaiting(true);
    openMailApp(
      mail,
      () => {
        setWaiting(false);
        setNoApp(true);
      },
      () => {
        setWaiting(false);
        onOpened();
      },
    );
  }

  async function copy() {
    const text = "To: " + mail.to + "\nSubject: " + mail.subject + "\n\n" + mail.body;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 4000);
  }

  return (
    <div id="emailChooser" className="mt-3.5 rounded-xl border border-[#e5e5e5] bg-[#f5f5f3] p-4 text-left">
      <strong className="block text-[15px]">Which email do you use?</strong>
      <p className="mt-0.5 text-[13px] text-[#595959]">
        {phone
          ? "We'll open your email app with your message ready. If the app isn't on your phone, its website opens instead."
          : "We'll open your email in a new tab with your message ready. Press send there to reach us."}
      </p>

      {noApp && (
        <p role="alert" className="mt-2.5 rounded-lg border border-[#e6c97a] bg-[#fff8e1] px-3 py-2 text-[13px] font-semibold text-[#5f4b00]">
          No email app opened on this {phone ? "phone" : "computer"}. Choose your email below, or copy the message and
          send it to {mail.to}.
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {PROVIDERS.map((item) => (
          <button key={item.id} type="button" onClick={() => pick(item.id)} className={choice}>
            <span className="text-sm font-bold text-[#171717]">{item.label}</span>
            <span className="text-xs text-[#595959]">{item.hint}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={ownApp} disabled={waiting} className={choice + " disabled:cursor-wait disabled:opacity-60"}>
          <span className="text-sm font-bold text-[#171717]">{waiting ? "Opening your email app…" : phone ? "My phone's email app" : "Email app on this computer"}</span>
          <span className="text-xs text-[#595959]">{phone ? "Mail, Samsung Email or another app" : "For example Outlook, Apple Mail or Thunderbird"}</span>
        </button>
        <button type="button" onClick={copy} className={choice}>
          <span className="text-sm font-bold text-[#171717]">{copied ? "Copied ✓" : "Copy the message"}</span>
          <span className="text-xs text-[#595959]">Paste it into any email to {mail.to}</span>
        </button>
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-2.5 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold underline">
          Back
        </button>
      )}
    </div>
  );
}
