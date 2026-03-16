import { CONTACT } from "../../lib/contact";

export default function ContactPage() {
  const telHref = `tel:${CONTACT.phoneE164}`;
  const waHref = `https://wa.me/${CONTACT.whatsappE164.replace("+","")}`;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        {/* Full-bleed hero using the About hero image */}
        <div className="w-full">
          <img
            src="/images/about/hero.png"
            alt="Chequered Flag workshop and vehicles"
            className="h-[220px] w-full object-cover sm:h-[260px] md:h-[320px] lg:h-[360px]"
          />
        </div>

        <div className="mx-auto max-w-6xl px-5 py-8">
          <a href="/" className="text-sm text-neutral-600 hover:text-neutral-800">
            ← Back to home
          </a>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Contact</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
            For workshop support, vehicle hire enquiries, or engineering work, the fastest way to reach us is by phone or WhatsApp.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href={telHref}
              className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Call
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 p-6">
              <div className="text-sm font-semibold">Phone</div>
              <div className="mt-2 text-sm text-neutral-700">{CONTACT.phoneDisplay}</div>
              <div className="mt-4">
                <a className="text-sm font-medium underline underline-offset-4" href={telHref}>
                  Tap to call
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 p-6">
              <div className="text-sm font-semibold">WhatsApp</div>
              <div className="mt-2 text-sm text-neutral-700">{CONTACT.phoneDisplay}</div>
              <div className="mt-4">
                <a
                  className="text-sm font-medium underline underline-offset-4"
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open WhatsApp chat
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 p-6">
              <div className="text-sm font-semibold">Email</div>
              <div className="mt-2 text-sm text-neutral-700">{CONTACT.email}</div>
              <div className="mt-4">
                <a className="text-sm font-medium underline underline-offset-4" href={`mailto:${CONTACT.email}`}>
                  Send email
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-neutral-200 p-6">
            <div className="text-sm font-semibold">Location</div>
            <div className="mt-2 text-sm text-neutral-700">{CONTACT.locationShort}</div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Chequered+Flag+Nairobi"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center text-sm font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-900"
            >
              View on Google Maps
            </a>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="rounded-xl border border-neutral-200 p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Workshop support</h2>
            <p className="mt-3 max-w-3xl text-neutral-700">
              For quickest assistance, send a WhatsApp with: vehicle model, year (if known), location, and a short description of the problem.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                WhatsApp the workshop
              </a>
              <a
                href={telHref}
                className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
              >
                Call
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

