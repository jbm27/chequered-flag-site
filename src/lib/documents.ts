import { COMPANY, CONTACT } from "./contact";
import { plain } from "./review";

// Driver licences, extra drivers and the signed hire agreement for a website booking.
// Used by the booking page (browser), the booking API (server) and the desk.
//
// Privacy: licence photos and signatures are personal data. They are stored in booking_documents and are only
// returned to signed-in staff (/api/hire/staff/bookings/documents). The customer's own PDF is made in their
// browser from what they have just entered, so nothing is served back to the public.

export const MAX_DRIVERS = 3; // the main driver plus up to two extra drivers
export const MAX_IMAGE_BYTES = 650_000; // per image, after the browser has shrunk it
export const MAX_IMAGE_SIDE = 4000;

// The hire agreement shown in the scrolling window at checkout and printed in the booking PDF.
// Source: "Chequered Flag Online Hire Agreement (Revised)" supplied by Homer, Nov 2026. Section A is the Booking
// Schedule, filled in for each booking (see bookingSchedule below); clauses 1-14 and section B are copied as written.
// Section C (platform implementation notes) and the legislation list are internal and are not shown to customers.
// The four bracketed blanks in the draft are filled with the website contact details and the company P.O Box.
// Change AGREEMENT_VERSION whenever the text changes, so each booking records which version the customer signed.
// Layout: "# " starts a heading; "{{SCHEDULE}}" is where the Booking Schedule table goes.
// Version history: online-hire-agreement-2026-11-revised (Homer's revised text); -b adds the Land Cruiser
// at KES 200,000, the same as the Prado (Homer, 16 Nov 2026), in the class mapping and clause 7.2;
// -c adds clause 1.4: every booking is subject to review and may be cancelled with a full refund (Homer).
// -d adds clause 7.7, the optional collision damage waiver, and shows the waiver and this vehicle's limit in the Booking Schedule (Homer).
// -e (Homer, 23 Nov 2026): off-road motorsport prohibited (6.4), no saloon cars or X-Trail in game parks (6.5),
// undercarriage damage paid in full (7.8, out of 7.1 and the waiver), no 59-minute late-return grace (3.2), and
// fuel made explicit (10.1): less fuel is charged, extra fuel is at the hirer's cost with no refund or credit,
// and a police abstract is required after any accident, theft or vandalism (9.4).
// -f (Homer, 25 Nov 2026, from the review of the first revision): late returns WILL be charged per 24 hours (3.2);
// licence and ID presented at handover (2.1); charges in the agreement need no further agreement (3.1); fees and
// fines payable on demand (3.4); paper handover form signed by both sides (5.2-5.4, 10.4, section B); damage not on
// the form is treated as happening during the hire (5.3); wildlife conservancies (6.5); the hirer pays for damage
// whoever caused it, assessed from invoices or quotes, with "customer-attributable" removed (7.1, 7.2, 8.2); damage
// limits + VAT (7.2); refunds "will" be made (1.4). Clauses 3.3 (deposit) and 11.2 (admin fee) are unchanged until
// Homer and James decide. The wording below carries review markers (lib/review.ts); AGREEMENT_TEXT is clean.
// Also in -f (Homer, 26 Nov 2026): no minimum age. The insurer only requires a valid driving licence (2.1).
export const AGREEMENT_VERSION = "online-hire-agreement-2026-11-revised-f";
export const AGREEMENT_TITLE = "Self-drive vehicle hire agreement";
export const AGREEMENT_MARKED: string[] = [
  "Contracting company: The Chequered Flag Ltd. (“Company”, “we”, “us”). Registered address: " + COMPANY.postal + ". Booking enquiries and incident contact: " + CONTACT.phoneDisplay + ", " + CONTACT.email + ".",
  "This agreement consists of the Booking Schedule, these Rental Terms and the Vehicle Handover/Return Records.",
  "# A. Booking Schedule",
  "{{SCHEDULE}}",
  "Vehicle-class mapping (not editable by the customer): saloon → KES 90,000⟦ + VAT⟧; Nissan X-Trail → KES 150,000⟦ + VAT⟧; Toyota Prado → KES 200,000⟦ + VAT⟧; Toyota Land Cruiser → KES 200,000⟦ + VAT⟧. Any other class must be configured and disclosed before payment; no automatic default is permitted.",
  "# 1. Agreement and booking",
  "1.1 The Company hires the vehicle identified in the Booking Schedule (or an agreed equivalent or better replacement) to the Hirer for the stated period, subject to these Terms. A booking is confirmed only once full payment has been received and the Company has issued confirmation.",
  "1.2 The Company shall show the full price, cancellation policy, applicable damage liability limit, fuel and mileage policy, and material restrictions before the Hirer pays. The Hirer must be able to download or receive a durable copy of the accepted agreement.",
  "1.3 The vehicle remains the property of the Company or its lawful owner. No ownership rights pass to the Hirer. Any change to the booking after confirmation requires both parties’ agreement and a revised confirmation.",
  "1.4 Every booking is subject to review by the Company after it is placed. If the booked vehicle becomes unavailable before collection, for example because of a breakdown, accident or damage, and the Company cannot provide an agreed equivalent or better replacement, the Company may cancel the booking. The Company ⟦will⟧⟪shall⟫ tell the Hirer as soon as practicable, and ⟦will refund the Hirer in full for⟧⟪the Hirer shall receive a full refund of⟫ all amounts paid for that booking, as set out in clause 4.5.",
  "# 2. Eligibility and authorised drivers",
  "2.1 Every driver must ⟪be at least 25 years old, ⟫hold a valid licence recognised in Kenya for the vehicle class and satisfy the Company’s reasonable identity and licence checks. ⟦Every driver must present their driving licence and a valid national ID or passport at handover.⟧ The Company may refuse handover if the checks fail and ⟦will apply the cancellation and no-show charges in clause 4 of this agreement⟧⟪shall apply any cancellation/no-show charges only as permitted by applicable law⟫.",
  "2.2 Only drivers specifically listed in the Booking Schedule or subsequently authorised by the Company in writing may drive. The Hirer remains responsible for ensuring that authorised drivers comply with this agreement.",
  "2.3 The Hirer confirms that information supplied is accurate and shall promptly disclose relevant restrictions, disqualifications or circumstances that legally prevent any proposed driver from operating the vehicle. The Company will not routinely request sensitive medical details unless necessary and lawfully justified.",
  "# 3. Payments, rental periods and deposits",
  "3.1 The Total Booking Price is due in full when the booking is placed. The booking platform shall show whether stated prices include VAT and any other mandatory charges⟦. Charges set out in this agreement, including the cancellation fee (clause 4), fuel, excess mileage, late returns, fines and damage, may be charged without further agreement⟧⟪; no mandatory booking charges may be added after payment without express agreement⟫.",
  "3.2 Rental periods are measured in consecutive 24-hour blocks beginning at the agreed collection time. If the vehicle is returned after the agreed return time, an additional ⟦24-hour rental period will be charged⟧⟪rental day may be charged⟫ at the ⟦daily⟧ rate disclosed in the Booking Schedule⟦ for each 24 hours, or part of 24 hours, after the agreed return time⟧⟪, unless otherwise agreed⟫. A late return must be reported promptly and does not extend insurance or permission to drive automatically.",
  "3.3 A security deposit, where expressly specified, is separate from the rental payment and from the damage liability limit. The Company may deduct only documented sums properly owed under this agreement, with an itemised explanation. The undisputed balance shall be released or refunded within 7 business days after vehicle return, except where a documented pending claim reasonably requires a longer hold, which must be explained to the Hirer. Bank or card processing times may vary.",
  "3.4 Parking charges, traffic fines, tolls, fuel shortfalls, excess mileage and agreed optional extras ⟦are payable by the Hirer on demand⟧⟪may be payable separately where applicable⟫ and supported by records; they do not increase the cap for vehicle damage in clause 7.",
  "# 4. Cancellations and refunds",
  "4.1 The Hirer may cancel using the booking platform or the Company’s published contact channel. The effective cancellation time is when the cancellation request is received and recorded (East Africa Time, UTC+3).",
  "4.2 If cancellation is received at least 14 × 24 hours before the scheduled collection time, the Company shall refund 100% of the Total Booking Price.",
  "4.3 If cancellation is received less than 14 × 24 hours before scheduled collection, but before collection, the Company shall retain a cancellation fee of 20% of the Total Booking Price and refund the remaining 80%. This also applies to a no-show⟪ unless mandatory law requires a different result⟫.",
  "4.4 Once the rental has commenced, early return or unused days do not automatically entitle the Hirer to a refund, except where expressly agreed, required by law or due under clause 8 for Company-attributable unavailability.",
  "4.5 Approved refunds shall be initiated to the original payment method within 7 business days after the cancellation or refund decision, subject to payment-provider settlement times. If the Company cancels or cannot supply the booked or an acceptable equivalent vehicle, the Hirer may reject a substitute and receive a full refund of amounts paid for the affected booking. Statutory cancellation and consumer rights prevail over this clause.",
  "# 5. Collection, inspection and pre-existing damage",
  "5.1 At collection, the Company shall make the vehicle available for a reasonable visual inspection ⟦with the Company’s representative⟧ and provide the Hirer with an opportunity to view or record its condition, fuel level, odometer reading and supplied accessories.",
  "5.2 The Hirer has primary responsibility to inspect and report any pre-existing visible damage, missing accessories or discrepancies BEFORE driving the vehicle away. ⟦The Hirer and the Company’s representative inspect the vehicle together in person and record any such damage, missing accessories or discrepancies on the paper handover form, which both sign before the vehicle is driven away (section B).⟧⟪ The Hirer should submit the report through the digital handover form, with timestamped photographs showing the relevant damage and registration number. If the system is unavailable, the Hirer must immediately notify the Company by its published contact channel and preserve photographic evidence.⟫",
  "5.3 Damage recorded ⟦on the signed handover form⟧⟪ by the Company before collection, or reported by the Hirer at handover before driving,⟫ shall not be charged to the Hirer. ⟦Any other damage found on the vehicle is treated as having occurred during the rental and is charged under clause 7, unless the Hirer shows that it was present at collection.⟧⟪ A failure to report visible damage at handover may be treated as relevant evidence of its absence at collection, but is not conclusive proof that the Hirer caused it. Neither party may charge the other for pre-existing damage demonstrably supported by reliable evidence.⟫",
  "5.4 The Company may take ⟦photographs of the vehicle at handover and return⟧⟪its own timestamped inspection photographs and shall provide the Hirer access to the agreed condition record⟫. The Hirer ⟦is given a copy of the signed handover form. The Hirer⟧ must not drive away if the vehicle appears unsafe; the Company shall address the safety issue or apply clause 8.",
  "# 6. Permitted and prohibited use",
  "6.1 The vehicle may be used only within Kenya, on roads or tracks reasonably suitable for that vehicle and consistent with applicable insurance terms. No travel outside Kenya without advance written Company consent and confirmed insurance cover.",
  "6.2 The vehicle shall not be used by an unauthorised or unlicensed driver; for racing or speed trials (see also clause 6.4); for hire/reward or towing without permission; while a driver is impaired by alcohol or drugs; while overloaded; or in a reckless, unlawful or deliberately damaging manner. The Hirer must secure the vehicle and keys reasonably when unattended.",
  "6.3 The Hirer must not sell, pledge, sub-hire or materially modify the vehicle; tamper with the odometer or telematics; or authorise non-emergency repairs without the Company’s consent. The Hirer shall immediately notify the Company if the vehicle cannot safely continue.",
  "6.4 OFF-ROAD MOTORSPORT IS PROHIBITED. No vehicle may be used for rallies or any other off-road motorsport (for example the Rhino Charge), racing, speed trials, or any timed or competitive event, or for practice for any of them. This applies to every vehicle in the fleet, including the 4x4s.",
  "6.5 NO SALOON CARS OR NISSAN X-TRAIL IN GAME PARKS⟦ OR CONSERVANCIES⟧. Saloon cars and the Nissan X-Trail must not be taken into national parks, game parks⟦, game reserves or wildlife conservancies⟧⟪ or game reserves⟫.",
  "# 7. Vehicle damage, theft, insurance and the liability cap",
  "7.1 For ⟪accidental⟫ loss or damage to the hired vehicle during the rental, ⟦whoever caused it (including where another driver is at fault),⟧ including collision, tyre blowout, wheel, suspension or windscreen damage (but not undercarriage damage, see clause 7.8), and ⟪customer-attributable⟫ breakdowns caused by misuse, impact, negligent driving or a road hazard, the Hirer is responsible for the Company’s ⟪reasonable, evidenced⟫ vehicle repair/replacement and related recovery costs, ⟦as assessed by the Company from repair invoices or quotes,⟧ UP TO the single aggregate Damage Liability Limit stated in the Booking Schedule for that hire. ⟦If the Company recovers any of that cost from another driver or an insurer, it will refund the Hirer accordingly (clause 7.6).⟧",
  "7.2 The Damage Liability Limit is KES 90,000⟦ + VAT⟧ for a saloon, KES 150,000⟦ + VAT⟧ for an X-Trail and KES 200,000⟦ + VAT⟧ for a Prado or a Land Cruiser. It applies in total across all ⟪customer-attributable⟫ vehicle-damage incidents during the same hire, not separately per incident or per component. Recovery/towing attributable to that vehicle damage counts within, not on top of, the cap. The cap is not an upfront fee, deductible automatically due, or authorisation to charge without evidence of loss.",
  "7.3 The Hirer does not pay for genuine mechanical/electrical breakdown, latent defects or ordinary wear and tear not caused or materially contributed to by the Hirer or an authorised driver. In a mixed-cause case, charges shall reflect reasonably evidenced customer-attributable loss and remain subject to the cap.",
  "7.4 The Company shall maintain motor insurance as required by Kenyan law and ensure that any represented self-drive and vehicle-damage protections are consistent with the actual policy. Nothing in this agreement purports to limit third-party legal rights or compulsory insurance protections. The Company must disclose material insurance restrictions relevant to the intended hire before payment.",
  "7.5 The vehicle-damage cap does not limit properly due rental charges, refuelling, tolls, fines or other independent debts. It does not limit liability for proven fraud, deliberate damage or other liability that cannot lawfully be limited, but no exclusion of the cap may be asserted merely because an accident occurred or on the basis of an undisclosed insurance term. Any proposed exceptions to the cap must be clearly disclosed before booking and checked against the insurer’s policy.",
  "7.6 The Company shall provide a written, itemised statement and supporting evidence for any damage claim, account for salvage/insurance recoveries where relevant so there is no double recovery, and allow the Hirer a reasonable opportunity to dispute it.",
  "7.7 Collision damage waiver. Where the Booking Schedule shows that the Hirer has taken the optional collision damage waiver and paid for it, the Hirer shall not pay for damage to the hired vehicle caused by an accident or collision during the rental, and the Damage Liability Limit in clause 7.2 does not apply to that damage. The waiver does not cover: (a) traffic, speeding and parking fines, tolls and other charges under clause 11; (b) damage to the suspension, tyres, wheels, transmission or clutch caused by negligent, reckless or abusive driving, or by use the vehicle is not suitable for or that is prohibited under clause 6, such as off-road motorsport; (c) damage to the undercarriage, which is paid in full under clause 7.8; or (d) proven fraud or deliberate damage. Damage under (b) is charged as though the waiver had not been taken, up to the Damage Liability Limit, and clauses 7.3 and 7.6 still apply. If the waiver is not taken, clauses 7.1 and 7.2 apply in full.",
  "7.8 UNDERCARRIAGE DAMAGE IS PAID IN FULL. Damage to the undercarriage (the underside of the vehicle and the parts fitted there) during the rental is not limited by the Damage Liability Limit in clause 7.2 and is not covered by the collision damage waiver in clause 7.7. The Hirer pays the Company's reasonable, evidenced repair and related recovery costs for it in full. Clauses 7.3 and 7.6 still apply.",
  "# 8. Breakdowns, roadside assistance and unavailability",
  "8.1 If the vehicle becomes unsafe, fails or breaks down, the Hirer must stop safely, contact the Company promptly, follow reasonable safety instructions and not arrange non-emergency repairs or recovery without approval. Emergency measures to protect people or prevent immediate further loss are permitted.",
  "8.2 Where breakdown or loss of use results from ⟦an⟧⟪customer-attributable⟫ accident, impact, tyre blowout, misuse or negligent driving, the Hirer bears reasonable evidenced repair and recovery costs subject to clause 7. The Company will assist with arranging recovery; a replacement vehicle is not guaranteed and any further hire will require agreement.",
  "8.3 Where breakdown is mechanical or electrical and not attributable to the Hirer, the Company shall pay the reasonable recovery and repair costs and use reasonable efforts to provide a suitable replacement as promptly as practicable, at no extra rental charge.",
  "8.4 If a Company-attributable fault makes the car unusable and no suitable replacement is supplied within a reasonable period, the Hirer is entitled to a pro-rata refund for the unusable rental period, including the remaining booking period if the hire must end. The Company is not liable for indirect or consequential losses such as missed flights, accommodation or lost earnings, except to the extent such liability cannot lawfully be excluded or the loss results from proven negligence or misconduct for which exclusion would be unlawful.",
  "8.5 The parties shall preserve relevant evidence (photographs, incident details, diagnostic findings and repair records). The Company will not assume driver fault solely because the defect arose during the hire.",
  "# 9. Accidents, theft and incident reporting",
  "9.1 For any accident, theft, vandalism or serious damage, the Hirer must first attend to personal safety and seek emergency help. The Hirer must notify the Company as soon as reasonably practicable, report it to the police and obtain a police abstract (clause 9.4), take reasonable photographs and obtain third-party details where safe and lawful.",
  "9.2 The Hirer shall cooperate reasonably with insurers, police and the Company, provide truthful information, and shall not admit legal liability or settle a claim on the Company’s behalf without authorisation. This does not prevent accurate factual statements or necessary emergency action.",
  "9.3 The Hirer must take reasonable steps to safeguard the vehicle and keys and minimise further loss. Costs and liabilities remain subject to clause 7 where they concern damage to the hired vehicle.",
  "9.4 POLICE ABSTRACT. After any accident, theft or vandalism involving the vehicle, the Hirer must report it at the nearest police station as soon as reasonably practicable, obtain a police abstract, and give the Company a copy (a photo of it is enough at first, with the original handed over when the vehicle is returned). The Company's insurer needs the police abstract to handle any claim.",
  "# 10. Fuel, mileage, accessories and return",
  "10.1 The fuel level and odometer reading at collection shall be recorded in the handover record. The Hirer shall return the vehicle with at least the fuel level recorded at collection. IF THE FUEL LEVEL IS LOWER ON RETURN, the Company shall charge the Hirer for the shortfall at the disclosed refuelling rate, supported by the collection and return records. IF THE FUEL LEVEL IS HIGHER ON RETURN, the extra fuel is at the Hirer's own cost: no refund, credit or payment is given for it.",
  "10.2 Mileage limits and excess rates, if any, must appear in the Booking Schedule. Unexplained odometer anomalies shall be investigated using reliable evidence; no arbitrary mileage penalty applies merely because a device fails.",
  "10.3 The Hirer shall return supplied keys, tools and accessories listed in the handover report. Reasonable evidenced replacement costs for lost items may be charged, subject to any applicable legal restrictions; damage to accessories arising from an accident is included in the clause 7 cap.",
  "10.4 Return condition, fuel, mileage and accessories shall be ⟦recorded on the return section of the handover form⟧⟪documented promptly using timestamped photographs⟫. The Company shall notify the Hirer of any proposed damage charges with supporting evidence within a reasonable period, normally within 5 business days after return, without prejudice to later-discovered concealed damage evidenced as rental-related.",
  "# 11. Fines, enforcement and lawful disclosure",
  "11.1 The Hirer is responsible for traffic, parking, toll and other lawful charges arising from their use of the vehicle during the rental, except those caused by the Company. The Company may provide driver details to lawful authorities, subject to data-protection law.",
  "11.2 Any separately disclosed, reasonable administration fee for processing such notices must appear in the Booking Schedule or price list accepted before payment.",
  "# 12. Privacy, identification and vehicle tracking",
  "12.1 The Company is a data controller in relation to personal information collected for the booking. It may process name, contact details, identity and driving-licence verification, authorised driver information, payment/transaction references, booking records, communications, vehicle handover photographs, incident reports and, if installed and disclosed, vehicle-location/telematics data.",
  "12.2 Processing purposes include booking performance, identity and driver eligibility checks, payment and deposit administration, vehicle protection and recovery, safety, disputes, insurance claims, fraud prevention and compliance with law. The Company shall identify the applicable legal basis for each purpose in a separate accessible Privacy Notice; marketing requires a separate lawful basis and choice, not bundled compulsory consent.",
  "12.3 Before collecting data, the Company shall provide a Privacy Notice explaining what is collected, why, whether it is compulsory, who receives it (such as payment processors, identity-verification providers, insurers, vehicle recovery operators, IT providers and lawful authorities), international transfers and safeguards where applicable, retention periods or criteria, security measures and data-subject rights.",
  "12.4 The Company shall apply appropriate access controls, security and limited retention, and shall not store raw card numbers or CVVs in its booking system. Identity and licence photographs must be accessible only to authorised staff/providers and deleted or anonymised when no longer necessary for legal, insurance or legitimate retention needs.",
  "12.5 Where GPS/telematics are fitted, the Company shall disclose that fact before booking, together with the purposes (for example theft recovery, fleet safety, location of a stranded vehicle or authorised geofencing), access controls, retention and any applicable monitoring limits. GPS monitoring shall not be used covertly for unrelated purposes.",
  "12.6 Hirers and authorised drivers may request access, correction, objection or deletion where applicable, and may contact " + CONTACT.email + " or lodge a complaint with Kenya’s Office of the Data Protection Commissioner. The booking platform must provide the full Privacy Notice separately; these short terms do not replace it.",
  "# 13. Liability, disputes and governing law",
  "13.1 Neither party excludes or restricts liability that cannot lawfully be excluded, including statutory consumer rights and liability arising from its own negligence where exclusion would be unlawful. Any contractual limitation shall be read subject to applicable Kenyan law.",
  "13.2 The Hirer should first send a complaint or disputed charge to " + CONTACT.email + " or " + CONTACT.phoneDisplay + ". The Company shall acknowledge and investigate it reasonably, provide relevant records and endeavour to resolve it within 14 business days. This does not restrict lawful recourse to regulators or the courts.",
  "13.3 Kenyan law governs this agreement. The courts of Kenya have jurisdiction, without depriving a consumer of any mandatory statutory rights. If a provision is unenforceable, the remainder remains effective to the extent lawful.",
  "13.4 Changes to these Terms after payment do not apply to an existing confirmed booking unless the Hirer expressly agrees or the change is legally required and properly notified.",
  "# 14. Electronic acceptance and recordkeeping",
  "14.1 By selecting the clearly labelled “I agree to the Rental Terms” control and confirming payment, the Hirer accepts the Booking Schedule and these Terms. Acceptance must not be pre-ticked; the booking platform shall record the contract version, exact values shown (including the vehicle-damage limit and cancellation terms), timestamp and relevant acceptance audit information.",
  "14.2 A copy of the completed agreement and payment confirmation shall be emailed or made available for download. Any material later amendments must be separately accepted. The handover condition report is supplementary and is completed when the vehicle is collected.",
  "14.3 If any conflicting information appears between the Booking Schedule and these standard terms, the more specific clearly disclosed and mutually agreed Booking Schedule entry prevails, except where inconsistent with mandatory law.",
  "# B. ⟦Handover and return record⟧⟪Digital Handover / Return Record⟫",
  "⟦At collection, the Hirer and the Company’s representative inspect the vehicle together. On the paper handover form they note any existing damage, the fuel level, the odometer reading, and the keys and accessories supplied. Both sign the form before the vehicle is driven away, and the Hirer is given a copy or a photo of it. Every driver must show their driving licence and a valid ID or passport at handover.⟧",
  "⟦At return, the vehicle is checked again in the same way and the return section of the form is completed and signed. If the Hirer is not present when the vehicle is returned or collected, the Company completes the return section and sends the Hirer a copy.⟧",
  "⟦Any damage not noted on the signed handover form is treated as having happened during the hire (clause 5.3).⟧",
  "⟦By signing the handover form, the Hirer confirms: “I have inspected the vehicle with the Company’s representative. All the existing damage I could see is noted on this form, and I accept the fuel level, odometer reading, keys and accessories recorded.”⟧",
  "⟪Complete at physical handover. The customer submits or confirms the initial condition report before driving away. Customer-facing confirmation: “I have inspected the vehicle before driving away, had a reasonable opportunity to report visible pre-existing damage, and submitted any exceptions through the handover process. I understand that this record may be considered when assessing later damage claims.”⟫",
];

