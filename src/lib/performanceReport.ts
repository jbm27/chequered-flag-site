// Performance report downloads (owners only): PDF, Word (.docx) or Excel (.xlsx) for the chosen months.
// Each month has a summary against target, revenue as the month goes on (running totals by day), and figures
// by vehicle. With more than one month, an overview of the chosen months comes first. Built in the browser.

import { assemblePdf, escape, widthOf, wrap, type BookingPdfData } from "./bookingPdf";
import { COMPANY, CONTACT } from "./contact";
import { zip } from "./zip";
import {
  DAILY_REVENUE_TARGET,
  MONTH_NAMES,
  MONTHS,
  UTILISATION_TARGET,
  group,
  monthStats,
  type MonthStats,
  type YearData,
} from "./performance";

type Num = { n: number; f: "ksh" | "int" | "pct" };
type Cell = string | Num | null;
type Table = { columns: string[]; rows: Cell[][]; total?: Cell[] };
type Section = { heading: string; note?: string; table: Table };
type Block = { name: string; heading: string; subtitle: string; sections: Section[] };
export type Report = { title: string; subtitle: string; sample: boolean; generated: string; blocks: Block[] };

const ksh = (n: number): Num => ({ n: Math.round(n), f: "ksh" });
const int = (n: number): Num => ({ n: Math.round(n), f: "int" });
const pct = (n: number): Cell => (Number.isFinite(n) ? { n, f: "pct" } : "–");

export function cellText(cell: Cell) {
  if (cell === null) return "";
  if (typeof cell === "string") return cell;
  if (cell.f === "pct") return Math.round(cell.n * 100) + "%";
  if (cell.f === "ksh") return "KSh " + cell.n.toLocaleString("en-US");
  return cell.n.toLocaleString("en-US");
}

function monthTitle(s: MonthStats, year: number) {
  const name = MONTH_NAMES[s.month] + " " + year;
  return s.reportDays < s.dim ? name + " (to " + s.reportDays + " " + MONTH_NAMES[s.month] + ")" : name;
}

function dailyTarget(s: MonthStats) {
  return (DAILY_REVENUE_TARGET.saloon * s.counts.saloon + DAILY_REVENUE_TARGET.suv * s.counts.suv) * UTILISATION_TARGET;
}

function monthBlock(data: YearData, s: MonthStats): Block {
  const fleet = s.counts.saloon + s.counts.suv;
  const targetDays = fleet * UTILISATION_TARGET * s.reportDays;
  const summary: Table = {
    columns: ["Measure", "Actual", "Target", "% of target"],
    rows: [
      ["Income, net of VAT", ksh(s.income), ksh(s.targetIncome), pct(s.targetIncome ? s.income / s.targetIncome : NaN)],
      ["Hire days", int(s.hireDays), int(targetDays), pct(targetDays ? s.hireDays / targetDays : NaN)],
      ["Average income per hire day", s.hireDays ? ksh(s.income / s.hireDays) : "–", null, null],
      ["Saloon utilisation (" + s.counts.saloon + " cars)", pct(s.util.saloon), pct(UTILISATION_TARGET), null],
      ["SUV & 4x4 utilisation (" + s.counts.suv + " vehicles)", pct(s.util.suv), pct(UTILISATION_TARGET), null],
      ["Overall utilisation (" + fleet + " vehicles)", pct(s.util.all), pct(UTILISATION_TARGET), null],
    ],
  };

  let running = 0;
  const perDayTarget = dailyTarget(s);
  const dayRows: Cell[][] = [];
  for (let i = 0; i < s.reportDays; i += 1) {
    const d = s.perDay[i];
    running += d.income;
    const target = perDayTarget * (i + 1);
    const weekday = new Date(Date.UTC(data.year, s.month, d.day)).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
    dayRows.push([weekday + " " + d.day + " " + MONTHS[s.month], int(d.cars), ksh(d.income), ksh(running), ksh(target), pct(target ? running / target : NaN)]);
  }
  const daily: Table = {
    columns: ["Day", "Cars out", "Income that day", "Revenue to date", "Target to date", "% of target"],
    rows: dayRows,
    total: ["Total", int(s.hireDays), ksh(s.income), ksh(s.income), ksh(perDayTarget * s.reportDays), pct(s.targetIncome ? s.income / s.targetIncome : NaN)],
  };

  const vehicles = [...s.perVehicle].sort((a, b) => b.days - a.days || b.income - a.income);
  const byVehicle: Table = {
    columns: ["Vehicle", "Type", "Days out", "Utilisation", "Income", "Per hire day"],
    rows: vehicles.map(({ v, days, income }) => [
      v.plate + " " + v.model,
      group(v.category) === "saloon" ? "Saloon" : "SUV & 4x4",
      int(days),
      pct(s.reportDays ? days / s.reportDays : NaN),
      ksh(income),
      days ? ksh(income / days) : "–",
    ]),
    total: ["Total", "", int(s.hireDays), pct(s.util.all), ksh(s.income), s.hireDays ? ksh(s.income / s.hireDays) : "–"],
  };

  return {
    name: MONTHS[s.month] + " " + data.year,
    heading: monthTitle(s, data.year),
    subtitle:
      (s.reportDays < s.dim ? s.reportDays + " of " + s.dim + " days so far" : "Whole month, " + s.dim + " days") +
      " · " + fleet + " vehicles · target " + Math.round(UTILISATION_TARGET * 100) + "% utilisation",
    sections: [
      { heading: "Summary", table: summary },
      {
        heading: "Revenue as the month goes on",
        note:
          "Income each day and the running total, against the target to date (" +
          cellText(ksh(perDayTarget)) + " a day: KSh 2,500 per saloon and KSh 8,500 per SUV or 4x4, at 70%).",
        table: daily,
      },
      { heading: "By vehicle", table: byVehicle },
    ],
  };
}

