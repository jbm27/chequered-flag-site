// Builds the booking confirmation PDF in the browser, with no extra library.
// Text uses the PDF's built-in Helvetica fonts; licence photos and drawn signatures are embedded as JPEGs.
// Used on the booking page (the customer's copy) and on the staff desk (from the saved documents).

import { COMPANY, CONTACT, PAYMENT } from "./contact";
import { agreementLine, type DocImage } from "./documents";

export type BookingPdfData = {
  reference: string;
  status: string;
  created: string;
  vehicle: string;
  pickupText: string;
  returnText: string;
  daysText: string;
  location: string[];
  // Cost lines, laid out like the invoice table. qty and unit are optional; sub is a small grey line underneath.
  costs: { label: string; amount: string; qty?: string; unit?: string; sub?: string }[];
  totalLabel: string;
  total: string;
  customer: { name: string; phone: string; email: string };
  // licenceNote replaces the photo when the licence is on file and the photo is not available (customer's copy).
  drivers: { name: string; phone: string; licence?: DocImage; licenceNote?: string }[];
  signature: { kind: "drawn" | "typed"; name: string; image?: DocImage };
  signedAt: string;
  agreementTitle: string;
  agreementVersion: string;
  agreementText: string[];
  schedule?: [string, string][] | null; // Booking Schedule rows (section A of the agreement)
  footer: string;
  paid?: string; // amount paid so far, when known
  balance?: string; // amount still due, when known
  logo?: DocImage | null; // The Chequered Flag logo (see loadPdfLogo)
};

// The logo used on invoices, as a JPEG the PDF can embed. Returns null if it cannot be loaded.
export async function loadPdfLogo(): Promise<DocImage | null> {
  try {
    const response = await fetch("/images/brand/chequered-flag-ltd.jpg");
    if (!response.ok) return null;
    const blob = await response.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { data: data.replace(/^data:[^;]*;/, "data:image/jpeg;"), w: 463, h: 211 };
  } catch {
    return null;
  }
}

// Helvetica widths (per 1000 units) for printable ASCII 32–126, from the standard font metrics.
const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];

// Characters outside Latin-1 that the PDF's WinAnsi encoding can still show.
const WINANSI: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "•": 0x95, "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92, "“": 0x93,
  "”": 0x94, "™": 0x99,
};

export function toWinAnsi(text: string) {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (WINANSI[ch] !== undefined) out += String.fromCharCode(WINANSI[ch]);
    else if (ch === "→") out += "->";
    else if (code === 0x2212) out += "-";
    else if (code < 256) out += ch;
    else out += "?";
  }
  return out;
}

export function widthOf(text: string, size: number, bold: boolean) {
  let units = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    units += code >= 32 && code <= 126 ? HELV[code - 32] : 556;
  }
  return (units / 1000) * size * (bold ? 1.06 : 1);
}

