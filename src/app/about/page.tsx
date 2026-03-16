export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        {/* Full-bleed hero using a close-up of the chequered flag */}
        <div className="w-full">
          <img
            src="/images/about/team.jpg"
            alt="Chequered Flag team"
            className="h-[220px] w-full object-cover sm:h-[260px] md:h-[320px] lg:h-[360px]"
          />
        </div>

        <div className="mx-auto max-w-6xl px-5 py-8">
          <a href="/" className="text-sm text-neutral-600 hover:text-neutral-800">
            ← Back to home
          </a>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Established 1975
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
            Chequered Flag has been operating in Nairobi since 1975 — supporting private drivers,
            commercial fleets, and specialist vehicle operators with practical, accountable automotive work.
          </p>
        </div>
      </header>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Our story
          </h2>

          <p className="mt-6 text-base leading-relaxed text-neutral-700">
            Chequered Flag began as a mechanical workshop in Nairobi at a time when vehicles were simpler,
            repairs were hands-on, and reputation mattered.
          </p>

          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Over five decades, the business has evolved — but the fundamentals have not changed.
            We diagnose methodically, repair properly, and stand behind our work.
          </p>

          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Many of our clients return year after year. Some have done so for decades.
            That continuity is not accidental — it is the result of consistent workmanship and clear accountability.
          </p>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            What defines us
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Card
              title="Longevity"
              body="Operating in Nairobi since 1975. Our reputation is built over time, not through advertising."
            />
            <Card
              title="Practical skill"
              body="Hands-on mechanical experience, in-house fabrication capability, and real diagnostic discipline."
            />
            <Card
              title="Accountability"
              body="We take responsibility for our work — from inspection to final handover."
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Today
          </h2>

          <p className="mt-6 max-w-4xl text-base leading-relaxed text-neutral-700">
            Today, Chequered Flag operates a mechanical workshop, a self-drive vehicle fleet,
            and a fabrication facility — allowing us to repair, maintain, build, and supply vehicles
            under one roof.
          </p>

          <p className="mt-4 max-w-4xl text-base leading-relaxed text-neutral-700">
            Whether servicing a private vehicle, supporting a commercial fleet, or fabricating
            specialist components, the approach remains the same: clear diagnosis, careful work,
            and long-term reliability.
          </p>

          <div className="mt-10 rounded-xl border border-neutral-200 p-6 md:p-8">
            <p className="text-lg font-medium text-neutral-900">
              We are not the newest workshop in Nairobi.
            </p>
            <p className="mt-2 text-base text-neutral-700">
              We are one of the longest standing.
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
