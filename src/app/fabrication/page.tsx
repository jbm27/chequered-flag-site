import { CONTACT } from "../../lib/contact";

const GALLERY_IMAGES = [
  {
    src: "/images/fabrication/GameViewerHero.JPG",
    alt: "Game viewer vehicle with roof hatch in workshop",
  },
  { src: "/images/fabrication/GameViewer.jpg", alt: "Game viewer vehicle on the road" },
  {
    src: "/images/fabrication/BodyFabricationInProgress.jpg",
    alt: "Body fabrication work in progress on a Land Cruiser",
  },
  {
    src: "/images/fabrication/CruiserBodyFabricated.jpg",
    alt: "Completed fabricated body on a Land Cruiser",
  },
  {
    src: "/images/fabrication/FabricationInProgress.jpg",
    alt: "Chassis and structural fabrication in progress",
  },
  {
    src: "/images/fabrication/FabricationTrailer.jpg",
    alt: "Custom fabricated trailer in the workshop",
  },
  {
    src: "/images/fabrication/RoofHatch80Series.jpg",
    alt: "Roof hatch on an 80 Series Land Cruiser",
  },
  {
    src: "/images/fabrication/RoofHatchPrado.jpg",
    alt: "Roof hatch installed on a Prado",
  },
  {
    src: "/images/fabrication/RoofHatchVX.jpg",
    alt: "Roof hatch on VX model with open position",
  },
  {
    src: "/images/fabrication/RoofHatchVX_2.jpg",
    alt: "Roof hatch on VX model from another angle",
  },
  {
    src: "/images/fabrication/RoofHatchInProgress.jpg",
    alt: "Roof hatch fabrication in progress",
  },
  {
    src: "/images/fabrication/CustomProjects.jpg",
    alt: "Selection of custom fabrication projects",
  },
  {
    src: "/images/fabrication/Canvas.jpeg",
    alt: "Canvas work and soft trim for safari vehicle",
  },
  {
    src: "/images/fabrication/Laser.jpeg",
    alt: "Laser-cut metal components for fabrication",
  },
  {
    src: "/images/fabrication/Grinder.jpeg",
    alt: "Grinding and finishing work on fabricated parts",
  },
  {
    src: "/images/fabrication/Welding.jpeg",
    alt: "Welding detail during chassis work",
  },
  {
    src: "/images/fabrication/Welding2.jpeg",
    alt: "Welding on structural components in the workshop",
  },
  {
    src: "/images/fabrication/Woodwork.jpeg",
    alt: "Woodwork and interior finishing for custom builds",
  },
];

export default function FabricationPage() {
  const telHref = `tel:${CONTACT.phoneE164}`;
  const waHref = `https://wa.me/${CONTACT.whatsappE164.replace("+", "")}`;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        {/* Full-bleed hero image */}
        <div className="w-full">
          <img
            src="/images/fabrication/GameViewerHero.JPG"
            alt="Game viewer vehicle with roof hatch in workshop"
            className="h-[260px] w-full object-cover sm:h-[320px] md:h-[380px] lg:h-[420px]"
          />
        </div>

        {/* Text and actions constrained to content width below the image */}
        <div className="mx-auto max-w-6xl px-5 py-8">
          <a href="/" className="text-sm text-neutral-600 hover:text-neutral-800">
            ← Back to home
          </a>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Vehicle fabrication
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-700">
              Practical, in-house fabrication for specialist and heavy-use vehicles — roof hatches,
              conversions, and structural work for vehicles that earn their keep.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                WhatsApp fabrication
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
      </header>

      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            What we fabricate
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Card
              title="Roof hatches"
              body="Custom safari and specialist roof hatches designed for durability, sealing integrity, and repeat use."
            />
            <Card
              title="Roof racks & carriers"
              body="Robust racks built for real-world loading — welded, fitted, and reinforced to suit vehicle use."
            />
            <Card
              title="Safari vehicle conversions"
              body="Structural modifications and interior changes for tour operators and specialist applications."
            />
            <Card
              title="Mounts & brackets"
              body="Custom brackets, reinforcement plates, battery mounts, winch mounts, and accessory integration."
            />
            <Card
              title="Structural repairs"
              body="Chassis reinforcement, cracked mounts, and fatigue repair work where factory solutions are not sufficient."
            />
            <Card
              title="One-off fabrication"
              body="If it needs to exist and it doesn’t yet — we design and build it."
            />
          </div>
        </div>
      </section>

      {/* Image gallery */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Recent fabrication work
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-700">
            A small selection of recent projects. We can walk you through specific work in more
            detail when we meet at the workshop.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GALLERY_IMAGES.map((image) => (
              <figure
                key={image.src}
                className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="rounded-xl border border-neutral-200 p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Discuss your fabrication project
            </h2>

            <p className="mt-3 max-w-3xl text-neutral-700">
              Send photos, vehicle type, and what you are trying to achieve. We’ll advise whether
              it’s feasible and outline next steps.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                WhatsApp fabrication
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

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-neutral-700">{body}</p>
    </div>
  );
}
