import type { Metadata } from "next";
import DeferredVideo from "../../components/DeferredVideo";
import { CONTACT } from "../../lib/contact";

export const metadata: Metadata = {
  title: "Natural Fibre Research & Development | Chequered Flag",
  description:
    "Engineering-led natural fibre extraction: pineapple decortication, Mananasi Fibre, and circular bioeconomy innovation in East Africa.",
};

const SMEP_PROJECT_URL = "https://smepprogramme.org/project/the-chequered-flag/";
const DEL_MONTE_ACQUISITION_URL =
  "https://www.capitalfm.co.ke/business/2025/05/del-monte-kenya-to-add-value-to-pineapple-waste-with-new-entity/";

const IMPACT_STATS = [
  { value: "90+", label: "Jobs created at peak operation" },
  { value: "2,700+", label: "Tonnes of pineapple leaves processed" },
  { value: "40+", label: "Tonnes of export-grade fibre produced" },
  { value: "4+", label: "International export markets" },
  { value: "$1M+", label: "Grant-backed development aid raised" },
];

const INNOVATIONS = [
  "Automatic conveyor-fed leaf handling",
  "Improved operator safety and reduced fatigue",
  "Consistent feed rates and fibre cleanliness",
  "Higher throughput than traditional hand-fed machines",
  "Suitability for industrial-scale continuous operation",
];

const FACILITY_STAGES = [
  {
    title: "Harvesting",
    body: "Operational systems for collecting and transporting pineapple leaves from active plantation areas.",
    image: "/images/natural-fibre/harvesting-leaves.jpeg",
    alt: "Worker harvesting pineapple leaves in the plantation",
  },
  {
    title: "Decortication",
    body: "Industrial-scale automatic machinery developed by The Chequered Flag for fibre extraction from leaf biomass.",
    image: "/images/natural-fibre/decorticator-conveyor.jpg",
    alt: "Workers feeding pineapple leaves into Decorticator 2 on a conveyor belt",
  },
  {
    title: "Drying",
    body: "Large-scale natural drying infrastructure for moisture reduction and fibre stabilisation before refinement.",
    image: "/images/natural-fibre/drying-lines.jpg",
    alt: "Rows of pineapple fibre drying on outdoor racks at the facility",
  },
  {
    title: "Brushing & refinement",
    body: "Mechanical brushing to improve fibre cleanliness, consistency, and appearance for textile markets.",
    image: "/images/natural-fibre/fibre-brushing.jpg",
    alt: "Workers processing brushed pineapple fibre at the facility",
  },
  {
    title: "Baling & export",
    body: "Compression and packaging systems for international logistics and export-grade natural fibre markets.",
    image: "/images/natural-fibre/baling-export-bales.jpg",
    alt: "Wrapped bales of pineapple fibre loaded in a shipping container for export",
  },
];

const EXPORT_MARKETS = [
  "Vietnam (Nextevo & EcoFa)",
  "Taiwan (EcoPalf & UKL)",
  "Spain (Ananas Anam)",
  "China",
];

const OTHER_FEEDSTOCKS = [
  "Water hyacinth",
  "Sansevieria",
  "Stinging nettle",
  "Other agricultural and invasive biomass streams",
];

const CORE_THEMES = [
  "Agricultural waste valorisation",
  "Climate-resilient manufacturing",
  "Circular economy systems",
  "Natural fibre innovation",
  "Rural industrialisation",
  "Export-oriented manufacturing",
  "Engineering-led sustainability",
  "Scalable biomass processing",
  "Nature-positive industrial development",
  "African industrial innovation",
];

const GALLERY_IMAGES = [
  {
    src: "/images/natural-fibre/plantation-panorama.jpg",
    alt: "Panoramic view of the Mananasi Fibre processing facility on Del Monte plantation",
  },
  {
    src: "/images/natural-fibre/leaf-harvest.jpg",
    alt: "Harvested pineapple leaf waste awaiting processing",
  },
  {
    src: "/images/natural-fibre/fibre-drying-rack.jpg",
    alt: "Worker beside outdoor pineapple fibre drying racks",
  },
  {
    src: "/images/natural-fibre/processed-fibre.jpg",
    alt: "Clean processed pineapple fibre ready for further handling",
  },
  {
    src: "/images/natural-fibre/hero-export-bales.jpg",
    alt: "Wrapped bales of pineapple fibre loaded in a shipping container",
  },
  {
    src: "/images/natural-fibre/team-at-facility.jpg",
    alt: "Project team at the fibre processing facility",
  },
  {
    src: "/images/natural-fibre/decorticator-detail.jpg",
    alt: "Close-up of decortication machinery in operation",
  },
];