// The clean agreement (no review markers): printed in the booking PDF, saved with bookings and shown on the desk.
export const AGREEMENT_TEXT: string[] = AGREEMENT_MARKED.map(plain).filter((line) => line.trim() !== "");

// How far a line of the agreement is indented (0, 1 or 2) and its text without the layout tabs.
export function agreementLine(line: string): { kind: "heading" | "schedule" | "text"; level: number; text: string } {
  if (line === "{{SCHEDULE}}") return { kind: "schedule", level: 0, text: "" };
  if (line.startsWith("# ")) return { kind: "heading", level: 0, text: line.slice(2) };
  const match = /^\t*/.exec(line);
  const level = Math.min(2, match ? match[0].length : 0);
  return { kind: "text", level, text: line.slice(level) };
}

// Damage Liability Limit per hire (clause 7.2): saloon KES 90,000, Nissan X-Trail KES 150,000, Toyota Prado
// KES 200,000; Toyota Land Cruiser KES 200,000 (Homer, 16 Nov 2026). The agreement says any other class must be
// set before payment, with no default, so a vehicle without a limit here can't be booked online until one is added.
export function damageLimitFor(model: string, category?: string): number | null {
  if (/prado|land cruiser/i.test(model)) return 200_000;
  if (/x-?trail/i.test(model)) return 150_000;
  if (category === "saloon") return 90_000;
  return null;
}

