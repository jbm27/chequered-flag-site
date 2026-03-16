import { CONTACT } from "../../lib/contact";

export default function VehicleHirePage() {
  const telHref = `tel:${CONTACT.phoneE164}`;
  const waHref = `https://wa.me/${CONTACT.whatsappE164.replace("+", "")}`;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        {/* Full-bleed hero image */}
        <div className="w-full">
          <img
            src="/images/vehicle-hire/Hero.png"
            alt="Chequered Flag self-drive vehicles outside the workshop"
            className="h-[240px] w-full object-cover sm:h-[300px] md:h-[360px] lg:h-[400px]"
          />
        </div>

        {/* Text and actions below hero, constrained to content width */}
        <div className="mx-auto max-w-6xl px-5 py-8">
          <a href="/" className="text-sm text-neutral-600 hover:text-neutral-800">
            ← Back to home
          </a>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">
            Vehicle hire
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
            A small, well-maintained self-drive fleet for private and organisational use — operated
            and supported by our in-house workshop. Typical vehicles include Land Cruiser game
            viewers, Toyota Prados, Nissan X-Trails, and practical saloon cars.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
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
            <a
              href="#how"
              className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
            >
              How it works
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            What we offer
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Card
              title="Self-drive hire"
              body="Reliable vehicles for personal and professional use — supported by our workshop and maintained to a consistent standard."
            />
            <Card
              title="Organisations & long hires"
              body="Options for schools, NGOs, and businesses needing predictable access. We prefer repeat, trusted customers."
            />
            <Card
              title="Workshop-backed fleet"
              body="Because we maintain vehicles in-house, we control servicing, condition, and readiness — reducing surprises."
            />
          </div>
        </div>
      </section>

      <section id="how" className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How hire works</h2>
          <p className="mt-3 max-w-3xl text-neutral-700">
            Straightforward process, clear handover, and reliable support.
          </p>

          <ol className="mt-8 grid gap-5 md:grid-cols-4">
            <Step n="1" title="Enquire" body="Call or WhatsApp with dates, location, and vehicle type needed." />
            <Step n="2" title="Confirm" body="We confirm availability, terms, and required documentation." />
            <Step n="3" title="Handover" body="Clear condition check and handover. You drive." />
            <Step n="4" title="Support" body="If anything arises, you have direct support from our team." />
          </ol>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            What we need from you
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Card
              title="Driver details"
              body="Your name, contact, and driving licence details (and any organisational paperwork if relevant)."
            />
            <Card
              title="Hire details"
              body="Dates and times, where the vehicle will be used, and any specific requirements (e.g. upcountry, towing, etc.)."
            />
            <Card
              title="Deposit & terms"
              body="We’ll confirm deposit and terms for the specific hire. We prefer clarity upfront to keep things smooth."
            />
          </div>

        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="rounded-xl border border-neutral-200 p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Need a vehicle?</h2>
            <p className="mt-3 max-w-3xl text-neutral-700">
              WhatsApp us your dates, destination (Nairobi / upcountry), and preferred vehicle type. We’ll respond with options.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                WhatsApp vehicle hire
              </a>
              <a
                href={telHref}
                className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
              >
                Call
              </a>
              <a
                href="/contact"
                className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
              >
                Contact details
              </a>
            </div>
          </div>

          {/* Discreet CarClub section */}
          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6 md:p-8">
            <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">
              CARCLUB · LIMITED TRIAL
            </div>

            <h3 className="mt-3 text-base font-semibold text-neutral-900">
              Interested in self-drive access without the usual handover?
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-700">
              We’re running a small trial with a short list of trusted users. Access is limited by design while we validate reliability and support.
            </p>

            <div className="mt-5 flex flex-wrap gap-4">
              <a
                href="/pilot"
                className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
              >
                View CarClub trial
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                WhatsApp for access
              </a>
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              (Not a public launch. Access approved case-by-case.)
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-neutral-700">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-5">
      <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">STEP {n}</div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-neutral-700">{body}</div>
    </div>
  );
}
