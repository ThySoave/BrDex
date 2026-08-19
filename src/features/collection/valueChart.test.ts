import { buildChartBars, limitHistoryDays } from "./valueChart";

describe("buildChartBars", () => {
  it("normalizes heights against the max value and labels with day/month", () => {
    const bars = buildChartBars(
      [
        { capturedOn: "2026-08-15", totalValue: 50 },
        { capturedOn: "2026-08-16", totalValue: 100 },
        { capturedOn: "2026-08-17", totalValue: 25 }
      ],
      120
    );

    expect(bars).toEqual([
      { label: "15/08", height: 60, value: 50 },
      { label: "16/08", height: 120, value: 100 },
      { label: "17/08", height: 30, value: 25 }
    ]);
  });

  it("keeps only the most recent 30 snapshots", () => {
    const snapshots = Array.from({ length: 40 }, (_, i) => ({
      capturedOn: `2026-07-${String(i + 1).padStart(2, "0")}`,
      totalValue: i + 1
    }));

    const bars = buildChartBars(snapshots, 100);

    expect(bars).toHaveLength(30);
    expect(bars[bars.length - 1].value).toBe(40);
  });

  it("returns an empty array when every value is zero", () => {
    expect(buildChartBars([{ capturedOn: "2026-08-17", totalValue: 0 }], 100)).toEqual([]);
  });
});

describe("limitHistoryDays", () => {
  it("drops points older than the window relative to the latest point", () => {
    const snapshots = [
      { capturedOn: "2026-06-01", totalValue: 10 },
      { capturedOn: "2026-07-20", totalValue: 20 },
      { capturedOn: "2026-08-15", totalValue: 30 }
    ];

    expect(limitHistoryDays(snapshots, 30)).toEqual([
      { capturedOn: "2026-07-20", totalValue: 20 },
      { capturedOn: "2026-08-15", totalValue: 30 }
    ]);
  });

  it("returns an empty array for an empty list", () => {
    expect(limitHistoryDays([], 30)).toEqual([]);
  });
});
