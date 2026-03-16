"use client";

import { useState } from "react";

const NAV_LINKS = [
  { href: "/workshop", label: "Workshop" },
  { href: "/vehicle-hire", label: "Vehicle Hire" },
  { href: "/fabrication", label: "Fabrication" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 md:gap-12 md:px-8">
        <a href="/" className="flex shrink-0 items-center gap-3">
          {/* Logo box */}
          <div
            className="shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-white"
            style={{ width: 44, height: 44 }}
          >
            <img
              src="/images/logo.png"
              alt="Chequered Flag"
              style={{ width: 44, height: 44, maxWidth: 44, maxHeight: 44, objectFit: "contain" }}
            />
          </div>

          <div className="leading-tight">
            <div className="text-base font-semibold tracking-wide md:text-lg">
              Chequered Flag
            </div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              Established 1975
            </div>
          </div>
        </a>

        {/* Desktop nav – more prominent, bolder links */}
        <nav className="hidden text-sm font-medium md:flex md:items-center md:text-[0.95rem]">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="whitespace-nowrap text-neutral-800 hover:text-neutral-900"
              style={{ marginRight: "1.5rem", padding: "0.5rem 0" }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex flex-col gap-1.5 rounded p-2 md:hidden"
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          <span className="block h-0.5 w-6 bg-neutral-700" />
          <span className="block h-0.5 w-6 bg-neutral-700" />
          <span className="block h-0.5 w-6 bg-neutral-700" />
        </button>
      </div>

      {/* Mobile nav – full-width list, not squashed */}
      {mobileOpen && (
        <div className="border-t border-neutral-200 bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="block py-3 text-neutral-700 hover:text-neutral-900"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