export function buildReport(data: YearData, months: number[], sample: boolean): Report {
  const stats = months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => monthStats(data, m))
    .filter((s) => s.reportDays > 0);
  const blocks = stats.map((s) => monthBlock(data, s));
  if (stats.length > 1) {
    const sum = (f: (s: MonthStats) => number) => stats.reduce((acc, s) => acc + f(s), 0);
    const income = sum((s) => s.income);
    const target = sum((s) => s.targetIncome);
    const days = sum((s) => s.hireDays);
    const capacity = (k: "saloon" | "suv") => sum((s) => s.counts[k] * s.reportDays);
    const daysBy = (k: "saloon" | "suv") =>
      sum((s) => s.perVehicle.filter((row) => group(row.v.category) === k).reduce((acc, row) => acc + row.days, 0));
    blocks.unshift({
      name: "Summary",
      heading: "Chosen months",
      subtitle: stats.map((s) => MONTHS[s.month]).join(", ") + " " + data.year,
      sections: [
        {
          heading: "Month by month",
          table: {
            columns: ["Month", "Income, net of VAT", "Target", "% of target", "Hire days", "Per hire day", "Saloons", "SUV & 4x4"],
            rows: stats.map((s) => [
              monthTitle(s, data.year),
              ksh(s.income),
              ksh(s.targetIncome),
              pct(s.targetIncome ? s.income / s.targetIncome : NaN),
              int(s.hireDays),
              s.hireDays ? ksh(s.income / s.hireDays) : "–",
              pct(s.util.saloon),
              pct(s.util.suv),
            ]),
            total: [
              "Total",
              ksh(income),
              ksh(target),
              pct(target ? income / target : NaN),
              int(days),
              days ? ksh(income / days) : "–",
              pct(capacity("saloon") ? daysBy("saloon") / capacity("saloon") : NaN),
              pct(capacity("suv") ? daysBy("suv") / capacity("suv") : NaN),
            ],
          },
        },
      ],
    });
  }
  const consecutive = stats.every((s, i) => i === 0 || s.month === stats[i - 1].month + 1);
  const label =
    stats.length === 1
      ? monthTitle(stats[0], data.year)
      : !stats.length
        ? ""
        : consecutive
          ? MONTHS[stats[0].month] + " to " + MONTHS[stats[stats.length - 1].month] + " " + data.year
          : stats.map((s) => MONTHS[s.month]).join(", ") + " " + data.year;
  return {
    title: "Car hire performance",
    subtitle: label,
    sample,
    generated: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" }),
    blocks,
  };
}

