import HireBooking from "../../components/HireBooking";
import ScrollReveal from "../../components/ScrollReveal";
import CustomerReviews from "../../components/CustomerReviews";
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

// Summary of the hire terms. Kept in line with the Self-drive vehicle hire agreement (src/lib/documents.ts).
const KNOW = [
  {
    title: "Payment",
    body: "The full booking price is due when you book, by M-Pesa or bank transfer using your booking reference. Your booking is confirmed once we have received the full payment and sent you confirmation. There is no security deposit.",
  },
  {
    title: "Collection and delivery",
    body: "Collect from our workshop in Karen, or we deliver to you, and can collect from a different place. Delivery is free within 15 km of the workshop, measured in a straight line. Beyond that, each km over 15 costs KSh 45 for a saloon, KSh 55 for an SUV and KSh 70 for a Prado or 4x4, for each trip. The charge is shown when you book.",
  },
  {
    title: "Drivers",
    body: "Every driver must be at least 25, hold a valid licence recognised in Kenya and be named on the booking. Add a photo of each driver's licence when you book, and bring the licences and ID to collection.",
  },
  {
    title: "Mileage",
    body: "Every vehicle includes 100 km a day, then KSh 15 per extra km. This applies to saloon cars, the Nissan X-Trail, Toyota Prados and the Land Cruiser.",
  },
  {
    title: "Damage liability limit",
    body: "If the vehicle is damaged during your hire, you pay the evidenced repair cost up to a limit for the whole hire: KSh 90,000 for a saloon, KSh 150,000 for the X-Trail, and KSh 200,000 for a Prado or Land Cruiser. Damage to the undercarriage is paid in full, with no limit. You don't pay for genuine mechanical faults or normal wear and tear. Add the optional collision damage waiver (KSh 1,500 a day for saloons, KSh 2,000 for SUVs and 4x4s) and you don't pay for accident or collision damage. Your agreement shows the limit for the vehicle you book.",
  },
  {
    title: "Fuel",
    body: "All our hire vehicles run on petrol. Return the vehicle with at least the fuel level it had at collection, which we record at handover. If it comes back with less fuel, we charge for the shortfall. If it comes back with more, the extra fuel is at your own cost: we don't refund or credit it.",
  },
  {
    title: "Hire days and late returns",
    body: "A hire day is 24 hours from your collection time. If you return after your agreed time, an extra day may be charged. Open Monday to Friday 08:00–17:00 and Saturday 08:00–13:00; pick-ups and returns outside these hours are by arrangement.",
  },
  {
    title: "Cancellations",
    body: "Cancel at least 14 days before collection for a full refund. After that, and for no-shows, we keep 20% of the booking price and refund 80%. If your vehicle becomes unavailable and we can't offer an equivalent, we may cancel and refund you in full.",
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
    a: "Every driver must be at least 25 and hold a valid driving licence recognised in Kenya for the vehicle. When you book, add a photo of the front of each driver's licence. Bring the licences and your ID or passport when you collect the vehicle: we check them at handover, and can't hand the vehicle over if the checks fail.",
  },
  {
    q: "How much do I pay to book, and is there a deposit?",
    a: "The full booking price is due when you book, including the optional collision damage waiver and any delivery charge. There is no security deposit. Your booking is confirmed once we have received the full payment and sent you confirmation. Nothing is added after you pay unless you agree to it.",
  },
  {
    q: "How can I pay?",
    a: "By M-Pesa (Lipa na M-Pesa, Buy Goods, till 211143) or by bank transfer to The Chequered Flag Ltd at Standard Chartered, Karen. Quote your booking reference. This page doesn't take the payment itself. If you already have an M-Pesa code, you can add it to the booking.",
  },
  {
    q: "What happens if the vehicle is damaged?",
    a: "Every vehicle is insured as the law requires. If the vehicle is damaged during your hire, for example in a collision, by a tyre blowout or to the windscreen or wheels, you pay the evidenced repair and recovery cost up to the damage liability limit: KSh 90,000 for a saloon, KSh 150,000 for the X-Trail, and KSh 200,000 for a Prado or Land Cruiser. The limit applies once to the whole hire, not to each incident, and it is not a fee taken in advance. We give you an itemised statement with evidence for any claim. Damage to the undercarriage (the underside of the vehicle) is different: it is paid in full, with no limit, and the collision damage waiver doesn't cover it. You don't pay for genuine mechanical or electrical faults or normal wear and tear. Your booking agreement shows the limit for the vehicle you book.",
  },
  {
    q: "What does the collision damage waiver cover?",
    a: "It's optional: KSh 1,500 a day for saloons and KSh 2,000 a day for SUVs and 4x4s, added when you book. With it, you don't pay for damage to the vehicle caused by an accident or collision, and the damage liability limit doesn't apply to that damage. It doesn't cover traffic, speeding or parking fines and tolls, or damage to the suspension, tyres, wheels, transmission or clutch caused by bad driving or by using the vehicle somewhere it isn't suited to; that damage is charged up to the damage liability limit, as it would be without the waiver. Damage to the undercarriage isn't covered either and is paid in full. Off-road motorsport and rallies are prohibited. Deliberate damage and fraud are never covered.",
  },
  {
    q: "What should I check when I collect the vehicle?",
    a: "Look the vehicle over before you drive away and tell us about any damage or missing accessories, with photos. We record the condition, fuel level and odometer reading at handover. Damage recorded before you drive away is never charged to you.",
  },
  {
    q: "Is there a mileage limit?",
    a: "Every vehicle includes 100 km a day, then KSh 15 per extra km, whichever vehicle you hire.",
  },
  {
    q: "What is the fuel policy?",
    a: "All our hire vehicles run on petrol. Return the vehicle with at least the fuel level it had at collection; we record it at handover. Less fuel than at collection: we charge for the shortfall at our refuelling rate. More fuel than at collection: the extra fuel is at your own cost, and we don't refund or credit it.",
  },
  {
    q: "Can you deliver the vehicle to me?",
    a: "Yes. Choose a delivery option in Find your vehicle, then search for your address or drop a pin on the map. You can also have it collected from a different place. Delivery is free within 15 km of our workshop in Karen, measured in a straight line to your pin. Beyond that, each km over 15 costs KSh 45 for a saloon, KSh 55 for an SUV and KSh 70 for a Prado or 4x4, for each trip. The charge is shown and added to the full amount when you book.",
  },
  {
    q: "Can I collect or return outside opening hours?",
    a: "Yes, by arrangement. We are open Monday to Friday 08:00–17:00 and Saturday 08:00–13:00. Tell us your plans when you book.",
  },
  {
    q: "What if I return the vehicle late?",
    a: "A hire day is 24 hours from your collection time. If you return after your agreed time, an extra day may be charged. Call or WhatsApp us as soon as you know you'll be late: a late return doesn't automatically extend your insurance or permission to drive.",
  },
  {
    q: "Can someone else drive?",
    a: "Only drivers named on your booking, or approved by us in writing. Add them with + Add driver when you book, with a photo of their licence. They must also be at least 25. You stay responsible for how they use the vehicle.",
  },
  {
    q: "Where can I take the vehicle?",
    a: "Anywhere in Kenya, on roads and tracks suitable for the vehicle. Off-road motorsport is strictly prohibited: no rallies (such as the Rhino Charge), racing, speed trials or competitive events, in any of our vehicles, including the 4x4s. Saloon cars and the Nissan X-Trail must not be taken into national parks, game parks or game reserves. Travel outside Kenya needs our written consent and confirmed insurance first. The vehicle must not be used for towing, carrying passengers or goods for payment, or driven under the influence of alcohol or drugs.",
  },
  {
    q: "What happens if the vehicle breaks down or I have an accident?",
    a: "Stop safely and call us straight away on " + CONTACT.phoneDisplay + ". For an accident or theft, report it to the police where required and take photos if it is safe. Please don't arrange repairs or recovery yourself unless it's an emergency. If the fault is mechanical and not caused by you, we pay for recovery and repairs and try to give you a replacement at no extra cost; if we can't, you get a refund for the days you couldn't use the vehicle.",
  },
  {
    q: "Who pays traffic fines, parking and tolls?",
    a: "You do, for anything that happens during your hire, unless we caused it. These are separate from the damage liability limit.",
  },
  {
    q: "Can I cancel or change my booking?",
    a: "Cancel at least 14 days before collection for a full refund. After that, and for no-shows, we keep 20% of the booking price and refund 80%. Refunds go back to the way you paid within 7 business days. Every booking is reviewed after it is placed: if your vehicle becomes unavailable before collection (for example after a breakdown or accident) and we can't offer you an equivalent or better one, we may cancel the booking and you get a full refund. To change a booking, contact us as early as possible; changes after confirmation need both of us to agree.",
  },
  {
    q: "What do you do with my information?",
    a: "We use your details, licence photos and booking records to run your hire, check drivers, handle payments and claims, and meet the law. Licence photos are only seen by our staff. You can ask to see, correct or delete your information by emailing " + CONTACT.email + ", or complain to Kenya's Office of the Data Protection Commissioner.",
  },
];

export const metadata = {
  title: "Vehicle hire",
  description:
    "Self-drive saloons, SUVs, Prados and a Land Cruiser for hire in Nairobi. Book online, with delivery available.",
};

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
      <CustomerReviews wrap={sectionWrap} eyebrow={eyebrow} h2={h2} />
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
