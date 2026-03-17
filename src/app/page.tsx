export default function Home() {
  return (
    <main>
      <section className="border-b border-neutral-200">
        {/* Full-bleed hero image */}
        <div className="w-full">
          <img
            src="/images/HERO.jpg"
            alt="Chequered Flag workshop vehicles"
            className="h-[260px] w-full object-cover sm:h-[300px] md:h-[360px] lg:h-[420px]"
          />
        </div>

        {/* Intro content below hero */}
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-neutral-500">
              NAIROBI · AUTOMOTIVE · FABRICATION
            </p>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              Engineering vehicles. Supporting mobility. Since 1975.
            </h1>

            <p className="mt-3 text-lg font-medium text-neutral-700">
              Follow the flag.
            </p>

            <p className="mt-6 text-base leading-relaxed text-neutral-700">
              Chequered Flag is a Nairobi-based automotive business specialising in vehicle repairs,
              vehicle hire, and in-house fabrication for private and commercial clients.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="/workshop"
                className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Workshop Services
              </a>
              <a
                href="/vehicle-hire"
                className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:border-neutral-400"
              >
                Vehicle Hire
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