// Mileage, as on the hire page.
// Every vehicle has the same mileage terms (Homer, Nov 2026; 4x4s were unlimited before).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mileageFor(category?: string) {
  return "100 km a day included, then KSh 15 per extra km";
}

// Cancellation terms (clause 4), shown before payment.
export const CANCELLATION_SUMMARY_MARKED =
  "Cancel at least 14 days (14 × 24 hours) before collection for a full refund. Cancellations after that, and no-shows, keep 20% of the total booking price as a cancellation fee and refund 80%.";
export const CANCELLATION_SUMMARY = plain(CANCELLATION_SUMMARY_MARKED);

export const FUEL_POLICY_MARKED =
  "Return the vehicle with at least the fuel level it had at collection. Less fuel: the shortfall is charged. More fuel: the extra is at your own cost, with no refund or credit (clause 10.1).⟦ Fuel used for delivery and collection is included in the delivery charge.⟧";
export const FUEL_POLICY = plain(FUEL_POLICY_MARKED);

// The values a customer saw and agreed to, kept with the booking (clause 14.1).
export type ScheduleValues = {
  reference: string; // "" until the booking is submitted
  hirer: { name: string; email: string; phone: string };
  verification: string;
  drivers: string[];
  vehicle: string;
  collect: string;
  ret: string;
  price: string;
  damageLimit: number | null;
  category?: string; // saloon, suv or 4x4: saloon cars and the X-Trail can't go into game parks (clause 6.5)
  waiver: string; // the waiver charge, e.g. "KSh 4,500 for 3 days", or "" when not taken
  mileage: string;
};