export default function NaturalFibrePage() {
  const mailtoHref = `mailto:${CONTACT.email}?subject=Natural%20fibre%20development%20enquiry`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="w-full">
          <img
            src="/images/natural-fibre/facility-overview.jpg"
            alt="Outdoor fibre drying lines and processing facility at Mananasi Fibre"
            className="h-[280px] w-full object-cover sm:h-[340px] md:h-[400px] lg:h-[460px]"
          />
        </div>

        <div className="mx-auto max-w-6xl px-6 md:px-8 py-8">
          <a href="/" className="text-sm text-neutral-600 hover:text-neutral-800">
            ← Back to home
          </a>

          <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-neutral-500">
            NATURAL FIBRE · RESEARCH & DEVELOPMENT
          </p>

          <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
            Engineering agricultural waste into export-grade natural fibre
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-neutral-700">
            For more than a decade, The Chequered Flag has combined practical engineering, fabrication,
            and industrial problem-solving to develop technologies that transform agricultural waste into
            commercially valuable natural fibres — culminating in one of East Africa&apos;s most advanced
            pineapple fibre extraction operations.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href={mailtoHref}
              className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Enquire about partnerships
            </a>
            <a
              href={SMEP_PROJECT_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:border-neutral-400"
            >
              SMEP project profile
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-10">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {IMPACT_STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="text-2xl font-semibold tracking-tight md:text-3xl">{stat.value}</div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Beyond automotive engineering
              </h2>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                While The Chequered Flag is widely known in Kenya for automotive engineering and
                fabrication, the company has also developed significant expertise in agricultural
                processing machinery and industrial systems development.
              </p>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                The journey began through research and development within the sisal industry, focusing
                on the challenges of extracting high-quality natural fibres efficiently and safely at
                industrial scale. Existing technologies across many natural fibre sectors were
                characterised by low throughput, dangerous operation, inconsistent quality, and extreme
                labour intensity.
              </p>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                As global interest in sustainable fibres and circular bioeconomy solutions grew, The
                Chequered Flag recognised the untapped potential in agricultural waste streams —
                particularly pineapple leaves, which are normally left to rot or burned after harvest.
              </p>
            </div>

            <img
              src="/images/natural-fibre/field-decortication.jpg"
              alt="Mobile decortication unit operating in a pineapple field in Kenya"
              className="w-full rounded-xl border border-neutral-200 object-cover aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Engineering automatic fibre extraction
              </h2>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                Through extensive prototyping and iterative development, The Chequered Flag designed and
                built an automatic conveyor-fed decortication system — transforming pineapple fibre
                extraction from a cottage-industry process into industrial-scale manufacturing.
              </p>
              <p className="mt-4 text-sm font-medium text-neutral-900">Key innovations</p>
              <ul className="mt-3 space-y-2">
                {INNOVATIONS.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-neutral-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <img
              src="/images/natural-fibre/decorticator-conveyor.jpg"
              alt="Automatic conveyor-fed decortication system in operation"
              className="w-full rounded-xl border border-neutral-200 object-cover aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Fibre extraction in action
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-700">
            Field and facility footage from pineapple leaf decortication and fibre processing
            operations in Kenya.
          </p>

          <div className="mx-auto mt-8 max-w-4xl">
            <DeferredVideo
              src="/images/natural-fibre/fibre-extraction-in-action.mp4"
              title="Pineapple leaf fibre extraction"
              poster="/images/natural-fibre/decorticator-conveyor.jpg"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="w-full">
          <img
            src="/images/natural-fibre/plantation-panorama.jpg"
            alt="Mananasi Fibre processing facility on Del Monte plantation"
            className="h-[220px] w-full object-cover object-center sm:h-[280px] md:h-[340px] lg:h-[400px]"
          />
        </div>

        <div className="mx-auto max-w-6xl px-6 md:px-8 py-10 md:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Mananasi Fibre Ltd
              </h2>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                The success of early machinery development led directly to the formation of Mananasi
                Fibre Ltd — established to address the enormous post-harvest waste challenge of
                commercial pineapple production.
              </p>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                Working in partnership with Del Monte Kenya, Mananasi Fibre established a pilot
                industrial fibre extraction operation on Del Monte&apos;s approximately 4,000-hectare
                pineapple plantation in Thika, Kenya. At estates of this scale, burning leaf biomass can
                represent tens of thousands of tonnes annually — a disposal problem that became the
                basis for export-oriented manufacturing.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-neutral-700">
                {[
                  "Agricultural waste valorisation",
                  "Circular economy and rural industrialisation",
                  "Export-oriented natural fibre manufacturing",
                  "Climate-resilient processing systems",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="rounded-xl border border-neutral-200 bg-white p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-neutral-500">
                PROGRAMME PARTNER
              </p>
              <img
                src="/images/natural-fibre/smep-logo.jpg"
                alt="SMEP Programme logo"
                className="mt-4 h-24 w-auto object-contain"
              />
              <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                The Mananasi Fibre pilot was supported through the UK-funded Sustainable Manufacturing
                and Environmental Pollution (SMEP) programme, demonstrating technical and commercial
                feasibility of industrial pineapple fibre extraction in East Africa.
              </p>
              <a
                href={SMEP_PROJECT_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-600"
              >
                Read the full SMEP project profile →
              </a>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            A complete processing facility
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
            Through the SMEP programme, The Chequered Flag and Mananasi Fibre developed a fully
            operational facility — the complete chain required to transform agricultural waste into
            export-grade natural fibre using locally developed engineering capability.
          </p>

          <figure className="mt-10 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
            <figcaption className="sr-only">
              Mananasi Fibre process flow: pineapple farming to fruit, fibre for textiles, and pulp
              for silage and animal feed
            </figcaption>
            <p className="text-xs font-semibold tracking-[0.18em] text-neutral-500">
              PROCESS OVERVIEW
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">
              From plantation waste to fibre and silage
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-700">
              After fruit harvest, pineapple leaves are collected and decorticated. The extracted fibre
              is refined for textile markets; the pulp is ensiled as a stable livestock feed — replacing
              leaf burning with circular, export-oriented manufacturing.
            </p>
            <img
              src="/images/natural-fibre/process-flow.jpg"
              alt="Mananasi Fibre process diagram: leaf harvest and decortication branch to refined fibre for textiles and pulp for ensiling as animal feed, with benefits for farmers, employment, food security, and environmental protection"
              className="mt-6 w-full rounded-lg"
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className="mt-10 space-y-8">
            {FACILITY_STAGES.map((stage, index) => (
              <FacilityStage key={stage.title} stage={stage} reverse={index % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-neutral-900 text-white">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Commercial validation
          </h2>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="max-w-3xl text-base leading-relaxed text-neutral-300">
                The successful demonstration of technology and business model ultimately led to the
                acquisition of Mananasi Fibre by Del Monte Kenya — validating both the technical
                capability of the extraction technology and the commercial viability of industrial
                natural fibre production from agricultural waste.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-300">
                Agricultural waste previously treated as a disposal problem became the foundation for a
                scalable manufacturing and export industry — with fibre consignments shipped
                internationally and supplementary product streams including compost, silage, and rope
                developed through the pilot.
              </p>
            </div>

            <a
              href={DEL_MONTE_ACQUISITION_URL}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 flex-col items-center rounded-xl border border-neutral-700 bg-white p-6 transition-colors hover:border-neutral-500 lg:w-56"
            >
              <img
                src="/images/natural-fibre/del-monte-shield.png"
                alt="Del Monte Kenya"
                className="h-28 w-auto object-contain sm:h-32"
              />
              <span className="mt-4 text-center text-sm font-medium leading-snug text-neutral-900">
                Read about Del Monte&apos;s acquisition of Mananasi Fibre
              </span>
              <span className="mt-2 text-center text-xs text-neutral-500">Capital FM · May 2025</span>
            </a>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-neutral-400">
              EXPORT MARKETS REACHED
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {EXPORT_MARKETS.map((market) => (
                <li
                  key={market}
                  className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200"
                >
                  {market}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Impact achieved</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
            The project demonstrated that agricultural waste could become the basis for scalable
            manufacturing and export — while creating rural employment, developing local engineering
            expertise, and raising awareness of natural fibre opportunities across East Africa.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Card
              title="Employment & skills"
              body="More than 90 stable jobs created, with machinery designed and fabricated by young local artisans employed by the project."
            />
            <Card
              title="Environmental benefit"
              body="Intercepting leaf biomass before burning reduces pollutants, carbon emissions, and soil damage — replacing disposal with valorisation."
            />
            <Card
              title="Export manufacturing"
              body="Operational industrial fibre extraction capability established in Kenya, with export-grade fibre production demonstrated at scale."
            />
            <Card
              title="Circular products"
              body="Beyond textile fibre: compost, silage, rope, and biochar trials extended the circular value of pineapple processing waste."
            />
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Facility & operations gallery
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-700">
            Selected imagery from engineering development, plantation operations, and export
            preparation at the Mananasi Fibre facility in Thika.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GALLERY_IMAGES.map((image) => (
              <figure
                key={image.src}
                className="group overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Looking forward</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
            The technology developed through the Mananasi Fibre project has applications far beyond
            pineapple leaves. Many agricultural and invasive biomass streams contain valuable fibres
            but remain underutilised across Africa — not for lack of raw material, but because
            scalable extraction and processing equipment has rarely been available locally.
          </p>

          <div className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6 md:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-neutral-500">
              PRIORITY FEEDSTOCK
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight md:text-2xl">
              Banana pseudostem fibre in Kenya and East Africa
            </h3>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
              Kenya and the wider East African region are among the world&apos;s most important banana-producing
              areas. Every harvest generates enormous volumes of pseudostem — the thick, fibrous stalk
              left in the field after fruit is cut. Today, most of this material is left to rot or
              cleared with little economic return, despite containing strong, versatile natural fibre
              suitable for textiles, rope, composites, and industrial applications.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
              The opportunity is significant at both national and continental scale. Across Africa,
              banana cultivation supports millions of smallholders and commercial estates alike, yet
              fibre valorisation remains largely untapped. Where processing does exist, it is often
              manual, low-capacity, and difficult to scale — the same constraints The Chequered Flag
              addressed in pineapple through automatic, conveyor-fed decortication and integrated
              downstream handling.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
              During the Mananasi Fibre pilot, pineapple plant stem and banana stem decortication were
              successfully tested using the same core technology — and industrial banana stem
              decortication machines are now being developed on the back of that work. The Chequered
              Flag intends to build on this foundation by designing and fabricating dedicated fibre
              extraction and processing equipment for banana pseudostem: from field collection and
              feed systems through decortication, drying, brushing, and preparation for textile or
              industrial markets.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700">
              Our goal is to leverage more than a decade of engineering, fabrication, and pilot-scale
              operations experience to help realise the full potential of banana fibre in Kenya and
              across Africa — creating rural employment, reducing waste, and establishing locally built
              processing capability that can compete in regional and export markets. We are actively
              seeking partners and investment to accelerate this next phase of development.
            </p>

            <figure className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
              <figcaption className="sr-only">
                Banana stem processing solution: stem harvest and decortication produce fibre for
                textiles and pulp for silage and animal feed
              </figcaption>
              <p className="text-xs font-semibold tracking-[0.18em] text-neutral-500">
                OUR SOLUTION
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-700">
                Banana pseudostem follows the same valorisation model proven with pineapple leaves:
                after fruit goes to market, stems are harvested, decorticated, and split into export-grade
                fibre for textiles and ensiled pulp for livestock feed — generating farmer income, local
                employment, food security, and foreign exchange from fibre exports.
              </p>
              <img
                src="/images/natural-fibre/banana-process.jpg"
                alt="Banana stem processing diagram: farming and fruit harvest, stem transport and decortication, fibre refined for textiles, pulp ensiled for animal feed, with benefits for agricultural resilience, local employment, food security, sustainable fibre, and export earnings"
                className="mt-6 w-full rounded-md"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>

          <h3 className="mt-10 text-lg font-semibold tracking-tight">
            Additional feedstocks under exploration
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-700">
            Beyond banana, the same technology platform is being evaluated for other underutilised
            biomass streams — with a long-term vision of decentralised fibre processing systems
            converting waste into textile fibres, industrial materials, livestock feed, and circular
            economy manufacturing opportunities.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {OTHER_FEEDSTOCKS.map((feedstock) => (
              <span
                key={feedstock}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700"
              >
                {feedstock}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {CORE_THEMES.map((theme) => (
              <span
                key={theme}
                className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-14">
          <div className="rounded-xl border border-neutral-200 p-6 md:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-neutral-500">
              FOR INVESTORS & PARTNERS
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight md:text-2xl">
              Discuss natural fibre development
            </h2>
            <p className="mt-3 max-w-3xl text-neutral-700">
              This page summarises engineering-led natural fibre work separate from our automotive
              workshop and vehicle hire operations. For background materials, partnership discussions,
              or investment enquiries, please get in touch.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href={mailtoHref}
                className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Email us
              </a>
              <a
                href={SMEP_PROJECT_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-neutral-400"
              >
                SMEP project profile
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FacilityStage({
  stage,
  reverse,
}: {
  stage: (typeof FACILITY_STAGES)[number];
  reverse: boolean;
}) {
  return (
    <article
      className={`grid overflow-hidden rounded-xl border border-neutral-200 bg-white md:grid-cols-2 md:items-center ${
        reverse ? "md:[&>div:first-child]:order-2" : ""
      }`}
    >
      <div className="aspect-[4/3] w-full overflow-hidden md:aspect-auto md:min-h-[260px] md:max-h-[320px]">
        <img
          src={stage.image}
          alt={stage.alt}
          className="h-full w-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-col justify-center p-6 md:p-8">
        <h3 className="text-lg font-semibold">{stage.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700">{stage.body}</p>
      </div>
    </article>
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
