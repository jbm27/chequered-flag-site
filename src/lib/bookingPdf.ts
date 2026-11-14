// Builds the booking confirmation PDF in the browser, with no extra library.
// Text uses the PDF's built-in Helvetica fonts; licence photos and drawn signatures are embedded as JPEGs.
// Used on the booking page (the customer's copy) and on the staff desk (from the saved documents).

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
  costs: { label: string; amount: string }[];
  totalLabel: string;
  total: string;
  customer: { name: string; phone: string; email: string };
  drivers: { name: string; phone: string; licence: DocImage }[];
  signature: { kind: "drawn" | "typed"; name: string; image?: DocImage };
  signedAt: string;
  agreementTitle: string;
  agreementVersion: string;
  agreementText: string[];
  footer: string;
};

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

function toWinAnsi(text: string) {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (WINANSI[ch] !== undefined) out += String.fromCharCode(WINANSI[ch]);
    else if (code === 0x2212) out += "-";
    else if (code < 256) out += ch;
    else out += "?";
  }
  return out;
}

function widthOf(text: string, size: number, bold: boolean) {
  let units = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    units += code >= 32 && code <= 126 ? HELV[code - 32] : 556;
  }
  return (units / 1000) * size * (bold ? 1.06 : 1);
}

function wrap(text: string, size: number, maxWidth: number, bold: boolean) {
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

function escape(text: string) {
  return toWinAnsi(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function base64Bytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function latin1(text: string) {
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
    gap(8);
    need(40);
    para(str, 13, true);
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

  // Page 1: summary
  para("Chequered Flag", 20, true);
  para("Vehicle hire booking confirmation", 12, false, true);
  gap(6);
  row("Reference", data.reference, true);
  row("Status", data.status);
  row("Booked", data.created);

  heading("Vehicle and dates");
  row("Vehicle", data.vehicle, true);
  row("Collection", data.pickupText);
  row("Return", data.returnText);
  row("Length of hire", data.daysText);

  heading("Location");
  for (const line of data.location) para(line, 10);

  heading("Cost overview");
  for (const cost of data.costs) money(cost.label, cost.amount);
  rule();
  money(data.totalLabel, data.total, true);
  gap(4);
  para(
    /^paid/i.test(data.totalLabel)
      ? "Paid in full. Thank you."
      : "Nothing is charged on the website. Pay the full amount by M-Pesa or bank transfer quoting the reference above. We confirm the booking once we have checked the payment.",
    9,
    false,
    true,
  );

  heading("Hirer and drivers");
  row("Hirer", data.customer.name, true);
  row("Mobile", data.customer.phone);
  row("Email", data.customer.email || "Not given");
  data.drivers.forEach((driver, index) => {
    row(index === 0 ? "Main driver" : "Driver " + (index + 1), driver.name + " · " + driver.phone, index === 0);
  });

  heading("Signed hire agreement");
  row("Agreement", data.agreementTitle + " (version " + data.agreementVersion + ")");
  row("Signed by", data.signature.name + (data.signature.kind === "typed" ? " (typed name)" : " (drawn signature)"));
  row("Signed at", data.signedAt);
  if (data.signature.kind === "drawn" && data.signature.image) {
    gap(4);
    image(data.signature.image, 220, 90);
  }

  // Agreement text
  newPage();
  para(data.agreementTitle, 14, true);
  para("Version " + data.agreementVersion + " · signed by " + data.signature.name + " on " + data.signedAt, 9, false, true);
  rule();
  for (const paragraph of data.agreementText) {
    const { level, text: words } = agreementLine(paragraph);
    para(words, 9.5, false, false, level * 16);
    gap(level === 2 ? 2 : 4);
  }

  // Licences
  data.drivers.forEach((driver, index) => {
    newPage();
    para((index === 0 ? "Main driver" : "Driver " + (index + 1)) + ": driving licence (front)", 14, true);
    para(driver.name + " · " + driver.phone, 10, false, true);
    rule();
    gap(6);
    image(driver.licence, WIDTH, PAGE_H - MARGIN * 2 - 90);
  });
  newPage();

  // Footer on every page
  const total = pages.length;
  const withFooter = pages.map(
    (content, index) =>
      content +
      "0.45 g BT /F1 8 Tf " + MARGIN + " 26 Td (" + escape(data.footer) + ") Tj ET\n" +
      "0.45 g BT /F1 8 Tf " + (PAGE_W - MARGIN - 60) + " 26 Td (" + escape("Page " + (index + 1) + " of " + total) + ") Tj ET\n",
  );

  // Assemble the file
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
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PAGE_W + " " + PAGE_H + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>" +
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
