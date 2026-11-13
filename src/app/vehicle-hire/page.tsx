import HireBooking from "../../components/HireBooking";
import ScrollReveal from "../../components/ScrollReveal";
import { CONTACT } from "../../lib/contact";
import { YARD } from "../../lib/hire";
import { fleetModels } from "../../lib/fleet";

// Layout and wording follow Homer's vehicle hire design (V1.5).
// Payment wording follows the booking rules: paid in full, nothing charged on the website,
// no security deposit and no out-of-hours fee.

const eyebrow = "text-[13px] font-bold uppercase tracking-[3px] text-[#595959]";
const h2 = "mt-1.5 text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]";
const sectionWrap = "mx-auto mt-14 w-[89%] max-w-[1180px] scroll-mt-28";
const card = "rounded-xl border border-[#e5e5e5] bg-white p-4";

const NAV = [
  { href: "#vehicles", label: "Vehicles" },
  { href: "#corporate", label: "Corporate hire" },
  { href: "#find-us", label: "Find us" },
  { href: "#faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const KNOW = [
  {
    title: "Payment",
    body: "The full hire amount is due when you book. Pay by M-Pesa or bank transfer using your booking reference. We hold the vehicle and confirm the booking once we have checked the payment.",
  },
  {
    title: "Collection and delivery",
    body: "Collect from Karen, JKIA or Wilson Airport at no extra charge. Delivery inside Nairobi is free during opening hours. Outside opening hours, and beyond Nairobi, delivery is charged by distance. Very long distances are quoted by hand.",
  },
  { title: "Driver", body: "Minimum age 25. Bring a valid driving licence and ID to collection." },
  {
    title: "Mileage",
    body: "Saloon cars: 100 km a day included, then KSh 15 per extra km. Nissan X-Trail, Toyota Prado and Land Cruiser: unlimited mileage, with no extra km charge.",
  },
  {
    title: "Damage cover",
    body: "Optional cover for damage to the vehicle, repaired by our own workshop: KSh 1,500 a day for saloons, KSh 2,000 for SUVs and 4x4s. Without it, you pay for any damage to the vehicle.",
  },
  {
    title: "Fuel",
    body: "Return the vehicle with at least the fuel it had when you collected it. Fuel above that level is not refunded.",
  },
  {
    title: "Hours and late returns",
    body: "Open Monday to Friday 08:00–17:00 and Saturday 08:00–13:00. Pick-ups and returns outside these hours are by arrangement. Returns up to 59 minutes late are free; after that, a full extra day may be charged.",
  },
  { title: "Prices", body: "All rates include VAT." },
];

const DIRECTIONS = [
  "Head for Ngong Road in Karen, or tap one of the map links to navigate straight to us.",
  "Coming down Ngong Road towards Karen, look out for the Rubis petrol station. Our turning is about 100 metres from it.",
  "Turn in at the open gate. Our office is the building with chequered lines running up it.",
  "Drive into the premises and the security guard will point you to parking.",
];

const FAQ = [
  {
    q: "What do I need to hire a vehicle?",
    a: "You must be at least 25 and hold a valid driving licence recognised in Kenya. Bring your licence and your ID or passport when you collect the vehicle; we check them at handover.",
  },
  {
    q: "How much do I pay to book?",
    a: "The full hire amount is due when you book, including optional damage cover and any delivery charge. We hold the vehicle and confirm the booking once we have checked the payment.",
  },
  {
    q: "How can I pay?",
    a: "By M-Pesa or bank transfer, using your booking reference. This page does not take the payment itself. If you already have an M-Pesa code, you can add it to the booking.",
  },
  {
    q: "Is insurance included?",
    a: "Every vehicle is insured as the law requires. You can add optional damage cover (KSh 1,500 a day for saloons, KSh 2,000 for SUVs and 4x4s), and our own workshop handles the repairs. Without it, you pay for damage to the vehicle. Damage from riots or natural disasters is not covered by insurance, and windscreens and tyres are the hirer's responsibility.",
  },
  {
    q: "Is there a mileage limit?",
    a: "Saloon cars include 100 km a day, then KSh 15 per extra km. The Nissan X-Trail, Toyota Prados and Land Cruiser have unlimited mileage.",
  },
  {
    q: "What is the fuel policy?",
    a: "Return the vehicle with at least the fuel it had when you collected it. Extra fuel is not refunded.",
  },
  {
    q: "Can you deliver the vehicle to me?",
    a: "Yes. Delivery inside Nairobi is free during our opening hours. Outside opening hours, or beyond Nairobi, delivery is charged by distance and shown when you book. Trips over 150 km are quoted before you pay, and the vehicle is not held until that amount is agreed. Choose a delivery option in Find your vehicle.",
  },
  {
    q: "Can I collect or return outside opening hours?",
    a: "Yes, by arrangement. We are open Monday to Friday 08:00–17:00 and Saturday 08:00–13:00. Tell us your plans when you book.",
  },
  {
    q: "What if I return the vehicle late?",
    a: "Up to 59 minutes late is free. After that, a full extra day may be charged, so call or WhatsApp us if you are running late.",
  },
  {
    q: "Can someone else drive?",
    a: "Only drivers we have approved in writing. Give us their details before your hire.",
  },
  {
    q: "What happens if the vehicle breaks down or I have an accident?",
    a: "Call us straight away on " + CONTACT.phoneDisplay + ". Please do not arrange repairs yourself, as repairs need our approval first.",
  },
  {
    q: "Can I cancel or change my booking?",
    a: "Contact us as early as possible if your plans change.",
  },
];

export default function VehicleHirePage() {
  const tel = "tel:" + CONTACT.phoneE164.replace(/\s/g, "");
  const wa = "https://wa.me/" + CONTACT.whatsappE164.replace(/\D/g, "");
  const pin = YARD.lat + "%2C" + YARD.lng;

  return (
    <main id="top" className="bg-[#f7f7f5] pb-14 text-[15px] leading-normal text-[#171717]">
      <img
        src="/images/vehicle-hire/hero-banner.webp"
        alt="Chequered Flag self-drive vehicle on a dirt road"
        className="block h-[clamp(150px,20vw,270px)] w-full object-cover object-center"
      />

      <nav aria-label="On this page" className="border-b border-[#e5e5e5] bg-[#f5f5f3]">
        <div className="mx-auto flex w-[89%] max-w-[1180px] flex-wrap gap-x-[26px] gap-y-1.5 text-[15px] font-medium">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="py-2.5 text-[#171717] no-underline hover:text-[#595959]">
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <section className="pb-2 pt-[34px]">
        <div className="mx-auto w-[89%] max-w-[1180px]">
          <a
            href="/"
            className="mb-[22px] inline-flex min-h-[44px] items-center gap-2 text-base text-[#3f3f3f] no-underline hover:text-[#171717]"
          >
            ← Back to home
          </a>
          <h1 className="mb-4 text-[40px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[58px]">Vehicle hire</h1>
          <p className="mb-6 max-w-[780px] text-lg leading-[1.7] text-[#3f3f3f]">
            A small, well-maintained self-drive fleet for private and organisational use, operated and supported by our
            in-house workshop. Typical vehicles include Land Cruiser game viewers, Toyota Prados, Nissan X-Trails, and
            practical saloon cars.
          </p>
        </div>
      </section>

      <HireBooking modelCount={fleetModels().length} />
      <ScrollReveal />

      <section id="terms" className={sectionWrap}>
        <div data-reveal className={eyebrow}>Before you book</div>
        <h2 data-reveal className={h2 + " mb-[18px]"}>What you need to know</h2>
        <div data-reveal-stagger className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {KNOW.map((item) => (
            <div key={item.title} className={card}>
              <strong>{item.title}</strong>
              <p className="mt-1.5 text-sm text-[#3f3f3f]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        data-reveal
        id="corporate"
        className={
          sectionWrap +
          " box-border flex flex-wrap items-center justify-between gap-x-8 gap-y-[18px] rounded-xl border border-[#e5e5e5] bg-[#f5f5f3] px-6 py-7 sm:px-[30px]"
        }
      >
        <div className="min-w-0 flex-[1_1_380px]">
          <div className="text-[13px] font-bold uppercase tracking-[2px] text-[#595959]">
            Individuals · NGOs · Schools · Businesses
          </div>
          <h2 className="my-2 text-[26px] font-bold tracking-[-0.02em]">Need a vehicle for longer?</h2>
          <p className="max-w-[620px] text-sm text-[#3f3f3f]">
            Weekly, monthly and multi-vehicle hire with clear terms and workshop-backed maintenance. Ask for a tailored
            quote. Hires longer than 90 days are arranged directly with the team.
          </p>
        </div>
        <a
          href={"mailto:" + CONTACT.email + "?subject=Corporate%20vehicle%20hire%20enquiry"}
          className="box-border inline-flex min-h-[46px] items-center bg-[#171717] px-[22px] py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white no-underline hover:bg-[#2b2b2b] hover:text-white"
        >
          Request a corporate quote
        </a>
      </section>

      {/* CarClub trial, kept from the current page (not in the V1.5 design) */}
      <section data-reveal className={sectionWrap + " rounded-xl border border-[#e5e5e5] bg-white px-6 py-6 sm:px-[30px]"}>
        <div className="text-[13px] font-bold uppercase tracking-[2px] text-[#595959]">CarClub · Limited trial</div>
        <h2 className="my-2 text-xl font-bold tracking-[-0.02em]">
          Interested in self-drive access without the usual handover?
        </h2>
        <p className="max-w-[720px] text-sm text-[#3f3f3f]">
          We’re running a small trial with a short list of trusted users. Access is limited by design while we validate
          reliability and support. Not a public launch; access is approved case by case.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/pilot"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[#171717] bg-white px-5 text-[13px] font-bold text-[#171717] no-underline"
          >
            View CarClub trial
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-[#171717] px-5 text-[13px] font-bold text-white no-underline hover:text-white"
          >
            WhatsApp for access
          </a>
        </div>
      </section>

      <section id="find-us" className={sectionWrap}>
        <div data-reveal className={eyebrow}>Collection and returns</div>
        <h2 data-reveal className={h2 + " mb-[18px]"}>Find our workshop</h2>
        <div data-reveal-stagger className="grid items-start gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
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
                <MapLink href="https://maps.app.goo.gl/sHBMUxznsrspjmfX7" dot="#1a73e8" label="Google Maps" />
                <MapLink
                  href={"https://maps.apple.com/?ll=" + YARD.lat + "," + YARD.lng + "&q=Chequered%20Flag%20Karen"}
                  dot="#171717"
                  label="Apple Maps"
                />
                <MapLink href={"https://waze.com/ul?ll=" + pin + "&navigate=yes"} dot="#33ccff" label="Waze" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5">
            <strong className="mb-3.5 block text-lg">How to get in</strong>
            <ol className="grid gap-3">
              {DIRECTIONS.map((text, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[#171717] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="mt-[3px] text-[15px]">{text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg bg-[#f5f5f3] px-3.5 py-3 text-sm leading-relaxed">
              <strong>Opening hours:</strong> Monday to Friday 08:00–17:00, Saturday 08:00–13:00. Closed Sundays and
              bank holidays.
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
      <section id="faq" className={sectionWrap}>
        <div data-reveal className={eyebrow}>Good to know</div>
        <h2 data-reveal className={h2 + " mb-3"}>Frequently asked questions</h2>
        <div data-reveal className="rounded-xl border border-[#e5e5e5] bg-white px-5 py-1">
          {FAQ.map((item) => (
            <details key={item.q} className="border-b border-[#e5e5e5] last:border-b-0">
              <summary className="min-h-[24px] cursor-pointer px-1 py-4 text-base font-semibold">{item.q}</summary>
              <p className="mx-1 mb-[18px] text-[15px] leading-[1.65] text-[#3f3f3f]">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-3 text-sm text-[#595959]">
          Still have a question? Call or WhatsApp{" "}
          <a href={tel} className="text-[#171717] underline">
            {CONTACT.phoneDisplay}
          </a>{" "}
          or email{" "}
          <a href={"mailto:" + CONTACT.email} className="text-[#171717] underline">
            {CONTACT.email}
          </a>
          .
        </p>
      </section>

    </main>
  );
}

function MapLink({ href, dot, label }: { href: string; dot: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#dadce0] bg-white px-3.5 text-sm font-semibold text-[#171717] no-underline"
    >
      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
      {label}
    </a>
  );
}