export function reportFileName(report: Report, ext: string) {
  return ("Chequered-Flag-performance-" + report.subtitle.replace(/\(.*?\)/g, "").replace(/,/g, "").trim().replace(/\s+/g, "-") + (report.sample ? "-SAMPLE" : "") + "." + ext).replace(/-+/g, "-");
}

const NOTE =
  "From held and paid bookings on the hire desk. Income is the hire and collision damage waiver charges net of 16% VAT, spread over the hire days; delivery charges are not included. Utilisation is days out divided by vehicles × days (workshop days are not recorded yet).";
const SAMPLE = "SAMPLE FIGURES - NOT REAL. Made up to show the layout.";

// ---------- Excel (.xlsx) ----------

function xml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function colName(index: number) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

// Styles: 0 normal, 1 bold, 2 KSh, 3 %, 4 whole number, 5 header, 6 title, 7 bold KSh, 8 bold %, 9 bold number, 10 grey note
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;KSh &quot;#,##0"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="15"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF595959"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F0"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF999999"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="9" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function sheetXml(report: Report, block: Block) {
  const rows: string[] = [];
  let r = 0;
  const put = (cells: { v: Cell; s: number }[]) => {
    r += 1;
    const xmlCells = cells
      .map((c, i) => {
        const ref = colName(i) + r;
        if (c.v === null || c.v === "") return "";
        if (typeof c.v === "string") return `<c r="${ref}" t="inlineStr" s="${c.s}"><is><t xml:space="preserve">${xml(c.v)}</t></is></c>`;
        return `<c r="${ref}" s="${c.s}"><v>${c.v.f === "pct" ? c.v.n.toFixed(4) : c.v.n}</v></c>`;
      })
      .join("");
    rows.push(`<row r="${r}">${xmlCells}</row>`);
  };
  const style = (cell: Cell, bold: boolean) =>
    cell && typeof cell !== "string" ? (cell.f === "ksh" ? (bold ? 7 : 2) : cell.f === "pct" ? (bold ? 8 : 3) : bold ? 9 : 4) : bold ? 1 : 0;

  put([{ v: report.title + " · " + block.heading, s: 6 }]);
  put([{ v: block.subtitle, s: 0 }]);
  if (report.sample) put([{ v: SAMPLE, s: 1 }]);
  put([]);
  for (const section of block.sections) {
    put([{ v: section.heading, s: 1 }]);
    if (section.note) put([{ v: section.note, s: 10 }]);
    put(section.table.columns.map((label) => ({ v: label, s: 5 })));
    for (const row of section.table.rows) put(row.map((cell) => ({ v: cell, s: style(cell, false) })));
    if (section.table.total) put(section.table.total.map((cell) => ({ v: cell, s: style(cell, true) })));
    put([]);
  }
  put([{ v: NOTE, s: 10 }]);
  put([{ v: "The Chequered Flag Ltd · made " + report.generated + " · confidential", s: 10 }]);
  const widths = [30, 18, 18, 18, 16, 16, 14, 14];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><cols>${widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("")}</cols><sheetData>${rows.join("")}</sheetData><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

