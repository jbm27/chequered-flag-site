import { CONTACT } from "../../lib/contact";

export default function WorkshopPage() {
  const telHref = `tel:${CONTACT.phoneE164}`;
  const waHref = `https://wa.me/${CONTACT.whatsappE164.replace("+", "")}`;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        {/* Full-bleed hero image */}
        <div className="w-full">
          <img
            src="/images/workshop/hero.jpeg"
            alt="Chequered Flag workshop with vehicles in service bays"
            className="h-[240px] w-full object-cover sm:h-[300px] md:h-[360px] lg:h-[400px]"
          />
        </div>

        {/* Text and actions below hero, constrained to content width */}
        <div className="mx-auto max-w-6xl px-5 py-8">
          <a href="/" className="text-sm text-neutral-600 hover:text-neutral-800">
            ← Back to home
          </a>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">
            Workshop services
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
            Reliable mechanical repair and maintenance for private vehicles, commercial fleets, and specialist applications —
            delivered with an engineering-led approach and clear accountability.
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
              href="#services"
              className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
            >
              View service areas
            </a>
          </div>
        </div>
      </header>

      <section id="services" className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Service areas</h2>
          <p className="mt-3 max-w-3xl text-neutral-700">
            A practical list of the work we handle day-to-day. If you have something unusual, we’re happy to discuss it.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Card
              title="Diagnostics & fault finding"
              body="Structured diagnostics for electrical, drivability, warning lights, sensors, and intermittent issues — to fix the cause, not just the symptom."
            />
            <Card
              title="Servicing & preventative maintenance"
              body="Routine servicing, inspections, fluids, filters, cooling system care, and preventative work to reduce breakdowns and extend vehicle life."
            />
            <Card
              title="Brakes, suspension & steering"
              body="Brake performance and stability, suspension wear, bushings, steering components, wheel-end issues, and roadworthiness checks."
            />
            <Card
              title="Engine, drivetrain & leaks"
              body="Noise and vibration diagnosis, driveline issues, mounts, seals, gaskets, and practical repair strategies for older vehicles."
            />
            <Card
              title="Electrical & charging systems"
              body="Starting/charging faults, wiring issues, accessory fitment, lighting, battery draw tests, and reliable electrical repairs."
            />
            <Card
              title="4x4, towing & heavy-use vehicles"
              body="Work suited to older 4x4s and vehicles in hard service — practical fixes, robust parts choices, and repeatable maintenance."
            />
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How we work</h2>
          <p className="mt-3 max-w-3xl text-neutral-700">
            Clear process. Clear approvals. Clear handover.
          </p>

          <ol className="mt-8 grid gap-5 md:grid-cols-5">
            <Step n="1" title="Inspect" body="We assess the vehicle and confirm the problem and constraints." />
            <Step n="2" title="Quote" body="We propose a repair plan with parts and labour." />
            <Step n="3" title="Approve" body="Work proceeds only after approval — no surprises." />
            <Step n="4" title="Update" body="We keep you informed if anything changes." />
            <Step n="5" title="Handover" body="We test, verify, and return the vehicle with clarity." />
          </ol>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Why Chequered Flag</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Card
              title="Established and accountable"
              body="Operating in Nairobi since 1975. We value repeat customers and long-term trust."
            />
            <Card
              title="Engineering-led mindset"
              body="We diagnose methodically and focus on reliability, safety, and real-world performance."
            />
            <Card
              title="In-house capability"
              body="Workshop, fleet, and engineering support under one roof — practical solutions, not guesswork."
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="rounded-xl border border-neutral-200 p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Need workshop help?</h2>
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
              <a
                href="/contact"
                className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
              >
                Contact details
              </a>
            </div>
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
