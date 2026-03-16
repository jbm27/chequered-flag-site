export default function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-neutral-600">
        <div className="grid gap-8 md:grid-cols-4 md:items-start md:gap-12">
          {/* Company */}
          <div>
            <div className="font-semibold text-neutral-900">Chequered Flag Ltd</div>
            <div className="mt-1">Established 1975</div>

            <div className="mt-4 inline-block rounded-md border border-neutral-200 bg-white px-2 py-1">
              <img
                src="/images/logo.png"
                alt="Chequered Flag logo"
                className="w-full object-contain"
                style={{ width: 160, height: "auto", maxWidth: 160 }}
              />
            </div>
          </div>

          {/* Navigation */}
          <div>
            <div className="space-y-1">
              <p>
                <a className="hover:text-neutral-800" href="/workshop">
                  Workshop
                </a>
              </p>
              <p>
                <a className="hover:text-neutral-800" href="/vehicle-hire">
                  Vehicle Hire
                </a>
              </p>
              <p>
                <a className="hover:text-neutral-800" href="/fabrication">
                  Fabrication
                </a>
              </p>
              <p>
                <a className="hover:text-neutral-800" href="/about">
                  About
                </a>
              </p>
              <p>
                <a className="hover:text-neutral-800" href="/contact">
                  Contact
                </a>
              </p>
            </div>
          </div>

          {/* Workshop location */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Workshop location
            </div>
            <div className="mt-1 text-sm text-neutral-700">
              Ngong Road, Karen, Nairobi
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Chequered+Flag+Ngong+Road+Karen+Nairobi"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-neutral-800 hover:text-neutral-900"
            >
              <span>View on Google Maps</span>
            </a>
          </div>

          {/* Hours */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Hours of operation
            </div>
            <div className="mt-1 text-sm">
              <div>Mon–Fri: 8:00am – 5:00pm</div>
              <div>Sat: 8:00am – 1:00pm</div>
              <div>Sun & public holidays: Closed</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


