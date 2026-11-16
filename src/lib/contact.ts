export const CONTACT = {
  phoneDisplay: "+254 720 514965",
  phoneE164: "+254720 514965", // digits only after +254, no spaces
  whatsappE164: "+254720 514965", // usually same as phone
  email: "reception@chequeredflag.co.ke",
  locationShort: "Ngong Road, Karen, Nairobi",
};

// How customers pay (from The Chequered Flag's invoice). Shown in checkout, on the confirmation and in the PDF.
export const PAYMENT = {
  mpesaTill: "211143",
  bankName: "Standard Chartered Bank",
  accountName: "The Chequered Flag Ltd",
  branch: "Karen",
  accountNumber: "0102033958502",
  swift: "SCBLKENXXXX",
};

// Company details for the booking PDF header (from the invoice letterhead).
export const COMPANY = {
  name: "The Chequered Flag",
  postal: "P.O Box 14483 Nairobi 00800",
  vat: "0021870Z",
  pin: "P000608228X",
};

// The Chequered Flag's Google review link (Google Business Profile → "Ask for reviews" → copy link).
// When set, everyone who leaves a review on the website is offered "Also post it on Google". Empty = hidden.
// Google does not allow businesses to post reviews for customers, or to send only happy customers to Google.
export const GOOGLE_REVIEW_URL = "";
