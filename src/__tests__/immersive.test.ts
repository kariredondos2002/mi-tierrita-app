import { describe, expect, it } from "vitest";
import { bestScenario, buildSystemModel, TOUR } from "@/screens/Home/systemModel";
import { toShelfRows } from "@/screens/Batches/FefoShelf";
import { toTowers } from "@/screens/Finance/ScenarioTowers";
import { MISSIONS } from "@/components/immersive/missions";
import type { InventoryReport, ProductBatch, ReceivablesReport, ScenarioIndicators, ScenarioSummary } from "@/types/api";

const ind = (o: Partial<ScenarioIndicators>): ScenarioIndicators => ({
  workingCapital: 0,
  totalInvestment: 0,
  credit: 0,
  ownContribution: 0,
  installment: 0,
  totalInterest: 0,
  npv: 0,
  irr: null,
  paybackSimple: null,
  paybackDiscounted: null,
  profitabilityIndex: 0,
  benefitCostRatio: 0,
  investorNpv: 0,
  investorIrr: null,
  coverageWithSales: null,
  coverageWithoutSales: null,
  coverageIncremental: null,
  signChanges: 1,
  ...o,
});
const scen = (id: number, name: string, created: string, o: Partial<ScenarioIndicators>): ScenarioSummary => ({
  id,
  name,
  userId: 1,
  username: "admin",
  fixedInvestment: 75e6,
  creditPct: 1,
  termMonths: 48,
  salesIncrease: 0.2,
  additionalExpensesMonth: 1e6,
  creditCoversWorkingCapital: false,
  indicators: ind(o),
  createdAt: created,
  updatedAt: created,
});
const SCENARIOS = [
  scen(1, "A. Ampliación completa", "2026-09-10", { npv: 10.7e6, coverageIncremental: 1.0, credit: 75e6 }),
  scen(2, "B. Crédito 70 %", "2026-09-12", { npv: 10.7e6, coverageIncremental: 1.43, credit: 52.5e6 }),
  scen(3, "C. Solo obra", "2026-09-14", { npv: -4.8e6, coverageIncremental: 0.64, credit: 60e6 }),
  scen(4, "D. Crédito cubre todo", "2026-09-18", { npv: 10.7e6, coverageIncremental: 0.79, credit: 94.5e6 }),
];

describe("mapa vivo del negocio", () => {
  it("elige el escenario que crea valor y mejor cubre su cuota", () => {
    expect(bestScenario(SCENARIOS)?.id).toBe(2);
    expect(bestScenario([SCENARIOS[2]!])?.id).toBe(3);
    expect(bestScenario([])).toBeUndefined();
  });

  it("marca la bodega como punto crítico cuando hay lotes vencidos", () => {
    const inventory = {
      asOf: "2026-10-08",
      expiringDays: 30,
      products: 25,
      activeProducts: 25,
      units: 1000,
      costValue: 100e6,
      saleValue: 130e6,
      outOfStock: 0,
      expiringSoon: { batches: 4, units: 20, costValue: 1e6 },
      expired: { batches: 2, units: 13, costValue: 5e5 },
      byCategory: [],
    } satisfies InventoryReport;
    const { nodes, flows } = buildSystemModel({ inventory, scenarios: SCENARIOS });
    const bodega = nodes.find((n) => n.key === "bodega")!;
    expect(bodega.tone).toBe("bad");
    expect(bodega.alert).toMatch(/2 lotes vencidos/);
    expect(nodes.find((n) => n.key === "ampliacion")!.tone).toBe("good");
    // todos los flujos conectan nodos existentes y el recorrido cubre todos los nodos
    const keys = new Set(nodes.map((n) => n.key));
    expect(flows.every((f) => keys.has(f.from) && keys.has(f.to))).toBe(true);
    expect([...keys].sort()).toEqual([...TOUR].sort());
  });

  it("la cartera es crítica si la mora supera el 10 % del saldo", () => {
    const receivables: ReceivablesReport = { overdueDays: 30, customersWithBalance: 12, totalBalance: 6.8e6, overdueCustomers: 2, overdueBalance: 2.8e6, items: [] };
    const clientes = buildSystemModel({ receivables }).nodes.find((n) => n.key === "clientes")!;
    expect(clientes.tone).toBe("bad");
    expect(clientes.critical).toBe(2);
  });
});

describe("estante FEFO", () => {
  const b = (id: number, days: number, expired = false): ProductBatch => ({
    id,
    productId: id,
    productName: `P${id}`,
    supplierId: null,
    supplierName: null,
    quantity: 10,
    quantityRemaining: 5,
    unitCost: 1000,
    expiresAt: "2026-10-30",
    expired,
    daysToExpire: days,
    createdAt: "2026-09-01",
  });
  it("agrupa en filas del frente (vencidos) al fondo y ordena por vencimiento", () => {
    const rows = toShelfRows([b(1, 40), b(2, -3, true), b(3, 5), b(4, 2), b(5, 20)]);
    expect(rows.map((r) => r.key)).toEqual(["vencidos", "7", "30", "mas"]);
    expect(rows[1]!.boxes.map((x) => x.id)).toEqual([4, 3]);
  });
});

describe("torres de escenarios", () => {
  it("asigna letra, tono y orden de creación", () => {
    const towers = toTowers([...SCENARIOS].reverse());
    expect(towers.map((t) => t.letter).join("")).toBe("ABCD");
    expect(towers.map((t) => t.tone)).toEqual(["warn", "good", "bad", "warn"]);
  });
});

describe("misiones", () => {
  it("cada misión apunta a un módulo y se cumple con su evidencia", () => {
    const lotes = MISSIONS.find((m) => m.id === "lotes")!;
    expect(lotes.done({ unlocked: [], visited: ["/lotes"] })).toBe(true);
    expect(MISSIONS.every((m) => m.path.startsWith("/"))).toBe(true);
  });
});
