import { describe, expect, it } from "vitest";
import { addDaysIso, dateOnly, initials, int, money, moneyAxis, moneyCompact, pct, shortDate, todayIso, years } from "@/lib/format";

const plain = (s: string) => s.replace(/ /g, " ");

describe("formato de presentación (pesos colombianos)", () => {
  it("money usa pesos sin decimales", () => {
    expect(plain(money(2836256))).toBe("$ 2.836.256");
    expect(money(null)).toBe("—");
  });
  it("moneyCompact abrevia millones", () => {
    expect(moneyCompact(10_731_195)).toBe("$ 10,7 M");
    expect(moneyCompact(-4_840_059)).toBe("−$ 4,8 M");
    expect(moneyCompact(850_000)).toBe("$ 850.000");
  });
  it("moneyAxis abrevia para ejes", () => {
    expect(moneyAxis(15_000_000)).toBe("15 M");
    expect(moneyAxis(850_000)).toBe("850 mil");
  });
  it("pct e int", () => {
    expect(plain(pct(0.2217)).replace(" %", "%")).toBe("22,17%");
    expect(int(1234567)).toBe("1.234.567");
  });
  it("years dice cuando no se recupera", () => {
    expect(years(null)).toBe("no se recupera");
    expect(years(4.67)).toBe("4,67 años");
  });
  it("fechas", () => {
    expect(addDaysIso("2026-10-06", -6)).toBe("2026-09-30");
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateOnly("2026-10-06")).toContain("2026");
    expect(shortDate("2026-09-28")).toMatch(/28/);
    expect(initials("Karina", "Redondo")).toBe("KR");
  });
});
