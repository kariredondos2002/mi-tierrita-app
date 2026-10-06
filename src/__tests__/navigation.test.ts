import { describe, expect, it } from "vitest";
import { ALL_NAV_ITEMS, findRoute, isLockedFor, isVisibleFor, rolesFor } from "@/router/navigation";

describe("matriz de navegación por rol (documento 06)", () => {
  it("la evaluación financiera es solo del administrador y la secretaria la ve con candado", () => {
    const finance = ALL_NAV_ITEMS.find((i) => i.path === "/finanzas")!;
    expect(rolesFor("/finanzas")).toEqual(["ADMIN"]);
    expect(isLockedFor(finance, "SALES")).toBe(true);
    expect(isVisibleFor(finance, "WAREHOUSE")).toBe(false);
  });
  it("bodega no ve ventas ni clientes", () => {
    for (const path of ["/ventas", "/clientes"]) {
      const item = ALL_NAV_ITEMS.find((i) => i.path === path)!;
      expect(isVisibleFor(item, "WAREHOUSE")).toBe(false);
    }
  });
  it("findRoute resuelve subrutas", () => {
    expect(findRoute("/finanzas/proyecto")?.label).toBe("Evaluación financiera");
    expect(findRoute("/")?.label).toBe("Tablero gerencial");
  });
});
