import type { ValueSnapshot } from "./valueRepository";

export interface ChartBar {
  label: string;
  height: number;
  value: number;
}

const MAX_BARS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function limitHistoryDays(snapshots: ValueSnapshot[], days: number): ValueSnapshot[] {
  if (snapshots.length === 0) {
    return [];
  }

  const latest = Math.max(...snapshots.map((s) => Date.parse(s.capturedOn)));
  const cutoff = latest - days * DAY_MS;

  return snapshots.filter((s) => Date.parse(s.capturedOn) >= cutoff);
}

export function buildChartBars(snapshots: ValueSnapshot[], maxBarHeight: number): ChartBar[] {
  const recent = snapshots.slice(-MAX_BARS);
  const maxValue = Math.max(...recent.map((s) => s.totalValue), 0);

  if (maxValue === 0) {
    return [];
  }

  return recent.map((snapshot) => {
    const [, month, day] = snapshot.capturedOn.split("-");
    return {
      label: `${day}/${month}`,
      height: Math.round((snapshot.totalValue / maxValue) * maxBarHeight),
      value: snapshot.totalValue
    };
  });
}
