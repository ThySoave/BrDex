import type { ValueSnapshot } from "./valueRepository";

export interface ChartBar {
  label: string;
  height: number;
  value: number;
}

const MAX_BARS = 30;

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
