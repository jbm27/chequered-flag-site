"use client";

import { useState } from "react";
import { CONTACT } from "../lib/contact";

// Fabrication page built from Homer's "D · Combined" fabrication design (Nov 2026): a hero with three photos,
// a three-step "Start a project" form that opens WhatsApp with the details filled in (nothing is stored on the
// website), a filterable gallery of recent jobs, the services, and Find us.

const IMG = "/images/fabrication/site/";

type Category = "Roof hatches" | "Safari conversions" | "Metalwork" | "Trailers and one-offs";

const PHOTOS: { cat: Category; title: string; file: string }[] = [
  { cat: "Roof hatches", title: "Roof hatch and rack, Land Cruiser VX", file: "roof-hatch-rack-vx" },
  { cat: "Safari conversions", title: "Game viewers at a safari camp", file: "game-viewers-camp" },
  { cat: "Safari conversions", title: "Finished body on a Land Cruiser", file: "finished-body-land-cruiser" },
  { cat: "Trailers and one-offs", title: "Flatbed trailer", file: "flatbed-trailer" },
  { cat: "Roof hatches", title: "Roof hatch on an 80 Series", file: "roof-hatch-80-series" },
  { cat: "Metalwork", title: "Chequered wheel-arch guard", file: "wheel-arch-guard" },
  { cat: "Roof hatches", title: "Roof hatch on a Prado", file: "roof-hatch-prado" },
  { cat: "Safari conversions", title: "Body fabrication in progress", file: "body-fabrication" },
  { cat: "Metalwork", title: "Grinding and finishing", file: "grinding" },
  { cat: "Trailers and one-offs", title: "Custom truck body", file: "custom-truck-body" },
  { cat: "Roof hatches", title: "Roof hatch fabrication in progress", file: "roof-hatch-in-progress" },
  { cat: "Metalwork", title: "Welding structural parts", file: "welding" },
  { cat: "Safari conversions", title: "Game viewer on the ramp", file: "game-viewer-ramp" },
  { cat: "Metalwork", title: "Chassis and front-end rebuild", file: "chassis-rebuild" },
  { cat: "Roof hatches", title: "Roof rack on a VX, side view", file: "roof-rack-vx-side" },
  { cat: "Safari conversions", title: "Canvas seat covers", file: "canvas-seat-covers" },
  { cat: "Metalwork", title: "Cutting steel", file: "cutting-steel" },
  { cat: "Safari conversions", title: "Leather grab handles", file: "leather-grab-handles" },
];

const FILTERS: ("All" | Category)[] = ["All", "Roof hatches", "Safari conversions", "Metalwork", "Trailers and one-offs"];

const KINDS = ["Roof hatch", "Roof rack", "Safari conversion", "Mounts and brackets", "Structural repair", "Trailer or one-off"];

const SERVICES = [
  { title: "Roof hatches", file: "roof-hatch-80-series", body: "Safari and specialist roof hatches built for sealing, durability and repeat use." },
  { title: "Roof racks and carriers", file: "roof-hatch-prado", body: "Welded, fitted and reinforced to suit how the vehicle is loaded." },
  { title: "Safari vehicle conversions", file: "game-viewer-ramp", body: "Structural and interior changes for tour operators and lodges." },
  { title: "Mounts and brackets", file: "wheel-arch-guard", body: "Battery and winch mounts, reinforcement plates and accessory fitting." },
  { title: "Structural repairs", file: "body-fabrication", body: "Chassis reinforcement, cracked mounts and fatigue repairs." },
  { title: "One-off fabrication", file: "flatbed-trailer", body: "If it needs to exist and it does not yet, we design and build it." },
];

const STEPS = ["1 · The build", "2 · The vehicle", "3 · Your details"];

const field = "h-[46px] w-full rounded-lg border border-[#c8c8c8] bg-white px-3 text-[15px] text-[#171717]";
const label = "mb-1.5 block text-[13px] text-[#595959]";
const eyebrow = "text-[13px] font-bold uppercase tracking-[3px] text-[#595959]";
const section = "mx-auto w-[89%] max-w-[1180px]";