export function wrap(text: string, size: number, maxWidth: number, bold: boolean) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? line + " " + word : word;
      if (widthOf(next, size, bold) <= maxWidth) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function escape(text: string) {
  return toWinAnsi(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function base64Bytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function latin1(text: string) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const WIDTH = PAGE_W - MARGIN * 2;

export function buildBookingPdf(data: BookingPdfData): Uint8Array {
  const images: DocImage[] = [];
  const pages: string[] = [];
  let ops = "";
  let y = PAGE_H - MARGIN;

  function newPage() {
    if (ops) pages.push(ops);
    ops = "";
    y = PAGE_H - MARGIN;
  }
  function need(height: number) {
    if (y - height < MARGIN + 20) newPage();
  }
  function text(str: string, x: number, size: number, bold = false, grey = false) {
    ops += (grey ? "0.35 g " : "0 g ") + "BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + x.toFixed(2) + " " + y.toFixed(2) + " Td (" + escape(str) + ") Tj ET\n";
  }
  function para(str: string, size = 10, bold = false, grey = false, indent = 0) {
    const lines = wrap(str, size, WIDTH - indent, bold);
    for (const line of lines) {
      need(size * 1.45);
      y -= size * 1.45;
      text(line, MARGIN + indent, size, bold, grey);
    }
  }
  function gap(h: number) {
    y -= h;
  }
  function rule() {
    need(10);
    y -= 6;
    ops += "0.8 G 0.6 w " + MARGIN + " " + y.toFixed(2) + " m " + (PAGE_W - MARGIN) + " " + y.toFixed(2) + " l S\n";
    y -= 4;
  }
  function heading(str: string) {
    gap(10);
    need(40);
    para(str.toUpperCase() + ":", 9, true);
    rule();
  }
  function row(label: string, value: string, bold = false) {
    const labelW = 150;
    const lines = wrap(value || "-", 10, WIDTH - labelW, bold);
    need(lines.length * 14.5);
    lines.forEach((line, index) => {
      y -= 14.5;
      if (index === 0) text(label, MARGIN, 10, false, true);
      text(line, MARGIN + labelW, 10, bold);
    });
  }
  function money(label: string, amount: string, bold = false) {
    need(15);
    y -= 15;
    text(label, MARGIN, 10, bold);
    const w = widthOf(amount, 10, bold);
    text(amount, PAGE_W - MARGIN - w, 10, bold);
  }
  function image(img: DocImage, maxW: number, maxH: number) {
    const scale = Math.min(maxW / img.w, maxH / img.h, 1.2);
    const w = img.w * scale;
    const h = img.h * scale;
    need(h + 6);
    y -= h;
    images.push(img);
    ops += "q " + w.toFixed(2) + " 0 0 " + h.toFixed(2) + " " + MARGIN + " " + y.toFixed(2) + " cm /Im" + images.length + " Do Q\n";
    ops += "0.75 G 0.5 w " + MARGIN + " " + y.toFixed(2) + " " + w.toFixed(2) + " " + h.toFixed(2) + " re S\n";
    y -= 6;
  }

  function textAt(str: string, x: number, yPos: number, size: number, bold = false, grey = false) {
    ops += (grey ? "0.35 g " : "0 g ") + "BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + x.toFixed(2) + " " + yPos.toFixed(2) + " Td (" + escape(str) + ") Tj ET\n";
  }
  function rightAt(str: string, xRight: number, yPos: number, size: number, bold = false, grey = false) {
    textAt(str, xRight - widthOf(str, size, bold), yPos, size, bold, grey);
  }
  // Wrapped text in a column; returns the y below it.
  function column(lines: { s: string; size?: number; bold?: boolean; grey?: boolean; gapAfter?: number }[], x: number, yStart: number, width: number) {
    let yy = yStart;
    for (const line of lines) {
      const size = line.size || 9;
      for (const part of wrap(line.s, size, width, Boolean(line.bold))) {
        yy -= size * 1.4;
        textAt(part, x, yy, size, line.bold, line.grey);
      }
      yy -= line.gapAfter || 0;
    }
    return yy;
  }
  function lineAt(x1: number, yy: number, x2: number, grey = 0.8, w = 0.6) {
    ops += grey + " G " + w + " w " + x1.toFixed(2) + " " + yy.toFixed(2) + " m " + x2.toFixed(2) + " " + yy.toFixed(2) + " l S\n";
  }
  function box(x: number, yTop: number, w: number, h: number) {
    ops += "0 G 0.8 w " + x.toFixed(2) + " " + (yTop - h).toFixed(2) + " " + w.toFixed(2) + " " + h.toFixed(2) + " re S\n";
  }

  // Page 1: laid out like The Chequered Flag invoice
  const right = PAGE_W - MARGIN;
  const colX = 330;
  let logoRef = 0; // XObject number of the logo, reused on the agreement page
  if (data.logo) {
    images.push(data.logo);
    logoRef = images.length;
    const lw = 190;
    const lh = (data.logo.h / data.logo.w) * lw;
    ops += "q " + lw + " 0 0 " + lh.toFixed(2) + " " + (MARGIN - 6) + " " + (PAGE_H - MARGIN - 18 - lh).toFixed(2) + " cm /Im" + images.length + " Do Q\n";
  } else {
    textAt("THE CHEQUERED FLAG LTD", MARGIN, PAGE_H - MARGIN - 50, 18, true);
  }
  let yr = column(
    [
      { s: COMPANY.name, size: 9 },
      { s: COMPANY.postal, size: 9 },
      { s: "VAT Registration No.: " + COMPANY.vat, size: 9 },
      { s: "PIN: " + COMPANY.pin, size: 9 },
      { s: "Tel: " + CONTACT.phoneDisplay, size: 9 },
      { s: "Email: " + CONTACT.email, size: 9 },
    ],
    colX,
    PAGE_H - MARGIN + 4,
    right - colX,
  );
  yr -= 10;
  box(colX, yr, right - colX, 66);
  textAt("BOOKING #" + data.reference, colX + 10, yr - 22, 15, true);
  textAt("Booking date: " + data.created, colX + 10, yr - 38, 9);
  textAt(data.status, colX + 10, yr - 52, 8.5, false, true);
  y = yr - 66 - 24;

  // Three columns, as on the invoice
  const third = (WIDTH - 24) / 3;
  const top = y;
  const yA = column(
    [
      { s: "HIRED BY:", size: 9, bold: true, gapAfter: 3 },
      { s: data.customer.name, size: 11, bold: true, gapAfter: 3 },
      { s: "Tel: " + data.customer.phone, size: 8.5 },
      { s: "Email: " + (data.customer.email || "Not given"), size: 8.5 },
    ],
    MARGIN,
    top,
    third,
  );
  const yB = column(
    [
      { s: "VEHICLE:", size: 9, bold: true, gapAfter: 3 },
      { s: data.vehicle, size: 9, bold: true },
      { s: "Collection: " + data.pickupText, size: 8.5 },
      { s: "Return: " + data.returnText, size: 8.5 },
      { s: "Length of hire: " + data.daysText, size: 8.5 },
    ],
    MARGIN + third + 12,
    top,
    third,
  );
  const yC = column(
    [{ s: "LOCATION:", size: 9, bold: true, gapAfter: 3 }, ...data.location.map((s) => ({ s, size: 8.5 }))],
    MARGIN + (third + 12) * 2,
    top,
    third,
  );
  y = Math.min(yA, yB, yC) - 22;

  // Cost table
  const qtyR = 330;
  const unitR = 440;
  textAt("Description", MARGIN, y, 9, true);
  rightAt("Qty.", qtyR, y, 9, true);
  rightAt("Unit Price", unitR, y, 9, true);
  rightAt("Amount", right, y, 9, true);
  y -= 7;
  lineAt(MARGIN, y, right, 0, 0.9);
  for (const cost of data.costs) {
    const descLines = wrap(cost.label, 9, qtyR - MARGIN - 50, false);
    need(descLines.length * 13 + (cost.sub ? 11 : 0) + 14);
    y -= 15;
    descLines.forEach((line, index) => textAt(line, MARGIN, y - index * 12, 9));
    if (cost.qty) rightAt(cost.qty, qtyR, y, 9);
    if (cost.unit) rightAt(cost.unit, unitR, y, 9);
    rightAt(cost.amount, right, y, 9);
    y -= (descLines.length - 1) * 12;
    if (cost.sub) {
      for (const part of wrap(cost.sub, 7, unitR - MARGIN, false)) {
        y -= 10;
        textAt(part, MARGIN, y, 7, false, true);
      }
    }
    y -= 8;
    lineAt(MARGIN, y, right, 0.82, 0.5);
  }
  y -= 22;

  // Payment details, terms and totals box
  need(130);
  const blockTop = y;
  const paidInFull = /^paid/i.test(data.totalLabel);
  const yPay = column(
    [
      { s: "Payment Details:", size: 8.5, bold: true, gapAfter: 3 },
      { s: "Mpesa Till Number: " + PAYMENT.mpesaTill, size: 8, gapAfter: 4 },
      { s: PAYMENT.bankName.toUpperCase(), size: 8.5, bold: true },
      { s: "Name: " + PAYMENT.accountName.toUpperCase(), size: 8 },
      { s: "Branch: " + PAYMENT.branch.toUpperCase(), size: 8 },
      { s: "Acc. No: " + PAYMENT.accountNumber, size: 8 },
      { s: "Swift Code: " + PAYMENT.swift, size: 8 },
    ],
    MARGIN,
    blockTop,
    150,
  );
  const yTerms = column(
    [
      { s: "Payment Terms:", size: 8.5, bold: true, gapAfter: 3 },
      {
        s: paidInFull
          ? "Paid in full. Thank you."
          : "The full amount is due when you book. Quote the booking reference " + data.reference + " when you pay. Unpaid holds are released after 48 hours.",
        size: 8,
        gapAfter: 3,
      },
      { s: "We confirm the booking once we have checked the payment. Nothing is charged on the website.", size: 8 },
    ],
    MARGIN + 160,
    blockTop,
    colX - 14 - (MARGIN + 160),
  );
  const tx = colX + 10;
  const totals: [string, string, boolean][] = [[paidInFull ? "Total paid" : "Total", data.total, true]];
  if (data.paid !== undefined) totals.push(["Paid to date", data.paid, false]);
  if (data.balance !== undefined) totals.push(["Balance due", data.balance, true]);
  const boxH = 16 + totals.length * 15;
  box(colX, blockTop + 4, right - colX, boxH);
  let ty = blockTop + 4 - 6;
  for (const [label, amount, bold] of totals) {
    ty -= 15;
    textAt(label, tx, ty, bold ? 10 : 9, bold);
    rightAt(amount, right - 10, ty, bold ? 10 : 9, bold);
  }
  y = Math.min(yPay, yTerms, blockTop - boxH) - 18;

  heading("Drivers");
  data.drivers.forEach((driver, index) => {
    row(index === 0 ? "Main driver" : "Driver " + (index + 1), driver.name + " · " + driver.phone, index === 0);
    if (driver.licenceNote) row("", driver.licenceNote);
  });

  heading("Signed hire agreement");
  row("Agreement", data.agreementTitle + " (version " + data.agreementVersion + ")");
  row("Signed by", data.signature.name + (data.signature.kind === "typed" ? " (typed name)" : " (drawn signature)"));
  row("Signed at", data.signedAt);
  if (data.signature.kind === "drawn" && data.signature.image) {
    gap(4);
    image(data.signature.image, 220, 90);
  }

  // Agreement text, with the logo at the top right of its first page
  newPage();
  const agreementTop = y;
  let textW = WIDTH;
  if (logoRef && data.logo) {
    const lw = 118;
    const lh = (data.logo.h / data.logo.w) * lw;
    ops += "q " + lw + " 0 0 " + lh.toFixed(2) + " " + (PAGE_W - MARGIN - lw + 4).toFixed(2) + " " + (agreementTop - lh + 6).toFixed(2) + " cm /Im" + logoRef + " Do Q\n";
    textW = WIDTH - lw - 12;
    for (const part of wrap(data.agreementTitle, 14, textW, true)) {
      y -= 14 * 1.45;
      text(part, MARGIN, 14, true);
    }
    for (const part of wrap("Version " + data.agreementVersion + " · signed by " + data.signature.name + " on " + data.signedAt, 9, textW, false)) {
      y -= 9 * 1.45;
      text(part, MARGIN, 9, false, true);
    }
    y = Math.min(y, agreementTop - lh + 2);
  } else {
    para(data.agreementTitle, 14, true);
    para("Version " + data.agreementVersion + " · signed by " + data.signature.name + " on " + data.signedAt, 9, false, true);
  }
  rule();
  for (const paragraph of data.agreementText) {
    const line = agreementLine(paragraph);
    if (line.kind === "heading") {
      gap(6);
      need(40);
      para(line.text, 10.5, true);
      gap(2);
      continue;
    }
    if (line.kind === "schedule") {
      if (data.schedule && data.schedule.length) {
        for (const [label, value] of data.schedule) {
          const labelW = 170;
          const lines = wrap(value || "-", 8.5, WIDTH - labelW, false);
          const labelLines = wrap(label, 8.5, labelW - 10, true);
          const h = Math.max(lines.length, labelLines.length) * 11.5 + 6;
          need(h);
          const top = y;
          labelLines.forEach((part, index) => textAt(part, MARGIN + 4, top - 11 - index * 11.5, 8.5, true));
          lines.forEach((part, index) => textAt(part, MARGIN + labelW, top - 11 - index * 11.5, 8.5));
          y = top - h;
          lineAt(MARGIN, y, PAGE_W - MARGIN, 0.85, 0.4);
        }
        gap(6);
      } else {
        para("The Booking Schedule is the booking summary on page 1.", 9, false, true);
      }
      continue;
    }
    para(line.text, 9.5, false, false, line.level * 16);
    gap(line.level === 2 ? 2 : 4);
  }

  // Licences
  data.drivers.forEach((driver, index) => {
    if (!driver.licence) return; // a licence on file without its photo is noted on page 1 instead
    newPage();
    para((index === 0 ? "Main driver" : "Driver " + (index + 1)) + ": driving licence (front)", 14, true);
    para(driver.name + " · " + driver.phone, 10, false, true);
    if (driver.licenceNote) para(driver.licenceNote, 10);
    rule();
    gap(6);
    if (driver.licence) image(driver.licence, WIDTH, PAGE_H - MARGIN * 2 - 90);
  });
  newPage();

  // Footer on every page
  const total = pages.length;
  const withFooter = pages.map(
    (content, index) =>
      chequerStrip(PAGE_H) +
      content +
      "0.8 G 0.5 w " + MARGIN + " 40 m " + (PAGE_W - MARGIN) + " 40 l S\n" +
      "0.45 g BT /F1 7.5 Tf " + MARGIN + " 28 Td (" + escape(data.footer) + ") Tj ET\n" +
      "0.45 g BT /F1 7.5 Tf " + (PAGE_W - MARGIN - 50) + " 28 Td (" + escape("Page " + (index + 1) + " of " + total) + ") Tj ET\n",
  );

  return assemblePdf(withFooter, images);
}

// The faint chequered strip down the left edge of each page, as on The Chequered Flag letterhead.
// Drawn as vector squares (not an image), so it stays sharp when zoomed or printed. Drawn first, behind the text.
export function chequerStrip(pageH: number, square = 10.5, columns = 2, shade = 0.925) {
  let out = "q " + shade + " g\n";
  const rows = Math.ceil(pageH / square);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      if ((r + c) % 2 === 0) out += (c * square).toFixed(2) + " " + (r * square).toFixed(2) + " " + square + " " + square + " re\n";
    }
  }
  return out + "f Q\n";
}

