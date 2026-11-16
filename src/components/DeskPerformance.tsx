"use client";

import { useEffect, useMemo, useState } from "react";
import { ksh } from "../lib/hire";

// Performance analysis on the hire desk (owners only), modelled on the "Car Hire Analysis" spreadsheet:
// cars out per day against the 70% utilisation target, income per day, utilisation and income per vehicle,
// and a month-by-month summary. Months are chosen with the tabs underneath, like the spreadsheet's sheets.
// Figures come from held and paid bookings on the desk. Income is net of 16% VAT and excludes delivery.

export const UTILISATION_TARGET = 0.7;
export const DAILY_REVENUE_TARGET = { saloon: 2500, suv: 8500 }; // per vehicle per hire day, net of VAT (as in the spreadsheet)

type Vehicle = { id: string; plate: string; model: string; category: string; km: number | null };
type YearData = { year: number; today: string; vehicles: Vehicle[]; days: Record<string, (number | null)[]> };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Chart colours (light desk theme). Blue = the measure; orange = second group; ink for text and the target line.
const C = {
  bar: "#2a78d6",
  suv: "#eb6834",
  grid: "#e7e6e2",
  axis: "#52514e",
  ink: "#0b0b0b",
  track: "#efeeea",
};

const group = (category: string) => (category === "saloon" ? "saloon" : "suv");
const pct = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) + "%" : "–");
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 10_000 ? Math.round(n / 1000) + "K" : n.toLocaleString("en-US"));