export default function FabricationPage({ years }: { years: number }) {
  // Start a project
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  // Gallery
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [idx, setIdx] = useState(0);
  const list = filter === "All" ? PHOTOS : PHOTOS.filter((photo) => photo.cat === filter);
  const current = Math.min(idx, list.length - 1);
  const photo = list[current];

  const waNumber = CONTACT.whatsappE164.replace(/\D/g, "");
  const tel = "tel:" + CONTACT.phoneE164.replace(/\s/g, "");

  function message() {
    return [
      "Hello Chequered Flag fabrication, I would like to start a project.",
      "Build: " + (kind || "Not chosen"),
      "Vehicle: " + (vehicle.trim() || "Not given"),
      "Idea: " + (notes.trim() || "Not given, please call me"),
      "Name: " + name.trim(),
      "Phone: " + phone.trim(),
      "Please call me back to talk it through.",
    ].join("\n");
  }

  function whatsappLink() {
    return "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(message());
  }

  function forward() {
    if (step === 1 && !kind) return setError("Please choose what you want built.");
    if (step === 2 && !vehicle.trim()) return setError("Please tell us the vehicle.");
    if (step === 3) {
      if (!name.trim()) return setError("Please enter your name.");
      if (phone.replace(/\D/g, "").length < 9) return setError("Please enter a phone number with at least 9 digits.");
      setError("");
      window.open(whatsappLink(), "_blank", "noopener");
      setStep(4);
      return;
    }
    setError("");
    setStep(step + 1);
  }

  function restart() {
    setStep(1);
    setKind("");
    setVehicle("");
    setNotes("");
    setName("");
    setPhone("");
    setError("");
  }

  function showPhoto(next: number) {
    setIdx((next + list.length) % list.length);
  }

  return (
    <main id="top" className="bg-[#f7f7f5] pb-16 text-[15px] leading-normal text-[#171717]">
      {/* Hero */}
      <section className={section + " mt-6 flex flex-wrap items-center gap-9"}>
        <div className="min-w-0 flex-[1_1_420px]">
          <a href="/" className="mb-[18px] inline-flex min-h-[44px] items-center gap-2 text-base text-[#3f3f3f] no-underline hover:text-[#171717]">
            ← Back to home
          </a>
          <div className="text-[13px] font-bold tracking-[3px] text-[#595959]">FABRICATION · KAREN, NAIROBI · SINCE 1975</div>
          <h1 className="mb-[18px] mt-3 text-[clamp(42px,5.4vw,66px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
            If it needs to exist, we build it.
          </h1>
          <p className="mb-6 max-w-[520px] text-lg leading-[1.7] text-[#3f3f3f]">
            Roof hatches, racks, game viewers, trailers and structural repairs, cut, welded and fitted in our own workshop.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <a href="#start" className="inline-flex min-h-[48px] items-center rounded-lg bg-[#171717] px-[22px] text-[15px] font-bold text-white no-underline hover:bg-[#2b2b2b]">
              Start a project
            </a>
            <a href="#projects" className="inline-flex min-h-[48px] items-center rounded-lg border border-[#e0e0e0] bg-white px-[22px] text-[15px] font-semibold text-[#171717] no-underline hover:bg-[#f5f5f3]">
              See our work
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-7 border-t border-[#e0e0e0] pt-[22px]">
            {[
              { big: String(years), small: "years in business" },
              { big: "1975", small: "year we opened" },
              { big: "In-house", small: "design, build and fitting" },
            ].map((item) => (
              <div key={item.small}>
                <div className="text-[40px] font-extrabold leading-none tracking-[-0.03em]">{item.big}</div>
                <div className="mt-1.5 text-[13px] text-[#595959]">{item.small}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid h-[300px] min-w-0 flex-[1_1_480px] grid-cols-3 gap-2.5 sm:h-[520px]">
          <img src={IMG + "cutting-steel.webp"} alt="A fabricator cutting steel with sparks flying" className="block h-full w-full rounded-[14px] object-cover" />
          <img src={IMG + "grinding.webp"} alt="A grinder finishing a fabricated part" className="mt-[12%] block h-[88%] w-full rounded-[14px] object-cover" />
          <img src={IMG + "wheel-arch-guard.webp"} alt="A chequered flag cut into a steel wheel-arch guard" className="block h-full w-full rounded-[14px] object-cover" />
        </div>
      </section>

      {/* Start a project */}
      <section id="start" className={section + " mt-[72px] flex scroll-mt-24 flex-wrap items-start gap-9"}>
        <div className="min-w-0 flex-[1_1_340px]">
          <div className={eyebrow}>Start a project</div>
          <h2 className="mb-3.5 mt-1.5 text-[clamp(30px,3.2vw,38px)] font-extrabold leading-[1.15] tracking-[-0.03em]">
            Three quick steps, then we call you
          </h2>
          <p className="mb-5 text-base leading-[1.7] text-[#3f3f3f]">
            We talk the idea through, look at the vehicle and agree a design and price before anything is cut.
          </p>
          <a href={tel} className="flex min-h-[48px] items-center justify-between gap-3 rounded-lg border border-[#e5e5e5] bg-white px-4 py-2.5 text-[#171717] no-underline hover:border-[#171717]">
            <span className="text-sm">
              <strong>Rather call?</strong>
              <span className="block text-[13px] text-[#595959]">Mon to Fri 8am to 5pm, Sat 8am to 1pm</span>
            </span>
            <span className="font-bold">{CONTACT.phoneDisplay}</span>
          </a>
        </div>

        <div className="min-w-0 flex-[1_1_560px] rounded-xl border border-[#d9d1b8] bg-white px-5 py-6 shadow-[0_6px_18px_rgba(60,50,20,0.08)] sm:px-7">
          <ol aria-label="Progress" className="mb-5 grid list-none grid-cols-3 gap-2 p-0">
            {STEPS.map((text, i) => (
              <li
                key={text}
                aria-current={step === i + 1 ? "step" : undefined}
                className={"border-t-4 pt-2 text-[13px] font-bold " + (step > i ? "border-[#171717] text-[#171717]" : "border-[#e0e0e0] text-[#767676]")}
              >
                {text}
              </li>
            ))}
          </ol>

          {step === 1 && (
            <div>
              <h3 className="mb-3 text-[22px] font-extrabold tracking-[-0.02em]">What do you want built?</h3>
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                {KINDS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={kind === item}
                    onClick={() => {
                      setKind(item);
                      setError("");
                    }}
                    className={
                      "min-h-[64px] cursor-pointer rounded-[10px] border-2 px-3.5 py-3 text-left text-sm font-bold text-[#171717] " +
                      (kind === item ? "border-[#171717] bg-[#f5f5f3]" : "border-[#e0e0e0] bg-white hover:border-[#8a8a8a]")
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="mb-3 text-[22px] font-extrabold tracking-[-0.02em]">Tell us about the vehicle</h3>
              <label htmlFor="cveh" className={label}>
                Vehicle or trailer
              </label>
              <input
                id="cveh"
                type="text"
                value={vehicle}
                onChange={(e) => {
                  setVehicle(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Toyota Prado 2014"
                className={field}
              />
              <label htmlFor="cidea" className={label + " mt-3.5"}>
                Describe the idea
              </label>
              <textarea
                id="cidea"
                rows={4}
                maxLength={800}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What the vehicle is used for and what you want added or fixed."
                className="w-full resize-y rounded-lg border border-[#c8c8c8] bg-white p-3 text-[15px] text-[#171717]"
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="mb-3 text-[22px] font-extrabold tracking-[-0.02em]">How do we reach you?</h3>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                <div>
                  <label htmlFor="cname" className={label}>
                    Your name
                  </label>
                  <input id="cname" type="text" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Full name" className={field} />
                </div>
                <div>
                  <label htmlFor="cphone" className={label}>
                    Phone number
                  </label>
                  <input id="cphone" type="tel" autoComplete="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }} placeholder="+254" className={field} />
                </div>
              </div>
              <div className="mt-3.5 rounded-lg bg-[#f5f5f3] px-3.5 py-3 text-sm leading-[1.6]">
                <strong>{kind || "Build not chosen"}</strong> · {vehicle.trim() || "Vehicle not given"}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="py-4 text-center">
              <h3 className="mb-2 text-2xl font-extrabold">WhatsApp has opened with your details.</h3>
              <p className="mb-4 text-[#595959]">
                Press send there and add a few photos of the vehicle. We call you back to talk it through.
              </p>
              <p className="mb-4 text-[13px] text-[#595959]">
                WhatsApp did not open?{" "}
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                  Open it again
                </a>{" "}
                or call{" "}
                <a href={tel} className="font-semibold underline">
                  {CONTACT.phoneDisplay}
                </a>
                .
              </p>
              <button type="button" onClick={restart} className="min-h-[46px] cursor-pointer rounded-lg border border-[#171717] bg-white px-[22px] text-[13px] font-bold hover:bg-[#f5f5f3]">
                Start another project
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3.5 text-sm font-bold text-[#9b1c1c]">
              {error}
            </p>
          )}

          {step < 4 && (
            <div className="mt-5 flex justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setStep(Math.max(1, step - 1));
                  setError("");
                }}
                disabled={step === 1}
                className="min-h-[48px] cursor-pointer rounded-lg border border-[#c8c8c8] bg-white px-5 text-sm font-semibold text-[#171717] disabled:cursor-default disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={forward}
                className="min-h-[48px] cursor-pointer rounded-lg border-0 bg-[#171717] px-6 text-sm font-bold uppercase tracking-[1px] text-white hover:bg-[#2b2b2b]"
              >
                {step === 3 ? "Send on WhatsApp" : "Next"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Browse our work */}
      <section id="projects" className={section + " mt-[72px] scroll-mt-24"}>
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-[0_6px_18px_rgba(60,50,20,0.06)] sm:p-[22px]">
          <div className="mb-[18px] flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div>
              <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">Browse our work</h2>
              <p className="mt-1 text-sm text-[#595959]">{list.length} photos from recent jobs</p>
            </div>
            <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={filter === item}
                  onClick={() => {
                    setFilter(item);
                    setIdx(0);
                  }}
                  className={
                    "min-h-[44px] cursor-pointer rounded-full border px-4 text-[13px] font-semibold " +
                    (filter === item ? "border-[#171717] bg-[#171717] text-white" : "border-[#c8c8c8] bg-white text-[#171717] hover:border-[#171717]")
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-[18px]">
            <figure className="m-0 min-w-0 flex-[999_1_560px]">
              <div className="relative h-[clamp(260px,38vw,480px)] overflow-hidden rounded-[10px] bg-[#2b2b2b]">
                <img key={photo.file} src={IMG + photo.file + ".webp"} alt={photo.title} className="absolute inset-0 h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => showPhoto(current - 1)}
                  className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-white/90 hover:bg-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => showPhoto(current + 1)}
                  className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-white/90 hover:bg-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
              <figcaption className="flex flex-wrap justify-between gap-x-4 gap-y-1.5 px-0.5 pt-3">
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[2px] text-[#595959]">{photo.cat}</span>
                  <strong className="text-[17px]">{photo.title}</strong>
                </span>
                <span className="text-[13px] text-[#595959]" aria-live="polite">
                  {current + 1} of {list.length}
                </span>
              </figcaption>
            </figure>
            <div className="grid max-h-[520px] min-w-0 flex-[1_1_260px] grid-cols-3 content-start gap-2 overflow-y-auto">
              {list.map((item, i) => (
                <button
                  key={item.file}
                  type="button"
                  aria-label={item.title}
                  aria-pressed={i === current}
                  onClick={() => setIdx(i)}
                  className={"aspect-square cursor-pointer overflow-hidden rounded-lg border-[3px] bg-white p-0 " + (i === current ? "border-[#171717]" : "border-white")}
                >
                  <img src={IMG + item.file + "-sm.webp"} alt="" loading="lazy" className="block h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="build" className={section + " mt-14"}>
        <div className={eyebrow}>Services</div>
        <h2 className="mb-[18px] mt-1.5 text-[clamp(28px,3vw,34px)] font-bold leading-[1.2] tracking-[-0.02em]">What we fabricate</h2>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(330px,100%),1fr))]">
          {SERVICES.map((item) => (
            <div key={item.title} className="flex items-stretch gap-3.5 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
              <img src={IMG + item.file + "-sm.webp"} alt="" loading="lazy" className="block w-[120px] flex-none object-cover" />
              <div className="py-3.5 pr-3.5">
                <strong className="text-base">{item.title}</strong>
                <p className="mt-1.5 text-sm text-[#3f3f3f]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Find us */}
      <section id="find-us" className={section + " mt-14 flex flex-wrap items-stretch gap-[18px]"}>
        <img
          src={IMG + "workshop-gate.webp"}
          alt="The Chequered Flag workshop on Ngong Road, Karen"
          loading="lazy"
          className="block h-[220px] min-w-0 flex-[1_1_420px] rounded-xl object-cover [object-position:30%_55%]"
        />
        <div className="min-w-0 flex-[1_1_380px] rounded-xl border border-[#e5e5e5] bg-white px-[22px] py-5">
          <div className={eyebrow}>Find us</div>
          <h2 className="mb-2 mt-1.5 text-[26px] font-bold tracking-[-0.02em]">Ngong Road, Karen</h2>
          <p className="mb-3.5 text-sm text-[#3f3f3f]">
            About 100 metres from the Rubis petrol station. Look for the office with chequered stripes; the gate is on the left.
            Mon to Fri 08:00–17:00, Sat 08:00–13:00.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "https://maps.app.goo.gl/sHBMUxznsrspjmfX7", dot: "#1a73e8", text: "Google Maps" },
              { href: "https://waze.com/ul?ll=-1.3185853%2C36.7161047&navigate=yes", dot: "#33ccff", text: "Waze" },
            ].map((item) => (
              <a
                key={item.text}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#dadce0] px-3.5 text-sm font-semibold text-[#171717] no-underline hover:border-[#171717]"
              >
                <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: item.dot }} />
                {item.text}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