// Writes the PDF file: one content stream per page, Helvetica and Helvetica-Bold, and JPEG images
// referenced as /Im1, /Im2… in the order given. Shared by the booking PDF and the performance report.
export function assemblePdf(withFooter: string[], images: DocImage[], pageW = PAGE_W, pageH = PAGE_H): Uint8Array {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (num: number, body: string | Uint8Array[], dict?: string) => {
    offsets[num] = length;
    push(latin1(num + " 0 obj\n"));
    if (typeof body === "string") push(latin1(body + "\n"));
    else {
      push(latin1((dict || "") + "\nstream\n"));
      body.forEach(push);
      push(latin1("\nendstream\n"));
    }
    push(latin1("endobj\n"));
  };

  push(latin1("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"));
  const firstImage = 5;
  const firstPage = firstImage + images.length;
  const pageNums = withFooter.map((_, index) => firstPage + index * 2);
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [" + pageNums.map((n) => n + " 0 R").join(" ") + "] /Count " + pageNums.length + " >>");
  obj(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  obj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  images.forEach((img, index) => {
    const bytes = base64Bytes(img.data);
    obj(
      firstImage + index,
      [bytes],
      "<< /Type /XObject /Subtype /Image /Width " + img.w + " /Height " + img.h +
        " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + bytes.length + " >>",
    );
  });
  const xobjects = images.map((_, index) => "/Im" + (index + 1) + " " + (firstImage + index) + " 0 R").join(" ");
  withFooter.forEach((content, index) => {
    const pageNum = pageNums[index];
    const stream = latin1(content);
    obj(
      pageNum,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageW + " " + pageH + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>" +
        (xobjects ? " /XObject << " + xobjects + " >>" : "") + " >> /Contents " + (pageNum + 1) + " 0 R >>",
    );
    obj(pageNum + 1, [stream], "<< /Length " + stream.length + " >>");
  });

  const count = firstPage + withFooter.length * 2;
  const xrefAt = length;
  let xref = "xref\n0 " + count + "\n0000000000 65535 f \n";
  for (let i = 1; i < count; i += 1) xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  push(latin1(xref + "trailer\n<< /Size " + count + " /Root 1 0 R >>\nstartxref\n" + xrefAt + "\n%%EOF\n"));

  const out = new Uint8Array(length);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