// Section A, the Booking Schedule, as label and value rows.
// The clean schedule (no review markers), as saved with the booking and printed in the PDF.
export function bookingSchedule(v: ScheduleValues): [string, string][] {
  return bookingScheduleMarked(v).map(([label, value]) => [plain(label), plain(value)]);
}

// The schedule with review markers, for the agreement window at checkout.
export function bookingScheduleMarked(v: ScheduleValues): [string, string][] {
  const kes = (n: number) => "KES " + n.toLocaleString("en-US") + "⟦ + VAT⟧";
  return [
    ["Booking reference / contract version", (v.reference || "Given when you submit the booking") + " | " + AGREEMENT_VERSION],
    ["Hirer / contact", [v.hirer.name, v.hirer.email, v.hirer.phone].filter(Boolean).join(" | ")],
    ["Identity / licence verification", v.verification],
    ["Authorised drivers", v.drivers.filter(Boolean).join(", ")],
    ["Vehicle", v.vehicle + " | registration given at handover"],
    ["Collect / return", v.collect + " → " + v.ret],
    ["Booking price", v.price],
    ["Payment", "100% of Total Booking Price payable upon booking confirmation"],
    [
      "Damage liability limit",
      v.damageLimit
        ? kes(v.damageLimit) + " for this vehicle, per hire, subject to clause 7" +
          ". Does not apply to accident or collision damage ⟦if⟧⟪, as⟫ the collision damage waiver is taken (clause 7.7)"
        : "Not set: call us to book this vehicle",
    ],
    [
      "Collision damage waiver",
      v.waiver
        ? "Taken, " + v.waiver + ". Covers accident and collision damage to the vehicle. Fines, undercarriage damage, and damage to suspension, tyres, wheels or transmission from bad driving or unsuitable use, are not covered (clause 7.7)"
        : "Not taken. Damage is charged up to the damage liability limit (clauses 7.1 and 7.2)",
    ],
    ["Undercarriage damage", "Paid in full: not limited by the damage liability limit or covered by the waiver (clause 7.8)"],
    ["Accident, theft or vandalism", "Report it to the police, obtain a police abstract and give us a copy (clause 9.4)"],
    ["Off-road motorsport", "Prohibited, including rallies such as the Rhino Charge (clause 6.4)"],
    ...(v.category === "saloon" || v.category === "suv"
      ? ([["Game parks", "Not allowed: this vehicle must not be taken into national parks, game parks⟦, game reserves or wildlife conservancies⟧⟪ or game reserves⟫ (clause 6.5)"]] as [string, string][])
      : []),
    ["Mileage", v.mileage],
    ["Security deposit, if applicable", "None"],
    ["Fuel / special restrictions", FUEL_POLICY_MARKED],
    ["Cancellation", CANCELLATION_SUMMARY_MARKED],
    ["Late returns", "⟦An extra 24-hour period is charged for each 24 hours, or part of 24 hours, after the agreed return time (clause 3.2)⟧"],
    ["Condition report", "⟦Paper handover form, inspected and signed by the hirer and our representative before the vehicle is driven away (section B)⟧⟪To be completed at collection before the vehicle is driven⟫"],
  ];
}

