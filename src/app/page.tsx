export default function Home() {
  return (
    <main>
      <section className="border-b border-neutral-200">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:py-20">
          <div>
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

          {/* Hero Image – strict max size so it never dominates the page */}
          <div
            className="relative min-h-0 overflow-hidden rounded-xl border border-neutral-200"
            style={{ aspectRatio: "3/2", maxHeight: "min(70vh, 420px)" }}
          >
            <img
              src="/images/hero.png"
              alt="Chequered Flag workshop"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        </div>
      </section>
    </main>
  );
}
