import { REPORT_REASONS } from "./reportReasons";

describe("REPORT_REASONS", () => {
  it("exposes the fixed report reasons in order", () => {
    expect(REPORT_REASONS).toEqual([
      { value: "golpe", label: "Golpe ou fraude" },
      { value: "ofensa", label: "Comportamento ofensivo" },
      { value: "spam", label: "Spam ou propaganda" },
      { value: "perfil_falso", label: "Perfil falso" },
      { value: "outro", label: "Outro" }
    ]);
  });

  it("has non-empty values and labels with unique values", () => {
    for (const reason of REPORT_REASONS) {
      expect(reason.value.length).toBeGreaterThan(0);
      expect(reason.label.length).toBeGreaterThan(0);
    }

    const values = REPORT_REASONS.map((reason) => reason.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
