import { CONTACT } from "../../lib/contact";

export default function PilotPage() {
  const waHref = `https://wa.me/${CONTACT.whatsappE164.replace("+", "")}`;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <a href="/" className="text-sm text-neutral-600 hover:text-neutral-800">
            ← Back to home
          </a>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Pilot programmes
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
            From time to time we run small, invitation-only trials with trusted customers and partner organisations.
            These pilots are limited by design.
          </p>
        </div>
      </header>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                CarClub (limited trial)
              </h2>

              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                CarClub is a small trial of telemetry-enabled vehicle access and self-drive bookings,
                starting with a single vehicle and a short list of trusted users.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <Card
                  title="Who it’s for"
                  body="Schools, professionals, and organisations we already know — or trusted introductions."
                />
                <Card
                  title="What it includes"
                  body="Account-based access, booking management, and controlled vehicle access during the pilot."
                />
                <Card
                  title="What it is not"
                  body="A public launch or open marketplace. We are validating reliability first."
                />
                <Card
                  title="Availability"
                  body="Limited capacity. Access is approved case-by-case."
                />
              </div>
            </div>

            <aside className="rounded-xl border border-neutral-200 p-6">
              <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">
                REQUEST ACCESS
              </div>

              <h3 className="mt-3 text-base font-semibold">Interested in participating?</h3>

              <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                Send a WhatsApp message with your name, organisation, and intended use. We’ll confirm whether
                pilot access is available.
              </p>

              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full justify-center rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                WhatsApp pilot request
              </a>

              <p className="mt-4 text-xs text-neutral-500">
                (Pilot access is limited. Not all requests can be approved.)
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="rounded-xl border border-neutral-200 p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Why pilots are small
            </h2>

            <p className="mt-3 max-w-4xl text-neutral-700">
              We scale responsibly. Before expanding access, we validate reliability, safety, and operational support —
              with real users and real conditions.
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
