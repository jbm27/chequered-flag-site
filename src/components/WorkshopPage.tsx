"use client";

import { useState } from "react";
import { CONTACT } from "../lib/contact";

// Workshop page laid out from Homer's "Design B, Bold" workshop design (light version).
// The enquiry form has no inbox behind it yet, so sending opens WhatsApp with the details filled in.
// Nothing is stored on the website.

const GREEN = "#1d6b3a";

const NEEDS = ["Service", "Repair or fault", "Fabrication and welding", "Off-road and 4x4 build", "Interior trim", "Not sure"];

const PROMPTS: Record<string, string> = {
  "Warning light": "Warning light on the dashboard: ",
  Noise: "Noise from: ",
  "When it started": "Started: ",
  "Preferred drop-off": "Preferred drop-off day: ",
};

const SERVICES = [
  {
    id: "servicing",
    title: "Servicing and maintenance",
    need: "Service",
    img: "/images/workshop/land-cruiser-200.jpg",
    text: "Scheduled servicing for saloons, SUVs and 4x4s, with the same care our own hire fleet gets before every hire.",
    items: ["Oil, filters and fluids", "Brake, steering and suspension checks", "Tyre and wheel condition", "A written note of anything we find"],
  },
  {
    id: "repairs",
    title: "Diagnostics and repairs",
    need: "Repair or fault",
    img: "/images/workshop/land-cruiser-79.jpg",
    text: "Warning light, strange noise or something that does not feel right? We find the cause first, explain it, and quote before we fix it.",
    items: ["Fault finding", "Engine, gearbox and clutch work", "Electrical faults", "Cooling and brake systems"],
  },
  {
    id: "fab",
    title: "Fabrication and welding",
    need: "Fabrication and welding",
    img: "/images/workshop/welding.jpg",
    text: "Repairs and custom metalwork made in-house, from a cracked bracket to a full bumper.",
    items: ["Chassis and body repairs", "Bumpers and brackets", "Roof racks and carriers", "One-off parts made to measure"],
  },
  {
    id: "offroad",
    title: "Off-road and 4x4 builds",
    need: "Off-road and 4x4 build",
    img: "/images/workshop/wheel-arch-guard.jpg",
    text: "Protection and set-ups for Land Cruisers, Prados and other 4x4s that spend their lives on rough roads.",
    items: ["Wheel-arch guards and bash plates", "Recovery points", "Suspension and tyre upgrades", "Safari and game-viewer set-ups"],
  },
  {
    id: "trim",
    title: "Interior trim and upholstery",
    need: "Interior trim",
    img: "/images/workshop/game-viewers.jpg",
    text: "Hand-finished interior work for game viewers and safari vehicles, built to stand up to dust and daily use.",
    items: ["Leather grab handles and bars", "Seat repairs and re-covering", "Canvas and side curtains", "Trim repairs"],
  },
];

const PROMISES = [
  { title: "A quote before any work", text: "We inspect first, explain what we found and agree the price with you." },
  { title: "A call before anything extra", text: "If we find something else, we call you before we touch it." },
  { title: "Your old parts, if you want them", text: "Ask and we keep the replaced parts so you can see what was changed." },
  { title: "Updates by phone or WhatsApp", text: "Photos of what we find and a message when your vehicle is ready." },
];

const DIRECTIONS = [
  "Head for Ngong Road in Karen, or tap one of the map links to navigate straight to us.",
  "Coming down Ngong Road towards Karen, look out for the Rubis petrol station. Our turning is about 100 metres from it.",
  "Turn in at the open gate. Our office is the building with chequered lines running up it.",
  "Drive into the premises and the security guard will point you to parking.",
];

const field =
  "box-border h-[46px] w-full min-w-0 rounded-lg border border-[#c8c8c8] bg-white px-3 text-[15px] text-[#171717]";
const label = "mb-1.5 block text-[13px] text-[#595959]";
const eyebrow = "text-[13px] font-bold uppercase tracking-[3px] text-[#595959]";
const h2 = "mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.03em] md:text-[38px]";
const wrap = "mx-auto w-[89%] max-w-[1180px] scroll-mt-28";