// Clean axis ticks: a step of 1, 2 or 5 × 10^n, at most 5 intervals, starting at 0.
function niceTicks(value: number) {
  const target = Math.max(value, 1) / 4;
  const p = Math.pow(10, Math.floor(Math.log10(target)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= target) || 10 * p;
  const top = Math.ceil(Math.max(value, 1) / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { max: top, ticks };
}

type MonthStats = {
  month: number; // 0-11
  dim: number;
  reportDays: number; // days counted so far (all days for a past month, up to today for this month)
  perDay: { day: number; cars: number; income: number }[];
  perVehicle: { v: Vehicle; days: number; income: number }[];
  income: number;
  hireDays: number;
  util: { saloon: number; suv: number; all: number };
  counts: { saloon: number; suv: number };
  targetIncome: number;
};

function monthStats(data: YearData, month: number): MonthStats {
  const startIdx = (Date.UTC(data.year, month, 1) - Date.UTC(data.year, 0, 1)) / 864e5;
  const dim = new Date(Date.UTC(data.year, month + 1, 0)).getUTCDate();
  const [ty, tm, td] = data.today.split("-").map(Number);
  const reportDays = data.year < ty || (data.year === ty && month < tm - 1) ? dim : data.year === ty && month === tm - 1 ? td : 0;
  const perDay = Array.from({ length: dim }, (_, i) => ({ day: i + 1, cars: 0, income: 0 }));
  const perVehicle = data.vehicles.map((v) => ({ v, days: 0, income: 0 }));
  perVehicle.forEach((row) => {
    const list = data.days[row.v.id] || [];
    for (let i = 0; i < reportDays; i += 1) {
      const value = list[startIdx + i];
      if (value === null || value === undefined) continue;
      row.days += 1;
      row.income += value;
      perDay[i].cars += 1;
      perDay[i].income += value;
    }
  });
  const counts = { saloon: 0, suv: 0 };
  const days = { saloon: 0, suv: 0 };
  perVehicle.forEach((row) => {
    counts[group(row.v.category)] += 1;
    days[group(row.v.category)] += row.days;
  });
  const hireDays = days.saloon + days.suv;
  const income = perVehicle.reduce((sum, row) => sum + row.income, 0);
  const cap = (n: number) => n * reportDays;
  return {
    month,
    dim,
    reportDays,
    perDay,
    perVehicle,
    income,
    hireDays,
    counts,
    util: {
      saloon: cap(counts.saloon) ? days.saloon / cap(counts.saloon) : NaN,
      suv: cap(counts.suv) ? days.suv / cap(counts.suv) : NaN,
      all: cap(counts.saloon + counts.suv) ? hireDays / cap(counts.saloon + counts.suv) : NaN,
    },
    targetIncome:
      (DAILY_REVENUE_TARGET.saloon * counts.saloon + DAILY_REVENUE_TARGET.suv * counts.suv) * UTILISATION_TARGET * reportDays,
  };
}

function Tile({ label, value, note, good }: { label: string; value: string; note?: string; good?: boolean | null }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-[#e5e5e5] bg-white px-4 py-3">
      <div className="text-[13px] text-[#595959]">{label}</div>
      <div className="mt-0.5 text-[22px] font-bold tabular-nums tracking-[-0.01em]">{value}</div>
      {note && (
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#595959]">
          {good !== undefined && good !== null && (
            <span aria-hidden="true" className={"font-bold " + (good ? "text-[#0d5a2a]" : "text-[#a50e0e]")}>
              {good ? "▲" : "▼"}
            </span>
          )}
          {note}
        </div>
      )}
    </div>
  );
}

// Column chart of one measure per day of the month, with an optional labelled reference line.
function DayColumns({
  title,
  subtitle,
  values,
  format,
  axisFormat,
  reference,
  reportDays,
  monthLabel,
  detail,
}: {
  title: string;
  subtitle: string;
  values: number[];
  format: (n: number) => string;
  axisFormat: (n: number) => string;
  reference?: { value: number; label: string };
  reportDays: number;
  monthLabel: string;
  detail: (index: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 210;
  const pad = { l: 44, r: 12, t: 14, b: 26 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const { max, ticks } = niceTicks(Math.max(...values, reference?.value || 0, 1));
  const slot = plotW / values.length;
  const bw = Math.min(16, slot - 2);
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;

  return (
    <figure className="min-w-0 rounded-[10px] border border-[#e5e5e5] bg-white p-4">
      <figcaption>
        <strong className="block text-[15px]">{title}</strong>
        <span className="text-[13px] text-[#595959]">{subtitle}</span>
      </figcaption>
      <div className="relative mt-2 overflow-x-auto">
        <svg viewBox={"0 0 " + W + " " + H} className="block h-auto w-full min-w-[560px]" role="img" aria-label={title + ", " + monthLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={C.axis}>
                {axisFormat(t)}
              </text>
            </g>
          ))}
          {values.map((v, i) => {
            const x = pad.l + i * slot + (slot - bw) / 2;
            const h = Math.max(0, (v / max) * plotH);
            const future = i >= reportDays;
            const r = Math.min(4, h / 2, bw / 2);
            const top = pad.t + plotH - h;
            return (
              <g key={i}>
                {h > 0 && (
                  <path
                    d={
                      "M" + x + "," + (pad.t + plotH) +
                      " V" + (top + r) +
                      " Q" + x + "," + top + " " + (x + r) + "," + top +
                      " H" + (x + bw - r) +
                      " Q" + (x + bw) + "," + top + " " + (x + bw) + "," + (top + r) +
                      " V" + (pad.t + plotH) + " Z"
                    }
                    fill={C.bar}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {(i === 0 || (i + 1) % 5 === 0) && (
                  <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={C.axis}>
                    {i + 1}
                  </text>
                )}
                {!future && (
                  <rect
                    x={pad.l + i * slot}
                    y={pad.t}
                    width={slot}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                )}
              </g>
            );
          })}
          {reference && (
            <g pointerEvents="none">
              <line x1={pad.l} x2={W - pad.r} y1={y(reference.value)} y2={y(reference.value)} stroke={C.ink} strokeWidth={1.5} />
              <text x={W - pad.r} y={y(reference.value) - 5} textAnchor="end" fontSize={11} fontWeight={700} fill={C.ink}>
                {reference.label}
              </text>
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-10 min-w-[150px] -translate-x-1/2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: ((pad.l + (hover + 0.5) * slot) / W) * 100 + "%" }}
          >
            <strong className="block">
              {hover + 1} {monthLabel}
            </strong>
            <span className="block tabular-nums">{format(values[hover])}</span>
            <span className="block text-[#595959]">{detail(hover)}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

export default function DeskPerformance({ today }: { today: string }) {
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [data, setData] = useState<YearData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    fetch("/api/hire/staff/performance?year=" + year, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Performance could not be loaded.");
        if (live) setData(body as YearData);
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : "Performance could not be loaded."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [year]);

  const months = useMemo(() => (data && data.year === year ? MONTHS.map((_, m) => monthStats(data, m)) : []), [data, year]);
  const stats = months[month];

  if (error) return <p className="text-sm font-bold text-[#a50e0e]">{error}</p>;
  if (!stats) return <p className="text-sm text-[#595959]">{loading ? "Loading performance…" : "No figures yet."}</p>;

  const monthLabel = MONTH_NAMES[month] + " " + year;
  const fleet = stats.counts.saloon + stats.counts.suv;
  const targetCars = Math.round(fleet * UTILISATION_TARGET * 10) / 10;
  const vsTarget = stats.targetIncome ? stats.income / stats.targetIncome : NaN;
  const rows = [...stats.perVehicle].sort((a, b) => b.days - a.days || b.income - a.income);
  const targetToDate = stats.reportDays * UTILISATION_TARGET;
  const notStarted = stats.reportDays === 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">{monthLabel}</div>
          <div className="text-[13px] text-[#595959]">
            {notStarted
              ? "This month has not started yet."
              : stats.reportDays < stats.dim
                ? "Up to " + stats.reportDays + " " + MONTH_NAMES[month] + " (" + stats.reportDays + " of " + stats.dim + " days)"
                : "Whole month, " + stats.dim + " days"}
            {" · "}
            {fleet} vehicles · target {pct(UTILISATION_TARGET)} utilisation
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[#595959]">Year</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded-lg border border-[#c8c8c8] bg-white px-2 text-sm">
            {[thisYear - 1, thisYear].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <Tile
          label="Income, net of VAT"
          value={ksh(Math.round(stats.income))}
          note={Number.isFinite(vsTarget) ? pct(vsTarget) + " of target revenue" : "No target yet"}
          good={Number.isFinite(vsTarget) ? vsTarget >= 1 : null}
        />
        <Tile label="Hire days" value={stats.hireDays.toLocaleString("en-US")} note={"Across " + fleet + " vehicles"} />
        <Tile
          label="Average income per hire day"
          value={stats.hireDays ? ksh(Math.round(stats.income / stats.hireDays)) : "–"}
        />
        <Tile
          label="Saloon utilisation"
          value={pct(stats.util.saloon)}
          note={"Target " + pct(UTILISATION_TARGET) + " · " + stats.counts.saloon + " saloons"}
          good={Number.isFinite(stats.util.saloon) ? stats.util.saloon >= UTILISATION_TARGET : null}
        />
        <Tile
          label="SUV & 4x4 utilisation"
          value={pct(stats.util.suv)}
          note={"Target " + pct(UTILISATION_TARGET) + " · " + stats.counts.suv + " vehicles"}
          good={Number.isFinite(stats.util.suv) ? stats.util.suv >= UTILISATION_TARGET : null}
        />
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(460px,100%),1fr))]">
        <DayColumns
          title="Cars out per day"
          subtitle={"Against the " + pct(UTILISATION_TARGET) + " target of " + targetCars + " cars a day"}
          values={stats.perDay.map((d) => d.cars)}
          format={(n) => n + " of " + fleet + " cars out"}
          axisFormat={(n) => String(Math.round(n))}
          reference={{ value: targetCars, label: "Target " + targetCars }}
          reportDays={stats.reportDays}
          monthLabel={MONTH_NAMES[month]}
          detail={(i) => ksh(Math.round(stats.perDay[i].income)) + " income"}
        />
        <DayColumns
          title="Income per day, net of VAT"
          subtitle="Hire and damage cover, spread over each hire's days"
          values={stats.perDay.map((d) => Math.round(d.income))}
          format={(n) => ksh(n)}
          axisFormat={compact}
          reportDays={stats.reportDays}
          monthLabel={MONTH_NAMES[month]}
          detail={(i) => stats.perDay[i].cars + " cars out"}
        />
      </div>

      <div className="min-w-0 rounded-[10px] border border-[#e5e5e5] bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <strong className="text-[15px]">By vehicle</strong>
          <span className="flex flex-wrap items-center gap-3 text-xs text-[#595959]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: C.bar }} /> Saloon
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: C.suv }} /> SUV & 4x4
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-0.5" style={{ background: C.ink }} /> Target to date ({Math.round(targetToDate * 10) / 10} days)
            </span>
          </span>
        </div>
        <div className="relative mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] text-[13px] text-[#595959]">
                <th className="px-2 py-1.5 font-semibold">Vehicle</th>
                <th className="px-2 py-1.5 font-semibold">Days out</th>
                <th className="w-[34%] px-2 py-1.5 font-semibold">Utilisation</th>
                <th className="px-2 py-1.5 text-right font-semibold">Income</th>
                <th className="px-2 py-1.5 text-right font-semibold">Per hire day</th>
                <th className="px-2 py-1.5 text-right font-semibold">Odometer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ v, days, income }) => {
                const u = stats.reportDays ? days / stats.reportDays : 0;
                const color = group(v.category) === "saloon" ? C.bar : C.suv;
                return (
                  <tr key={v.id} className="border-b border-[#f0efec] align-middle">
                    <td className="px-2 py-1.5">
                      <strong>{v.plate}</strong> <span className="text-[#595959]">{v.model}</span>
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{days}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2" title={days + " of " + stats.reportDays + " days"}>
                        <div className="relative h-2.5 flex-1 rounded-full" style={{ background: C.track }}>
                          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: Math.min(100, u * 100) + "%", background: color }} />
                          {stats.reportDays > 0 && (
                            <div
                              className="absolute -top-1 h-[18px] w-0.5"
                              style={{ left: UTILISATION_TARGET * 100 + "%", background: C.ink }}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <span className="w-10 text-right text-[13px] tabular-nums">{stats.reportDays ? pct(u) : "–"}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{ksh(Math.round(income))}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{days ? ksh(Math.round(income / days)) : "–"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[#595959]">{v.km ? v.km.toLocaleString("en-US") + " km" : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="min-w-0 rounded-[10px] border border-[#e5e5e5] bg-white p-4">
        <strong className="text-[15px]">{year} by month</strong>
        <div className="relative mt-2 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] text-[13px] text-[#595959]">
                <th className="px-2 py-1.5 font-semibold">Month</th>
                <th className="px-2 py-1.5 text-right font-semibold">Income, net of VAT</th>
                <th className="px-2 py-1.5 text-right font-semibold">Hire days</th>
                <th className="px-2 py-1.5 text-right font-semibold">Per hire day</th>
                <th className="px-2 py-1.5 text-right font-semibold">Saloons</th>
                <th className="px-2 py-1.5 text-right font-semibold">SUV & 4x4</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr
                  key={m.month}
                  onClick={() => m.reportDays && setMonth(m.month)}
                  className={
                    "border-b border-[#f0efec] " +
                    (m.month === month ? "bg-[#f5f5f3] font-bold" : m.reportDays ? "cursor-pointer hover:bg-[#fafaf8]" : "text-[#9a9a9a]")
                  }
                >
                  <td className="px-2 py-1.5">{MONTH_NAMES[m.month]}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m.reportDays ? ksh(Math.round(m.income)) : "–"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m.reportDays ? m.hireDays : "–"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m.hireDays ? ksh(Math.round(m.income / m.hireDays)) : "–"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m.reportDays ? pct(m.util.saloon) : "–"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m.reportDays ? pct(m.util.suv) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Month tabs, like the spreadsheet's sheet tabs */}
      <div className="flex flex-wrap gap-1.5 border-t border-[#e5e5e5] pt-3" role="tablist" aria-label="Choose a month">
        {MONTHS.map((label, m) => {
          const disabled = !months[m] || months[m].reportDays === 0;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={m === month}
              disabled={disabled}
              onClick={() => setMonth(m)}
              className={
                "min-h-[36px] min-w-[52px] rounded-md border px-3 text-[13px] font-bold " +
                (m === month
                  ? "border-[#171717] bg-[#171717] text-white"
                  : disabled
                    ? "cursor-not-allowed border-[#e5e5e5] bg-white text-[#b5b5b0]"
                    : "border-[#dadce0] bg-white text-[#171717] hover:bg-[#f5f5f3]")
              }
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[#595959]">
        From held and paid bookings on this desk. Income is the hire and damage cover charge net of 16% VAT, spread over the
        hire days; delivery charges are not included. Utilisation is days out divided by vehicles × days so far (days in the
        workshop are not recorded yet). Targets: {pct(UTILISATION_TARGET)} utilisation, {ksh(DAILY_REVENUE_TARGET.saloon)} a day per
        saloon and {ksh(DAILY_REVENUE_TARGET.suv)} per SUV or 4x4, as in the hire analysis spreadsheet.
      </p>
    </div>
  );
}
