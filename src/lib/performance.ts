// Performance analysis figures (owners only), shared by the desk section and its PDF / Word / Excel downloads.
// Modelled on the "Car Hire Analysis" spreadsheet.

export const UTILISATION_TARGET = 0.7;
export const DAILY_REVENUE_TARGET = { saloon: 2500, suv: 8500 }; // per vehicle per hire day, net of VAT (as in the spreadsheet)

export type PerfVehicle = { id: string; plate: string; model: string; category: string; km: number | null };
export type YearData = { year: number; today: string; vehicles: PerfVehicle[]; days: Record<string, (number | null)[]> };

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const group = (category: string) => (category === "saloon" ? "saloon" : "suv");

export type MonthStats = {
  month: number; // 0-11
  dim: number;
  reportDays: number; // days counted so far (all days for a past month, up to today for this month)
  perDay: { day: number; cars: number; income: number }[];
  perVehicle: { v: PerfVehicle; days: number; income: number }[];
  income: number;
  hireDays: number;
  util: { saloon: number; suv: number; all: number };
  counts: { saloon: number; suv: number };
  targetIncome: number;
};

export function monthStats(data: YearData, month: number): MonthStats {
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

// Made-up figures so the section can be looked at before there are real bookings ("Show sample figures").
// Generated in the browser from a fixed seed: nothing is saved, and the same sample shows each time.
export function sampleYear(real: YearData): YearData {
  let seed = 20261116;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const rateFor = (v: PerfVehicle) =>
    /land cruiser/i.test(v.model) ? 18000 : /3-door/i.test(v.model) ? 10000 : /prado/i.test(v.model) ? 13000 : /x-?trail/i.test(v.model) ? 7500 : 3500;
  const length = real.days[real.vehicles[0]?.id]?.length || 365;
  const [ty, tm, td] = real.today.split("-").map(Number);
  const lastIndex =
    real.year < ty ? length : real.year > ty ? 0 : (Date.UTC(ty, tm - 1, td) - Date.UTC(ty, 0, 1)) / 864e5 + 1;
  const days: YearData["days"] = {};
  for (const v of real.vehicles) {
    const busy = group(v.category) === "saloon" ? 0.72 : 0.3; // roughly like the spreadsheet: saloons busy, SUVs less so
    const list: (number | null)[] = Array.from({ length }, () => null);
    let i = Math.floor(rand() * 4);
    while (i < lastIndex) {
      const hire = 2 + Math.floor(rand() * 8);
      const gap = Math.max(0, Math.round(((1 - busy) / busy) * hire * (0.4 + rand() * 1.2)));
      const perDay = (rateFor(v) * (0.85 + rand() * 0.15)) / 1.16;
      for (let d = i; d < Math.min(i + hire, lastIndex); d += 1) list[d] = Math.round(perDay);
      i += hire + gap;
    }
    days[v.id] = list;
  }
  return { ...real, days };
}

