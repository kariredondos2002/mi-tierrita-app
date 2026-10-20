import { describe, expect, it } from "vitest";
import { fileSize, filenameFrom } from "@/lib/download";
import { describeActivity, ROLE_PERMISSIONS } from "@/lib/activity";
import { splitExportDetail } from "@/screens/Reports/ExportHistory";

describe("descarga de reportes (v4.2)", () => {
  it("toma el nombre del archivo de Content-Disposition", () => {
    expect(filenameFrom('attachment; filename="ventas_2026-09-10_2026-10-09_por-dia.pdf"', "x.pdf")).toBe("ventas_2026-09-10_2026-10-09_por-dia.pdf");
    expect(filenameFrom("attachment; filename*=UTF-8''cartera%20vencida.xlsx", "x.xlsx")).toBe("cartera vencida.xlsx");
    expect(filenameFrom(undefined, "respaldo.pdf")).toBe("respaldo.pdf");
  });

  it("muestra el tamaño del archivo en KB o MB", () => {
    expect(fileSize(10)).toBe("1 KB");
    expect(fileSize(2048)).toBe("2 KB");
    expect(fileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("separa el detalle auditado en reporte, formato y filtros", () => {
    expect(splitExportDetail("Reporte de ventas · PDF · 2026-09-10 a 2026-10-09 · por día")).toEqual({
      report: "Reporte de ventas",
      format: "PDF",
      filters: "2026-09-10 a 2026-10-09 · por día",
    });
    expect(splitExportDetail("Escenario financiero · XLSX · B. Ampliación").format).toBe("XLSX");
    expect(splitExportDetail(null).format).toBe("—");
  });
});

describe("Mi perfil · actividad (v4.2)", () => {
  it("describe cada acción auditada en palabras", () => {
    expect(describeActivity({ method: "POST", resource: "/api/v1/sales", detail: null })).toBe("Registró una venta");
    expect(describeActivity({ method: "POST", resource: "/api/v1/sales/12/void", detail: null })).toBe("Anuló una venta");
    expect(describeActivity({ method: "POST", resource: "/api/v1/customers/4/payments", detail: null })).toBe("Registró un abono");
    expect(describeActivity({ method: "PUT", resource: "/api/v1/users/me", detail: null })).toBe("Actualizó su perfil");
    expect(describeActivity({ method: "EXPORT", resource: "/api/v1/reports/sales/export", detail: "Reporte de ventas · PDF · 2026-09-10 a 2026-10-09 · por día" })).toBe(
      "Descargó el reporte de ventas · PDF · 2026-09-10 a 2026-10-09 · por día",
    );
    expect(describeActivity({ method: "SIGNIN", resource: "/api/v1/auth/signin", detail: "Inicio de sesión desde 127.0.0.1" })).toBe("Inicio de sesión desde 127.0.0.1");
  });

  it("cada rol tiene permisos y solo el administrador no tiene restricciones", () => {
    expect(ROLE_PERMISSIONS.ADMIN.cannot).toHaveLength(0);
    expect(ROLE_PERMISSIONS.SALES.cannot).toContain("Evaluación financiera");
    expect(ROLE_PERMISSIONS.WAREHOUSE.can.length).toBeGreaterThan(0);
  });
});
