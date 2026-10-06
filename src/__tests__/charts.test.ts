import { describe, expect, it } from "vitest";
import { niceTicks } from "@/components/charts/useWidth";

describe("escala de los gráficos", () => {
  it("niceTicks da marcas redondas que cubren el máximo", () => {
    const t = niceTicks(0, 17_300_000, 4);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(17_300_000);
    expect(t.every((v) => v % 1_000_000 === 0)).toBe(true);
  });
  it("niceTicks incluye negativos cuando el VPN cae bajo cero", () => {
    const t = niceTicks(-47_600_000, 80_800_000, 4);
    expect(t[0]).toBeLessThanOrEqual(-47_600_000);
    expect(t).toContain(0);
  });
});