export function reportXlsx(report: Report): Uint8Array {
  const sheets = report.blocks.map((block, i) => ({ name: block.name.replace(/[\\/?*[\]:]/g, "").slice(0, 31), xml: sheetXml(report, block), id: i + 1 }));
  return zip([
    {
      name: "[Content_Types].xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
        .map((s) => `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join("")}</Types>`,
    },
    {
      name: "_rels/.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((s) => `<sheet name="${xml(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`)
        .join("")}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((s) => `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`)
        .join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "xl/styles.xml", text: STYLES },
    ...sheets.map((s) => ({ name: "xl/worksheets/sheet" + s.id + ".xml", text: s.xml })),
  ]);
}

// ---------- Word (.docx) ----------

function run(text: string, opts: { bold?: boolean; size?: number; color?: string; italic?: boolean } = {}) {
  const props =
    (opts.bold ? "<w:b/>" : "") + (opts.italic ? "<w:i/>" : "") + (opts.color ? `<w:color w:val="${opts.color}"/>` : "") + (opts.size ? `<w:sz w:val="${opts.size}"/>` : "");
  return `<w:r>${props ? "<w:rPr>" + props + "</w:rPr>" : ""}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

function para(content: string, opts: { after?: number; before?: number; align?: "right" | "left"; pageBreak?: boolean } = {}) {
  const ppr =
    `<w:pPr>${opts.pageBreak ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="${opts.before ?? 0}" w:after="${opts.after ?? 80}"/>` +
    (opts.align === "right" ? '<w:jc w:val="right"/>' : "") + "</w:pPr>";
  return `<w:p>${ppr}${content}</w:p>`;
}

function docTable(table: Table) {
  const n = table.columns.length;
  const first = n > 6 ? 3000 : 3600;
  const rest = Math.floor((14570 - first) / (n - 1));
  const widths = [first, ...Array.from({ length: n - 1 }, () => rest)];
  const cell = (c: Cell, i: number, opts: { bold?: boolean; head?: boolean }) =>
    `<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/>${opts.head ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F0"/>' : ""}</w:tcPr>` +
    para(run(cellText(c), { bold: opts.bold || opts.head, size: 18 }), { after: 0, align: i > 0 && (opts.head || (c !== null && typeof c !== "string")) ? "right" : "left" }) +
    "</w:tc>";
  const row = (cells: Cell[], opts: { bold?: boolean; head?: boolean }) =>
    `<w:tr>${opts.head ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${cells.map((c, i) => cell(c, i, opts)).join("")}</w:tr>`;
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="14570" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="BBBBBB"/><w:bottom w:val="single" w:sz="4" w:color="BBBBBB"/><w:insideH w:val="single" w:sz="2" w:color="DDDDDD"/></w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
    `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>` +
    row(table.columns, { head: true }) +
    table.rows.map((r) => row(r, {})).join("") +
    (table.total ? row(table.total, { bold: true }) : "") +
    "</w:tbl>"
  );
}

export function reportDocx(report: Report): Uint8Array {
  const body: string[] = [];
  body.push(para(run("THE CHEQUERED FLAG LTD", { bold: true, size: 20, color: "595959" }), { after: 40 }));
  body.push(para(run(report.title + ": " + report.subtitle, { bold: true, size: 36 }), { after: 60 }));
  body.push(para(run("Made " + report.generated + " · confidential", { size: 18, color: "595959" }), { after: 120 }));
  if (report.sample) body.push(para(run(SAMPLE, { bold: true, size: 22, color: "9B1C1C" }), { after: 160 }));
  report.blocks.forEach((block, index) => {
    body.push(para(run(block.heading, { bold: true, size: 30 }), { before: 120, after: 40, pageBreak: index > 0 }));
    body.push(para(run(block.subtitle, { size: 18, color: "595959" }), { after: 160 }));
    for (const section of block.sections) {
      body.push(para(run(section.heading, { bold: true, size: 24 }), { before: 200, after: 60 }));
      if (section.note) body.push(para(run(section.note, { italic: true, size: 17, color: "595959" }), { after: 80 }));
      body.push(docTable(section.table));
    }
  });
  body.push(para(run(NOTE, { italic: true, size: 16, color: "595959" }), { before: 240 }));
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip([
    {
      name: "[Content_Types].xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    { name: "word/document.xml", text: document },
  ]);
}

// ---------- PDF ----------

export function reportPdf(report: Report, logo?: BookingPdfData["logo"]): Uint8Array {
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const M = 42;
  const W = PAGE_W - M * 2;
  const pages: string[] = [];
  const images: NonNullable<BookingPdfData["logo"]>[] = [];
  let ops = "";
  let y = PAGE_H - M;
  const text = (s: string, x: number, size: number, bold = false, grey = false) => {
    ops += (grey ? "0.35 g " : "0 g ") + "BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + x.toFixed(2) + " " + y.toFixed(2) + " Td (" + escape(s) + ") Tj ET\n";
  };
  const right = (s: string, xRight: number, size: number, bold = false) => {
    ops += "0 g BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + (xRight - widthOf(s, size, bold)).toFixed(2) + " " + y.toFixed(2) + " Td (" + escape(s) + ") Tj ET\n";
  };
  const line = (yy: number, grey: number, w: number) => {
    ops += grey + " G " + w + " w " + M + " " + yy.toFixed(2) + " m " + (PAGE_W - M) + " " + yy.toFixed(2) + " l S\n";
  };
  const newPage = () => {
    if (ops) pages.push(ops);
    ops = "";
    y = PAGE_H - M;
  };
  const para = (s: string, size: number, bold = false, grey = false) => {
    for (const part of wrap(s, size, W, bold)) {
      if (y - size * 1.4 < M + 30) newPage();
      y -= size * 1.4;
      text(part, M, size, bold, grey);
    }
  };

  // Cover header
  if (logo) {
    images.push(logo);
    const lw = 150;
    const lh = (logo.h / logo.w) * lw;
    ops += "q " + lw + " 0 0 " + lh.toFixed(2) + " " + (M - 4) + " " + (PAGE_H - M - lh).toFixed(2) + " cm /Im1 Do Q\n";
    y = PAGE_H - M - lh - 6;
  } else {
    para("THE CHEQUERED FLAG LTD", 12, true);
  }
  para(report.title + ": " + report.subtitle, 17, true);
  para("Made " + report.generated + " · confidential", 9, false, true);
  if (report.sample) {
    y -= 4;
    para(SAMPLE, 10, true);
  }

  const table = (t: Table) => {
    const n = t.columns.length;
    const first = n > 6 ? 118 : 150;
    const colW = (W - first) / (n - 1);
    const xRight = (i: number) => M + first + colW * i;
    const size = n > 6 ? 7.5 : 8.5;
    const rowH = size * 1.9;
    const header = () => {
      if (y - rowH * 2 < M + 30) newPage();
      y -= rowH;
      ops += "0.95 g " + M + " " + (y - size * 0.6).toFixed(2) + " " + W + " " + rowH.toFixed(2) + " re f\n";
      t.columns.forEach((c, i) => (i === 0 ? text(c, M + 3, size, true) : right(c, xRight(i) - 3, size, true)));
      line(y - size * 0.6, 0.6, 0.6);
    };
    header();
    const draw = (row: Cell[], bold: boolean) => {
      if (y - rowH < M + 30) {
        newPage();
        header();
      }
      y -= rowH;
      row.forEach((c, i) => {
        const s = cellText(c);
        if (i === 0) {
          let label = s;
          while (label.length > 3 && widthOf(label, size, bold) > first - 8) label = label.slice(0, -2);
          text(label === s ? s : label + "…", M + 3, size, bold);
        } else right(s, xRight(i) - 3, size, bold);
      });
      line(y - size * 0.6, bold ? 0.6 : 0.88, bold ? 0.6 : 0.4);
    };
    t.rows.forEach((row) => draw(row, false));
    if (t.total) draw(t.total, true);
  };

  report.blocks.forEach((block, index) => {
    if (index > 0) newPage();
    else y -= 8;
    para(block.heading, 14, true);
    para(block.subtitle, 9, false, true);
    for (const section of block.sections) {
      y -= 10;
      if (y < M + 120) newPage();
      para(section.heading, 11, true);
      if (section.note) para(section.note, 8, false, true);
      y -= 2;
      table(section.table);
    }
  });
  y -= 14;
  para(NOTE, 7.5, false, true);
  newPage();

  const total = pages.length;
  const footer = COMPANY.name + " Ltd · " + CONTACT.phoneDisplay + " · Performance report · confidential";
  const withFooter = pages.map(
    (content, index) =>
      content +
      "0.8 G 0.5 w " + M + " 34 m " + (PAGE_W - M) + " 34 l S\n" +
      "0.45 g BT /F1 7.5 Tf " + M + " 22 Td (" + escape(footer) + ") Tj ET\n" +
      "0.45 g BT /F1 7.5 Tf " + (PAGE_W - M - 50) + " 22 Td (" + escape("Page " + (index + 1) + " of " + total) + ") Tj ET\n",
  );
  return assemblePdf(withFooter, images, PAGE_W, PAGE_H);
}

export function downloadBytes(bytes: Uint8Array, fileName: string, type: string) {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