function Tick() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[3px] flex-none">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export default function WorkshopPage({ years, fleetSize }: { years: number; fleetSize: number }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [reg, setReg] = useState("");
  const [notes, setNotes] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [contact, setContact] = useState<"call" | "whatsapp">("call");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [service, setService] = useState(SERVICES[0].id);

  const waNumber = CONTACT.whatsappE164.replace(/\D/g, "");
  const tel = "tel:" + CONTACT.phoneE164.replace(/\s/g, "");

  function toggleNeed(need: string) {
    setError("");
    setNeeds((current) => {
      if (current.includes(need)) return current.filter((item) => item !== need);
      if (need === "Not sure") return ["Not sure"];
      return current.filter((item) => item !== "Not sure").concat(need);
    });
  }

  function addPrompt(key: string) {
    const sep = notes && !notes.endsWith("\n") ? "\n" : "";
    setNotes((notes + sep + PROMPTS[key]).slice(0, 800));
    window.setTimeout(() => document.getElementById("wnotes")?.focus(), 30);
  }

  function enquireAbout(need: string) {
    setSent(false);
    setNeeds((current) => (current.includes(need) ? current : current.filter((item) => item !== "Not sure").concat(need)));
    window.setTimeout(() => document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function message() {
    const lines = [
      "Hello Chequered Flag workshop, I would like to book my vehicle in.",
      "Name: " + name.trim(),
      "Phone: " + phone.trim(),
      "Vehicle: " + vehicle.trim() + (reg.trim() ? " (" + reg.trim().toUpperCase() + ")" : ""),
      "Needs: " + (needs.length ? needs.join(", ") : "Not chosen"),
      "Issue: " + notes.trim(),
      "Please reach me by " + (contact === "whatsapp" ? "WhatsApp" : "phone call") + ".",
    ];
    return lines.join("\n");
  }

  function send() {
    const digits = phone.replace(/\D/g, "").length;
    if (!name.trim()) return setError("Please enter your name.");
    if (digits < 9) return setError("Please enter a phone number with at least 9 digits.");
    if (!vehicle.trim()) return setError("Please tell us the make and model of your vehicle.");
    if (notes.trim().length < 10) return setError("Please add a few words about the issue so we can prepare.");
    setError("");
    window.open("https://wa.me/" + waNumber + "?text=" + encodeURIComponent(message()), "_blank", "noopener");
    setSent(true);
  }

  function reset() {
    setSent(false);
    setName("");
    setPhone("");
    setVehicle("");
    setReg("");
    setNotes("");
    setNeeds([]);
    setError("");
  }

  const current = SERVICES.find((item) => item.id === service) || SERVICES[0];
  const currentIndex = SERVICES.indexOf(current);
  const firstName = name.trim().split(" ")[0] || "";

  return (
    <main id="top" className="bg-[#f7f7f5] pb-16 text-[15px] leading-normal text-[#171717]">
      {/* Hero and enquiry form */}
      <section id="enquiry" className="scroll-mt-20 bg-[#f7f7f5] pb-2 text-[#171717]">
        <img
          src="/images/workshop/land-cruiser-79.jpg"
          alt="A green Land Cruiser safari vehicle in the Chequered Flag yard"
          fetchPriority="high"
          className="block h-[clamp(170px,22vw,300px)] w-full object-cover object-[center_62%]"
        />
        <div className="mx-auto mt-[34px] flex w-[89%] max-w-[1180px] flex-wrap items-start gap-9">
          <div className="min-w-0 flex-[1_1_380px] pt-2">
            <a href="/" className="mb-[18px] inline-flex min-h-[44px] items-center gap-2 text-base text-[#3f3f3f] no-underline hover:text-[#171717]">
              ← Back to home
            </a>
            <div className="text-[13px] font-bold tracking-[3px] text-[#595959]">
              IN-HOUSE WORKSHOP · KAREN, NAIROBI
            </div>
            <h1 className="mb-[18px] mt-3 text-[42px] font-extrabold leading-[1.02] tracking-[-0.035em] md:text-[66px]">
              Workshop and servicing
            </h1>
            <p className="mb-7 max-w-[520px] text-lg leading-[1.7] text-[#3f3f3f]">
              For {years} years our own mechanics have serviced, repaired and built vehicles in Karen. The same workshop keeps
              our hire fleet on the road.
            </p>
            <div className="flex flex-wrap gap-7 border-t border-[#e0e0e0] pt-[22px]">
              {[
                { value: String(years), label: "years in business" },
                { value: String(fleetSize), label: "hire vehicles we service" },
                { value: "1975", label: "year we opened" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-[44px] font-extrabold leading-none tracking-[-0.03em] text-[#171717]">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-[13px] text-[#595959]">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <a
                href={"https://wa.me/" + waNumber}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center rounded-lg bg-[#171717] px-[22px] text-[15px] font-bold text-white no-underline hover:bg-[#2b2b2b] hover:text-white"
              >
                WhatsApp us
              </a>
              <a
                href={tel}
                className="box-border inline-flex min-h-[48px] items-center rounded-lg border border-[#e0e0e0] bg-white px-[22px] text-[15px] font-semibold text-[#171717] no-underline"
              >
                Call {CONTACT.phoneDisplay}
              </a>
            </div>
            <p className="mt-3 text-[13px] text-[#595959]">
              Open Mon to Fri 8am to 5pm, Sat 8am to 1pm. Closed Sundays and public holidays.
            </p>
          </div>

          <div className="box-border min-w-0 flex-[1_1_520px] rounded-xl border border-[#d9d1b8] bg-white px-5 py-[26px] text-[#171717] shadow-[0_6px_18px_rgba(60,50,20,0.08)] sm:px-7">
            {!sent ? (
              <div>
                <h2 className="mb-1 text-2xl font-extrabold tracking-[-0.02em]">Book your vehicle in</h2>
                <p className="mb-[18px] text-sm text-[#595959]">Tell us what is going on. We call you back to talk it through.</p>
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                  <div>
                    <label htmlFor="bname" className={label}>
                      Your name
                    </label>
                    <input id="bname" type="text" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Full name" className={field} />
                  </div>
                  <div>
                    <label htmlFor="bphone" className={label}>
                      Phone number
                    </label>
                    <input id="bphone" type="tel" autoComplete="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }} placeholder="+254" className={field} />
                  </div>
                  <div>
                    <label htmlFor="bveh" className={label}>
                      Vehicle make and model
                    </label>
                    <input id="bveh" type="text" value={vehicle} onChange={(e) => { setVehicle(e.target.value); setError(""); }} placeholder="e.g. Toyota Prado 2014" className={field} />
                  </div>
                  <div>
                    <label htmlFor="breg" className={label}>
                      Registration (optional)
                    </label>
                    <input id="breg" type="text" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="e.g. KDA 123A" className={field + " uppercase placeholder:normal-case"} />
                  </div>
                </div>

                <div className="mb-2 mt-4 text-[13px] text-[#595959]">What do you need?</div>
                <div className="flex flex-wrap gap-2">
                  {NEEDS.map((need) => {
                    const on = needs.includes(need);
                    return (
                      <button
                        key={need}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleNeed(need)}
                        className={
                          "min-h-[44px] cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold " +
                          (on ? "border-[#171717] bg-[#171717] text-white" : "border-[#c8c8c8] bg-white text-[#171717]")
                        }
                      >
                        {need}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-1.5 mt-4 flex items-baseline justify-between gap-3">
                  <label htmlFor="wnotes" className="text-[13px] text-[#595959]">
                    Tell us about the issue
                  </label>
                  <span className={"text-xs " + (notes.length > 720 ? "text-[#9b1c1c]" : "text-[#595959]")}>{notes.length} / 800</span>
                </div>
                <textarea
                  id="wnotes"
                  rows={4}
                  maxLength={800}
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setError(""); }}
                  placeholder="What is happening, when it started, any warning lights or noises."
                  className="box-border w-full resize-y rounded-lg border border-[#c8c8c8] bg-white p-3 font-[inherit] text-[15px] leading-normal text-[#171717]"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.keys(PROMPTS).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => addPrompt(key)}
                      className="min-h-[36px] cursor-pointer rounded-md border border-[#e0e0e0] bg-[#f5f5f3] px-2.5 text-xs text-[#3f3f3f]"
                    >
                      + {key}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2">
                  <span className="mr-1 text-[13px] text-[#595959]">Reach me by</span>
                  {(
                    [
                      { id: "call", label: "Phone call" },
                      { id: "whatsapp", label: "WhatsApp" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={contact === item.id}
                      onClick={() => setContact(item.id)}
                      className={
                        "min-h-[44px] cursor-pointer rounded-lg border-2 px-3.5 text-sm font-semibold text-[#171717] " +
                        (contact === item.id ? "border-[#171717] bg-[#f5f5f3]" : "border-[#d0d0d0] bg-white")
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {error && (
                  <p role="alert" className="mt-3.5 text-sm font-bold text-[#9b1c1c]">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={send}
                  className="mt-[18px] min-h-[52px] w-full cursor-pointer rounded-lg border-0 bg-[#171717] text-sm font-bold uppercase tracking-[1px] text-white hover:bg-[#2b2b2b]"
                >
                  Send enquiry on WhatsApp
                </button>
                <p className="mt-2.5 text-center text-xs text-[#595959]">
                  No payment needed. This opens WhatsApp with your details filled in; press send there to reach us.
                </p>
              </div>
            ) : (
              <div className="px-1.5 py-5 text-center">
                <div aria-hidden="true" className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-full bg-[#171717] text-[#d5bb7a]">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </div>
                <h2 className="mb-2 text-[26px] font-extrabold tracking-[-0.02em]">
                  {firstName ? "Thanks, " + firstName + "." : "Thanks."} Your message is ready.
                </h2>
                <p className="mx-auto mb-4 max-w-[440px] text-[#595959]">
                  WhatsApp has opened with your details. Press send there, and we will{" "}
                  {contact === "whatsapp" ? "message" : "call"} you on {phone} to arrange a time.
                </p>
                <div className="mb-4 whitespace-pre-line rounded-lg bg-[#f5f5f3] p-3.5 text-left text-sm leading-[1.7]">
                  <strong>
                    {vehicle}
                    {reg.trim() ? " · " + reg.trim().toUpperCase() : ""}
                  </strong>
                  <br />
                  <span className="text-[#3f3f3f]">{needs.length ? needs.join(", ") : "Service type not chosen"}</span>
                  <br />
                  <span className="text-[#3f3f3f]">{notes}</span>
                </div>
                <p className="mb-3.5 text-[13px] text-[#595959]">
                  WhatsApp did not open?{" "}
                  <a
                    href={"https://wa.me/" + waNumber + "?text=" + encodeURIComponent(message())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    Open it again
                  </a>{" "}
                  or call{" "}
                  <a href={tel} className="font-semibold underline">
                    {CONTACT.phoneDisplay}
                  </a>
                  .
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="min-h-[46px] cursor-pointer rounded-lg border border-[#171717] bg-white px-[22px] text-[13px] font-bold text-[#171717]"
                >
                  Start a new enquiry
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className={wrap + " mt-[72px]"}>
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <div className={eyebrow}>What we do</div>
            <h2 className={h2}>Five services, one workshop</h2>
          </div>
          <p className="text-sm text-[#595959]">Select a service to see what is involved</p>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))]">
          {SERVICES.map((item, index) => {
            const on = item.id === current.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setService(item.id)}
                className="flex cursor-pointer flex-col overflow-hidden rounded-xl border-[3px] p-0 text-left"
                style={{ borderColor: on ? "#171717" : "#e5e5e5", background: on ? "#f5f5f3" : "#ffffff", color: "#171717" }}
              >
                <img src={item.img} alt="" loading="lazy" className="block h-[110px] w-full object-cover md:h-[170px]" />
                <span className="block px-3.5 pb-3.5 pt-3">
                  <span className="block text-xs font-bold tracking-[1px] opacity-70">{String(index + 1).padStart(2, "0")}</span>
                  <span className="block text-base font-bold leading-[1.3]">{item.title}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3.5 flex flex-wrap items-start gap-x-10 gap-y-5 rounded-xl border border-[#e5e5e5] bg-white px-6 py-[26px] text-[#171717] sm:px-7">
          <div className="min-w-0 flex-[1_1_340px]">
            <div className="text-xs font-bold tracking-[2px] text-[#595959]">
              {String(currentIndex + 1).padStart(2, "0")} · SERVICE
            </div>
            <h3 className="mb-2.5 mt-2 text-[28px] font-extrabold tracking-[-0.02em]">{current.title}</h3>
            <p className="text-[15px] leading-[1.7] text-[#3f3f3f]">{current.text}</p>
            <p className="mt-3.5 text-[13px] text-[#595959]">Price: quoted after inspection</p>
          </div>
          <ul className="m-0 grid min-w-0 flex-[1_1_280px] list-none gap-2.5 p-0 text-[15px]">
            {current.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Tick />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => enquireAbout(current.need)}
            className="min-h-[48px] cursor-pointer self-center rounded-lg border-0 bg-[#171717] px-6 text-[13px] font-extrabold uppercase tracking-[1px] text-white hover:bg-[#2b2b2b]"
          >
            Enquire about this
          </button>
        </div>
      </section>

      {/* From our yard */}
      <section aria-label="From our yard" className={wrap + " mt-[72px]"}>
        <div className="grid grid-cols-2 gap-2.5 [grid-auto-rows:clamp(120px,17vw,215px)] md:grid-cols-4">
          <img
            src="/images/workshop/game-viewers.jpg"
            alt="Three Chequered Flag game viewers lined up at a safari camp"
            loading="lazy"
            className="col-span-2 row-span-2 block h-full w-full rounded-[14px] object-cover object-[center_45%]"
          />
          <img
            src="/images/workshop/land-cruiser-200.jpg"
            alt="A Land Cruiser 200 with snorkel and roof rack in the Chequered Flag yard"
            loading="lazy"
            className="col-span-2 block h-full w-full rounded-[14px] object-cover object-[center_60%]"
          />
          <img
            src="/images/workshop/prado-roof-rack.jpg"
            alt="A Prado fitted with a roof rack, jerry can holder and awning"
            loading="lazy"
            className="block h-full w-full rounded-[14px] object-cover object-[40%_center]"
          />
          <img
            src="/images/workshop/paintwork.jpg"
            alt="A Land Cruiser masked up for paintwork in the workshop"
            loading="lazy"
            className="block h-full w-full rounded-[14px] object-cover"
          />
        </div>
      </section>

      {/* Heritage */}
      <section id="heritage" className="mt-14 scroll-mt-28 border-y border-[#e5e5e5] bg-[#f5f5f3] px-[5.5%] py-16 text-[#171717]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-9">
          <div className="min-w-0 flex-[999_1_500px]">
            <div className="text-[13px] font-bold tracking-[3px] text-[#595959]">
              OUR STORY
            </div>
            <h2 className="mb-[18px] mt-2 text-[34px] font-extrabold tracking-[-0.03em] md:text-[42px]">{years} years in the workshop</h2>
            <p className="mb-3.5 max-w-[640px] text-[17px] leading-[1.7] text-[#3f3f3f]">
              Chequered Flag began as a mechanical workshop in Nairobi in 1975. Over five decades the business has grown, but
              the way we work has stayed the same: diagnose methodically, repair properly and stand behind the work.
            </p>
            <p className="mb-[26px] max-w-[640px] text-base leading-[1.7] text-[#3f3f3f]">
              Many of our clients come back year after year, some for decades, because the workmanship is consistent and we
              take responsibility for it. Our reputation was built over time, not through advertising.
            </p>
            <div className="grid gap-[18px] border-t border-[#e0e0e0] pt-[22px] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
              {[
                { label: "LONGEVITY", text: "A reputation earned over " + years + " years, one job at a time." },
                { label: "PRACTICAL SKILL", text: "Hands-on mechanical experience, in-house fabrication and careful diagnostics." },
                { label: "ACCOUNTABILITY", text: "We take responsibility for the work, from inspection to final handover." },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-xs font-bold tracking-[2px] text-[#171717]">
                    {item.label}
                  </div>
                  <p className="mt-1.5 text-sm leading-[1.6] text-[#3f3f3f]">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-[22px] border-t border-[#e0e0e0] pt-[22px]">
              <h3 className="mb-2 text-2xl font-extrabold tracking-[-0.02em]">Today</h3>
              <p className="max-w-[640px] text-base leading-[1.7] text-[#3f3f3f]">
                We run a mechanical workshop, a self-drive vehicle fleet and a fabrication facility, so we can repair,
                maintain, build and supply vehicles under one roof. We are not the newest workshop in Nairobi. We are one of
                the longest standing.
              </p>
            </div>
          </div>
          <figure className="m-0 min-w-0 flex-[1_1_320px]">
            <img
              src="/images/workshop/wheel-arch-guard.jpg"
              alt="A chequered flag cut into a steel wheel-arch guard made in the workshop"
              loading="lazy"
              className="block h-[360px] w-full rounded-xl object-cover object-center"
            />
          </figure>
        </div>
      </section>

      {/* Promise */}
      <section id="promise" className={wrap + " mt-[72px]"}>
        <div className={eyebrow}>Why customers leave their vehicles with us</div>
        <h2 className={h2 + " mb-[22px]"}>Our workshop promise</h2>
        <div className="grid border-t-2 border-[#171717] [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
          {PROMISES.map((item, index) => (
            <div key={item.title} className="border-b border-[#e0e0e0] py-[22px] pr-[22px]">
              <div className="text-[28px] font-extrabold text-[#595959]">{String(index + 1).padStart(2, "0")}</div>
              <h3 className="my-1.5 text-[19px] font-bold">{item.title}</h3>
              <p className="text-sm text-[#3f3f3f]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Find us */}
      <section id="find-us" className={wrap + " mt-14"}>
        <div className={eyebrow}>Drop-off and collection</div>
        <h2 className="mb-[18px] mt-1.5 text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Find our workshop</h2>
        <div className="grid items-start gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
            <img
              src="/images/vehicle-hire/workshop.webp"
              alt="The Chequered Flag workshop on Ngong Road, Karen: the open gate on the left and the office building with chequered stripes"
              loading="lazy"
              className="block h-[240px] w-full object-cover object-[30%_55%]"
            />
            <div className="px-4 py-3.5">
              <strong className="block text-base">Chequered Flag workshop</strong>
              <span className="text-sm text-[#595959]">
                {CONTACT.locationShort}. Look for the office with chequered stripes; the gate is on the left.
              </span>
              <div className="mb-2 mt-3 text-[13px] text-[#595959]">Open the pin in your map app:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { href: "https://maps.app.goo.gl/sHBMUxznsrspjmfX7", dot: "#1a73e8", label: "Google Maps" },
                  { href: "https://maps.apple.com/?ll=-1.3185853,36.7161047&q=Chequered%20Flag%20Karen", dot: "#171717", label: "Apple Maps" },
                  { href: "https://waze.com/ul?ll=-1.3185853%2C36.7161047&navigate=yes", dot: "#33ccff", label: "Waze" },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#dadce0] bg-white px-3.5 text-sm font-semibold text-[#171717] no-underline"
                  >
                    <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: link.dot }} />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5">
            <strong className="mb-3.5 block text-lg">How to get in</strong>
            <ol className="grid gap-3">
              {DIRECTIONS.map((text, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[#171717] text-sm font-bold text-white">{index + 1}</span>
                  <p className="mt-[3px] text-[15px]">{text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg bg-[#f5f5f3] px-3.5 py-3 text-sm leading-relaxed">
              <strong>Opening hours:</strong> Monday to Friday 08:00–17:00, Saturday 08:00–13:00. Closed Sundays and bank
              holidays.
              <br />
              <strong>Lost or running late?</strong> Call or WhatsApp{" "}
              <a href={tel} className="text-[#171717] underline">
                {CONTACT.phoneDisplay}
              </a>
              .
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