export type DocImage = { data: string; w: number; h: number }; // JPEG data URL and its size in pixels

// fromFile: the main driver's licence was reused from one kept on file (staff check it at handover).
// addedBy/addedAt: the licence or driver was added on the desk by staff (for example for a phone booking).
export type DriverDoc = {
  name: string;
  phone: string;
  licence: DocImage;
  fromFile?: boolean;
  onFileSince?: string;
  addedBy?: string;
  addedAt?: string;
};

// A returning customer can reuse their licence for this long after it was uploaded.
export const LICENCE_ON_FILE_MONTHS = 12;

export type LicenceOnFile = { licence: DocImage; savedAt: string; reference: string };

// kind "none": no agreement was signed online (a booking made on the desk); name is the staff member who
// added the licences.
export type SignatureDoc =
  | { kind: "drawn"; name: string; image: DocImage }
  | { kind: "typed"; name: string }
  | { kind: "none"; name: string };

export type BookingDocuments = {
  drivers: DriverDoc[]; // drivers[0] is the main driver (the person booking)
  signature: SignatureDoc;
  agreementVersion: string;
  keepOnFile?: boolean; // the customer agreed to keep their licence for future bookings
};

// schedule: the Booking Schedule rows exactly as agreed, saved by the server with the booking (clause 14.1).
export type StoredDocuments = BookingDocuments & { signedAt: string; schedule?: [string, string][] | null };

function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanImage(value: unknown, what: string): DocImage | string {
  const raw = (value || {}) as Partial<DocImage>;
  const data = String(raw.data || "");
  const prefix = "data:image/jpeg;base64,";
  if (!data.startsWith(prefix)) return "Add a photo for " + what + ".";
  const base64 = data.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return "The photo for " + what + " could not be read. Please try again.";
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) return "The photo for " + what + " is too large. Please try a smaller photo.";
  const w = Math.round(Number(raw.w));
  const h = Math.round(Number(raw.h));
  if (!(w > 0 && h > 0 && w <= MAX_IMAGE_SIDE && h <= MAX_IMAGE_SIDE)) return "The photo for " + what + " could not be read.";
  return { data, w, h };
}

// Checks what the booking page sent. The main driver's name and phone come from the booking itself.
// mainOnFile is the licence kept on file for this email and phone, looked up by the server beforehand.
export function validateDocuments(
  raw: unknown,
  main: { name: string; phone: string },
  mainOnFile?: LicenceOnFile | null,
): { ok: true; docs: BookingDocuments } | { ok: false; error: string } {
  const input = (raw || {}) as {
    drivers?: unknown[];
    signature?: Record<string, unknown>;
    agreementVersion?: unknown;
    keepOnFile?: unknown;
  };
  const list = Array.isArray(input.drivers) ? input.drivers : [];
  if (!list.length) return { ok: false, error: "Add a photo of the front of your driving licence." };
  if (list.length > MAX_DRIVERS) return { ok: false, error: "A booking can have up to " + MAX_DRIVERS + " drivers." };

  const drivers: DriverDoc[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const item = (list[index] || {}) as Record<string, unknown>;
    const isMain = index === 0;
    const label = isMain ? "your driving licence" : "driver " + (index + 1) + "'s licence";
    const name = isMain ? main.name : cleanText(item.name, 120);
    const phone = isMain ? main.phone : cleanText(item.phone, 40);
    if (!isMain && name.length < 2) return { ok: false, error: "Enter the full name of driver " + (index + 1) + "." };
    const digits = phone.replace(/\D/g, "");
    if (!isMain && (digits.length < 9 || digits.length > 15)) {
      return { ok: false, error: "Enter a mobile number for driver " + (index + 1) + "." };
    }
    if (isMain && item.useOnFile === true) {
      if (!mainOnFile) {
        return { ok: false, error: "We couldn't find your licence on file. Please add a photo of the front of your driving licence." };
      }
      drivers.push({ name, phone, licence: mainOnFile.licence, fromFile: true, onFileSince: mainOnFile.savedAt });
      continue;
    }
    const licence = cleanImage(item.licence, label);
    if (typeof licence === "string") return { ok: false, error: licence };
    drivers.push({ name, phone, licence });
  }

  const sig = input.signature || {};
  const kind = sig.kind === "drawn" ? "drawn" : sig.kind === "typed" ? "typed" : "";
  const signedName = cleanText(sig.name, 120);
  if (!kind) return { ok: false, error: "Sign the hire agreement by drawing or typing your name." };
  let signature: SignatureDoc;
  if (kind === "typed") {
    if (signedName.length < 2) return { ok: false, error: "Type your full name to sign the hire agreement." };
    signature = { kind: "typed", name: signedName };
  } else {
    const image = cleanImage(sig.image, "your signature");
    if (typeof image === "string") return { ok: false, error: "Draw your signature in the box to sign the hire agreement." };
    signature = { kind: "drawn", name: main.name, image };
  }

  if (String(input.agreementVersion || "") !== AGREEMENT_VERSION) {
    return { ok: false, error: "The hire agreement has been updated. Please reload the page and sign again." };
  }
  return {
    ok: true,
    docs: { drivers, signature, agreementVersion: AGREEMENT_VERSION, keepOnFile: input.keepOnFile === true && !drivers[0].fromFile },
  };
}
